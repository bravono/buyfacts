import test from "node:test";
import assert from "node:assert/strict";
import {
  REDACTED,
  isSensitiveKey,
  redact,
  redactMessage,
  truncate,
} from "../lib/observability/redact";
import {
  buildLogRow,
  currentLogLevel,
  flushLogs,
  logError,
  logInfo,
  resetLogQueue,
  setLogSink,
  shouldLog,
  type LogEventRow,
} from "../lib/observability/logger";
import { requestLogContext, routeLabel, withRequestLogging } from "../lib/observability/request";
import { resetRateLimits, checkRateLimit } from "../lib/security/rate-limiter";

function captureSink(): { rows: LogEventRow[]; restore: () => void } {
  const rows: LogEventRow[] = [];
  setLogSink((row) => {
    rows.push(row);
  });
  return { rows, restore: () => setLogSink(null) };
}

test("BuyFacts Observability - redaction suite", async (t) => {
  await t.test("sensitive keys are recognised regardless of casing/separators", () => {
    for (const key of ["password", "Password", "passwordHash", "api_key", "apiKey", "Set-Cookie", "sig", "totpSecret"]) {
      assert.equal(isSensitiveKey(key), true, `${key} should be sensitive`);
    }
    assert.equal(isSensitiveKey("email"), false);
    assert.equal(isSensitiveKey("route"), false);
  });

  await t.test("redact masks secrets at any depth", () => {
    const output = redact({
      email: "jane@example.com",
      password: "hunter2",
      nested: { token: "abc123", deeper: { authorization: "Bearer xyz" } },
      list: [{ apiKey: "k-1" }],
    }) as Record<string, unknown>;

    assert.equal(output.email, "jane@example.com");
    assert.equal(output.password, REDACTED);
    const nested = output.nested as Record<string, unknown>;
    assert.equal(nested.token, REDACTED);
    assert.equal((nested.deeper as Record<string, unknown>).authorization, REDACTED);
    assert.equal(((output.list as Record<string, unknown>[])[0]).apiKey, REDACTED);
  });

  await t.test("redact survives cycles and unserializable values", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    const output = redact(cyclic) as Record<string, unknown>;
    assert.equal(output.self, "[circular]");
    assert.equal(redact(() => 1), "[unserializable]");
    assert.equal(redact(BigInt(10)), "10");
  });

  await t.test("redactMessage scrubs tokens inside free text", () => {
    const message = "Call failed with Bearer abc.def.ghi and sig=deadbeef and token=xyz789 and re_abcdefghijklmnop123";
    const scrubbed = redactMessage(message);
    assert.ok(!scrubbed.includes("abc.def.ghi"));
    assert.ok(!scrubbed.includes("deadbeef"));
    assert.ok(!scrubbed.includes("xyz789"));
    assert.ok(!scrubbed.includes("re_abcdefghijklmnop123"));
    assert.ok(scrubbed.includes(REDACTED));
  });

  await t.test("truncate cuts long strings and marks the cut", () => {
    const long = "x".repeat(50);
    const out = truncate(long, 10);
    assert.ok(out.startsWith("xxxxxxxxxx"));
    assert.ok(out.includes("40 chars trimmed"));
  });
});

test("BuyFacts Observability - logger suite", async (t) => {
  await t.test("level filtering respects the configured minimum", () => {
    assert.equal(shouldLog("error", "warn"), true);
    assert.equal(shouldLog("info", "warn"), false);
    assert.equal(shouldLog("debug", "debug"), true);
    assert.equal(shouldLog("fatal", "debug"), true);
  });

  await t.test("currentLogLevel honours LOG_LEVEL and falls back safely", () => {
    const original = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "warn";
    assert.equal(currentLogLevel(), "warn");
    process.env.LOG_LEVEL = "not-a-level";
    assert.equal(currentLogLevel(), process.env.NODE_ENV === "production" ? "info" : "debug");
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
  });

  await t.test("buildLogRow captures an Error's name, message and stack", () => {
    const err = new TypeError("boom in handler");
    const row = buildLogRow({ level: "error", event: "http.request.exception", error: err });
    assert.equal(row.level, "error");
    assert.equal(row.category, "system");
    assert.equal(row.errorName, "TypeError");
    assert.equal(row.errorMessage, "boom in handler");
    assert.ok(row.stack && row.stack.includes("TypeError"));
  });

  await t.test("buildLogRow redacts the context payload before storing it", () => {
    const row = buildLogRow({
      level: "info",
      event: "auth.login.success",
      context: { email: "jane@example.com", password: "hunter2" },
    });
    assert.ok(row.context);
    const parsed = JSON.parse(row.context!);
    assert.equal(parsed.email, "jane@example.com");
    assert.equal(parsed.password, REDACTED);
  });

  await t.test("buildLogRow rounds durations and keeps status", () => {
    const row = buildLogRow({ level: "info", event: "http.request.end", status: 200, durationMs: 12.7 });
    assert.equal(row.status, 200);
    assert.equal(row.durationMs, 13);
  });

  await t.test("log() writes through the sink and never throws on a failing sink", async () => {
    const { rows, restore } = captureSink();
    logInfo("contact.created", "Inquiry stored", { category: "http", route: "/api/contact" });
    await flushLogs();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event, "contact.created");
    assert.equal(rows[0].category, "http");
    restore();

    resetLogQueue();
    setLogSink(() => {
      throw new Error("database is down");
    });
    assert.doesNotThrow(() => logError("db.write.failed", new Error("down")));
    await flushLogs();
    setLogSink(null);
    resetLogQueue();
  });
});

