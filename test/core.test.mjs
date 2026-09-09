import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const GSB = require("../src/lib/core.js");

test("isGoogleSearchUrl matches Google ccTLD search pages only", () => {
  assert.equal(
    GSB.isGoogleSearchUrl("https://www.google.com/search?q=hi"),
    true,
  );
  assert.equal(
    GSB.isGoogleSearchUrl("https://www.google.co.uk/search?q=hi"),
    true,
  );
  assert.equal(GSB.isGoogleSearchUrl("https://google.de/search?q=hi"), true);
  assert.equal(GSB.isGoogleSearchUrl("https://www.google.com/"), false);
  assert.equal(GSB.isGoogleSearchUrl("https://www.google.com/maps"), false);
  assert.equal(GSB.isGoogleSearchUrl("https://example.com/search?q=hi"), false);
  assert.equal(GSB.isGoogleSearchUrl("https://notgoogle.com/search"), false);
  assert.equal(GSB.isGoogleSearchUrl("not a url"), false);
});

test("webOnlyRedirect adds udm=14 to a plain query", () => {
  const out = GSB.webOnlyRedirect(
    "https://www.google.com/search?q=hello+world",
  );
  assert.ok(out);
  const u = new URL(out);
  assert.equal(u.searchParams.get("udm"), "14");
  assert.equal(u.searchParams.get("q"), "hello world");
});

test("webOnlyRedirect preserves other params and order-insensitively adds udm", () => {
  const out = GSB.webOnlyRedirect("https://www.google.com/search?q=cats&hl=en");
  const u = new URL(out);
  assert.equal(u.searchParams.get("hl"), "en");
  assert.equal(u.searchParams.get("udm"), "14");
});

test("webOnlyRedirect skips when no redirect is needed", () => {
  // already udm-pinned (incl. 14 itself)
  assert.equal(
    GSB.webOnlyRedirect("https://www.google.com/search?q=x&udm=14"),
    null,
  );
  assert.equal(
    GSB.webOnlyRedirect("https://www.google.com/search?q=x&udm=2"),
    null,
  );
  // legacy vertical
  assert.equal(
    GSB.webOnlyRedirect("https://www.google.com/search?q=x&tbm=isch"),
    null,
  );
  // no query
  assert.equal(
    GSB.webOnlyRedirect("https://www.google.com/search?hl=en"),
    null,
  );
  // not a search page
  assert.equal(GSB.webOnlyRedirect("https://www.google.com/maps?q=x"), null);
});

test("isAiOverviewLabel matches labels case/space-insensitively", () => {
  assert.equal(GSB.isAiOverviewLabel("AI Overview"), true);
  assert.equal(GSB.isAiOverviewLabel("  ai   overview "), true);
  assert.equal(GSB.isAiOverviewLabel("AI Overviews"), true);
  assert.equal(GSB.isAiOverviewLabel("KI-Übersicht"), true);
});

test("isAiOverviewLabel ignores unrelated / long text", () => {
  assert.equal(
    GSB.isAiOverviewLabel("Overview of the AI industry trends"),
    false,
  );
  assert.equal(GSB.isAiOverviewLabel("Images"), false);
  assert.equal(GSB.isAiOverviewLabel(""), false);
  assert.equal(GSB.isAiOverviewLabel(null), false);
});

test("isAiModeLabel matches the AI Mode tab label", () => {
  assert.equal(GSB.isAiModeLabel("AI Mode"), true);
  assert.equal(GSB.isAiModeLabel("ai mode"), true);
  assert.equal(GSB.isAiModeLabel("All"), false);
});

test("normalizeLabel collapses whitespace and lowercases", () => {
  assert.equal(GSB.normalizeLabel("  Foo\n  Bar "), "foo bar");
  assert.equal(GSB.normalizeLabel(undefined), "");
});
