import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMediaUrl, findInvalidMediaUrl, MEDIA_URL_ERROR } from "../lib/validateMediaUrl";

test("empty values are allowed so a field can be cleared", () => {
  for (const v of ["", "   ", null, undefined]) assert.equal(validateMediaUrl(v), null);
});

test("full https URLs and root-relative paths are allowed", () => {
  assert.equal(
    validateMediaUrl("https://s3.buyfacts.com/buyfacts-public-assets/products-services/123-abc-01_Target.pdf"),
    null
  );
  assert.equal(validateMediaUrl("http://localhost:9000/bucket/a.mp3"), null);
  assert.equal(validateMediaUrl("  /triad-app/index.html#/know-your-major  "), null);
});

test("bare filenames and relative paths are rejected", () => {
  for (const v of ["01_Target.pdf", "uploads/report.pdf", "s3.buyfacts.com/a.pdf"]) {
    assert.equal(validateMediaUrl(v), MEDIA_URL_ERROR, v);
  }
});

test("unsafe schemes, protocol-relative and malformed URLs are rejected", () => {
  for (const v of ["javascript:alert(1)", "data:application/pdf;base64,AAAA", "//evil.example/a.pdf", "https://", 42]) {
    assert.equal(validateMediaUrl(v), MEDIA_URL_ERROR, String(v));
  }
});

test("findInvalidMediaUrl names the failing field and ignores other fields", () => {
  assert.equal(findInvalidMediaUrl({ title: "x.pdf", readItUrl: "https://a.com/x.pdf" }), null);
  assert.equal(findInvalidMediaUrl({ hearItUrl: "01_Target.pdf" }), `hearItUrl: ${MEDIA_URL_ERROR}`);
});