test("BuyFacts Observability - request correlation suite", async (t) => {
  await t.test("routeLabel normalises numeric and uuid segments", () => {
    assert.equal(routeLabel("http://localhost/api/contact"), "/api/contact");
    assert.equal(routeLabel("http://localhost/api/admin/users/42"), "/api/admin/users/[id]");
    assert.equal(
      routeLabel("http://localhost/api/x/3f9a2b1c-1111-4222-8333-444455556666"),
      "/api/x/[id]"
    );
  });

  await t.test("withRequestLogging reuses an inbound request id and echoes it back", async () => {
    const { rows, restore } = captureSink();
    resetLogQueue();
    const wrapped = withRequestLogging(async () => new Response("ok", { status: 200 }));
    const response = await wrapped(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "x-request-id": "req-inbound-1", "user-agent": "node-test" },
      })
    );
    await flushLogs();

    assert.equal(response.headers.get("x-request-id"), "req-inbound-1");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event, "http.request.end");
    assert.equal(rows[0].requestId, "req-inbound-1");
    assert.equal(rows[0].method, "POST");
    assert.equal(rows[0].route, "/api/contact");
    assert.equal(rows[0].status, 200);
    assert.equal(typeof rows[0].durationMs, "number");
    restore();
  });

  await t.test("a log call inside the handler inherits the request id", async () => {
    const { rows, restore } = captureSink();
    resetLogQueue();
    const wrapped = withRequestLogging(async () => {
      logInfo("mail.send.succeeded", "verification email dispatched", {
        category: "mail",
        ...requestLogContext({ entityId: "sess-1" }),
      });
      return new Response("ok", { status: 201 });
    });
    const response = await wrapped(new Request("http://localhost/api/verify-email", { method: "POST" }));
    await flushLogs();

    const headerId = response.headers.get("x-request-id");
    const mailRow = rows.find((r) => r.event === "mail.send.succeeded");
    assert.ok(headerId);
    assert.ok(mailRow);
    assert.equal(mailRow!.requestId, headerId);
    assert.equal(mailRow!.route, "/api/verify-email");
    assert.equal(mailRow!.entityId, "sess-1");
    restore();
  });

  await t.test("4xx responses log as warnings, 5xx as errors", async () => {
    const { rows, restore } = captureSink();
    resetLogQueue();
    await withRequestLogging(async () => new Response("bad", { status: 400 }))(
      new Request("http://localhost/api/contact", { method: "POST" })
    );
    await withRequestLogging(async () => new Response("boom", { status: 503 }))(
      new Request("http://localhost/api/cubicon-data", { method: "POST" })
    );
    await flushLogs();
    assert.equal(rows.find((r) => r.status === 400)?.level, "warn");
    assert.equal(rows.find((r) => r.status === 503)?.level, "error");
    restore();
  });

  await t.test("a throwing handler is recorded and answered with a 500 carrying the request id", async () => {
    const { rows, restore } = captureSink();
    resetLogQueue();
    const wrapped = withRequestLogging(async () => {
      throw new Error("kaboom");
    });
    const response = await wrapped(new Request("http://localhost/api/contact", { method: "POST" }));
    await flushLogs();

    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.ok(body.requestId);
    assert.equal(response.headers.get("x-request-id"), body.requestId);

    const row = rows.find((r) => r.event === "http.request.exception");
    assert.ok(row);
    assert.equal(row!.level, "error");
    assert.equal(row!.errorMessage, "kaboom");
    restore();
  });
});

test("BuyFacts Observability - rate limit events", async (t) => {
  await t.test("exceeding a rate limit emits security.rate_limit.exceeded", async () => {
    const { rows, restore } = captureSink();
    resetLogQueue();
    resetRateLimits();
    for (let i = 0; i < 5; i += 1) checkRateLimit("10.0.0.9", "contact");
    const blocked = checkRateLimit("10.0.0.9", "contact");
    await flushLogs();

    assert.equal(blocked.allowed, false);
    const row = rows.find((r) => r.event === "security.rate_limit.exceeded");
    assert.ok(row, "expected a rate limit event");
    assert.equal(row!.category, "security");
    assert.equal(row!.ip, "10.0.0.9");
    assert.ok(row!.context && row!.context.includes("contact"));

    restore();
    resetRateLimits();
  });
});
