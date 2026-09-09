/*
 * Fixture-driven tests. Every .html file in test/fixtures/ is loaded into a
 * jsdom document and run through findHideTargets. This is how we lock in
 * real-world SERP regressions without a browser or the network: when the
 * extension misbehaves on some query, save that results page as an .html
 * fixture and the invariants below guard it forever.
 *
 * How to add a fixture:
 *   1. On the misbehaving Google results page, save the page
 *      (DevTools → right-click <html> → "Copy outerHTML", or Save Page As).
 *   2. Drop it in test/fixtures/ with a descriptive name, e.g. `gdpr.html`.
 *   3. Optionally annotate expectations via <meta> tags in the fixture:
 *        <meta name="gsb-expect-overview" content="true|false">
 *      (true = an AI Overview should be detected and hidden; false = none).
 *
 * Universal invariants (checked for every fixture, no annotation needed):
 *   - Nothing we hide contains an organic result (`a h3`).
 *   - We never hide a structural results container (#rso/#search/…).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const GSB = require("../src/lib/core.js");

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const ALL_ON = { hideOverviews: true, hideAiMode: true };
const ROOT_IDS = [
  "rso",
  "search",
  "center_col",
  "rcnt",
  "main",
  "appbar",
  "hdtb",
];

const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".html"));

for (const file of files) {
  test(`fixture: ${file}`, () => {
    const html = readFileSync(join(fixturesDir, file), "utf8");
    const { document } = new JSDOM(html).window;
    const targets = GSB.findHideTargets(document, ALL_ON);

    for (const { el } of targets) {
      // Invariant 1: never hide organic results.
      assert.equal(
        el.querySelector("a h3"),
        null,
        `${file}: hid a block containing an organic result`,
      );
      // Invariant 2: never hide a structural results container.
      assert.ok(
        !ROOT_IDS.includes(el.id),
        `${file}: hid the structural container #${el.id}`,
      );
    }

    // Optional expectation annotation.
    const expect = document
      .querySelector('meta[name="gsb-expect-overview"]')
      ?.getAttribute("content");
    const overviewTargets = targets.filter((t) => t.kind === "overview");
    if (expect === "true") {
      assert.ok(
        overviewTargets.length >= 1,
        `${file}: expected an AI Overview to be detected`,
      );
    } else if (expect === "false") {
      assert.equal(
        overviewTargets.length,
        0,
        `${file}: expected NO AI Overview to be detected`,
      );
    }
  });
}

test("fixtures directory is wired up", () => {
  // Guards against the harness silently finding zero fixtures.
  assert.ok(
    files.length >= 1,
    "expected at least one fixture in test/fixtures",
  );
});
