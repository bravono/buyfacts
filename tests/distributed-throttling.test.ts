import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  checkRateLimitAsync,
  resetRateLimits,
  resetThrottleHealth,
  setThrottleStore,
  throttleKey,
  windowStartFor,
  resetSecondsFor,
  type ThrottleStore,
} from "../lib/security/rate-limiter";

/**
 * A fake shared store that behaves like the PostgreSQL upsert: the counter is
 * kept by (key, window) so several simulated instances share it.
 */
function fakeSharedStore(): ThrottleStore & { rows: Map<string, number>; calls: number } {
  const rows = new Map<string, number>();
  const store = {
    rows,
    calls: 0,
    async currentWindow(windowSeconds: number) {
      return windowStartFor(Date.now(), windowSeconds);
    },
    async increment(key: string, windowStart: Date, _windowSeconds: number, maxRequests: number) {
      store.calls += 1;
      const rowKey = `${key}@${windowStart.toISOString()}`;
      const current = rows.get(rowKey) ?? 0;
      if (current >= maxRequests) return null;
      rows.set(rowKey, current + 1);
      return current + 1;
    },
    async prune() {
      return 0;
    },
  };
  return store;
}

test("BuyFacts Throttling - distributed / multi-instance suite", async (t) => {
  t.beforeEach(() => {
    resetRateLimits();
    resetThrottleHealth();
    setThrottleStore(null);
  });

  await t.test("1. the key and window are identical on every instance", () => {
    assert.equal(throttleKey("203.0.113.5", "contact"), "buyfacts:contact:203.0.113.5");
    // a fixed bucket: 10-minute windows start on :00, :10, :20 …
    const a = windowStartFor(Date.UTC(2026, 0, 1, 12, 0, 5), 600);
    const b = windowStartFor(Date.UTC(2026, 0, 1, 12, 9, 59), 600);
    const c = windowStartFor(Date.UTC(2026, 0, 1, 12, 10, 1), 600);
    assert.equal(a.toISOString(), b.toISOString());
    assert.notEqual(a.toISOString(), c.toISOString());
    assert.equal(resetSecondsFor(Date.UTC(2026, 0, 1, 12, 9, 59), 600), 1);
    assert.equal(resetSecondsFor(Date.UTC(2026, 0, 1, 12, 0, 0), 600), 600);
  });

  await t.test("2. two instances share one budget instead of each getting the full allowance", async () => {
    const shared = fakeSharedStore();
    setThrottleStore(shared);
    const config = { maxRequests: 3, windowSeconds: 600 };

    // instance A handles two requests, instance B handles the rest
    const instanceA = [
      await checkRateLimitAsync("198.51.100.7", "contact", config),
      await checkRateLimitAsync("198.51.100.7", "contact", config),
    ];
    const instanceB = [
      await checkRateLimitAsync("198.51.100.7", "contact", config),
      await checkRateLimitAsync("198.51.100.7", "contact", config),
    ];

    assert.deepEqual(instanceA.map((r) => r.allowed), [true, true]);
    assert.deepEqual(instanceB.map((r) => r.allowed), [true, false], "the 4th is refused, on the other instance");
    assert.equal(instanceA[1].remaining, 1);
    assert.equal(instanceB[0].remaining, 0);
    assert.equal(instanceB[1].remaining, 0);
    assert.equal(shared.rows.size, 1, "one row per key and window");
    assert.equal([...shared.rows.values()][0], 3);
  });

  await t.test("3. concurrent requests cannot overshoot the limit (atomic increment)", async () => {
    const shared = fakeSharedStore();
    setThrottleStore(shared);
    const config = { maxRequests: 5, windowSeconds: 60 };

    const results = await Promise.all(
      Array.from({ length: 20 }, () => checkRateLimitAsync("198.51.100.9", "share", config))
    );
    assert.equal(results.filter((r) => r.allowed).length, 5);
    assert.equal(results.filter((r) => !r.allowed).length, 15);
  });

  await t.test("4. different actions and callers keep separate budgets", async () => {
    const shared = fakeSharedStore();
    setThrottleStore(shared);
    const config = { maxRequests: 1, windowSeconds: 600 };

    assert.equal((await checkRateLimitAsync("ip-1", "contact", config)).allowed, true);
    assert.equal((await checkRateLimitAsync("ip-1", "contact", config)).allowed, false);
    assert.equal((await checkRateLimitAsync("ip-1", "feedback", config)).allowed, true, "other action has its own budget");
    assert.equal((await checkRateLimitAsync("ip-2", "contact", config)).allowed, true, "other caller has its own budget");
  });

  await t.test("5. results report which store answered", async () => {
    const shared = fakeSharedStore();
    setThrottleStore(shared);
    const ok = await checkRateLimitAsync("ip-3", "contact", { maxRequests: 2, windowSeconds: 60 });
    assert.equal(ok.store, "db");
    assert.equal(ok.degraded, undefined);

    const sync = checkRateLimit("ip-3", "contact", { maxRequests: 2, windowSeconds: 60 });
    assert.equal(sync.store, "memory");
  });

  await t.test("6. a database outage degrades to per-process throttling instead of failing requests", async () => {
    setThrottleStore({
      async currentWindow() {
        throw new Error('relation "ThrottleCounter" does not exist');
      },
      async increment() {
        throw new Error('relation "ThrottleCounter" does not exist');
      },
      async prune() {
        return 0;
      },
    });
    const config = { maxRequests: 2, windowSeconds: 600 };

    const first = await checkRateLimitAsync("ip-4", "contact", config);
    const second = await checkRateLimitAsync("ip-4", "contact", config);
    const third = await checkRateLimitAsync("ip-4", "contact", config);

    assert.equal(first.allowed, true);
    assert.equal(first.degraded, true);
    assert.equal(first.store, "memory");
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false, "still throttled, just per process");
  });

  await t.test("7. the real PostgreSQL store enforces the limit through the database", async () => {
    // Uses the project's own database; skipped when it is not reachable.
    resetThrottleHealth();
    setThrottleStore(null);

    const identifier = `test-${Date.now()}-${Math.random().toString(36).slice(2)}-${process.pid}`;
    const config = { maxRequests: 2, windowSeconds: 60 };

    let results;
    try {
      results = [
        await checkRateLimitAsync(identifier, "throttle_selftest", config),
        await checkRateLimitAsync(identifier, "throttle_selftest", config),
        await checkRateLimitAsync(identifier, "throttle_selftest", config),
      ];
    } catch (err) {
      t.skip(`database unavailable: ${(err as Error).message}`);
      return;
    }

    if (results[0].degraded) {
      t.skip("database unavailable, limiter degraded to the in-process store");
      return;
    }

    assert.equal(results[0].store, "db");
    assert.deepEqual(results.map((r) => r.allowed), [true, true, false]);
    assert.equal(results[1].remaining, 0);

    // housekeeping: remove the row this test created
    const { prisma } = await import("@/lib/prisma");
    await prisma.throttleCounter.deleteMany({ where: { key: { contains: identifier } } });
  });
});
