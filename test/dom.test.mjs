import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const GSB = require("../src/lib/core.js");

const ALL_ON = { hideOverviews: true, hideAiMode: true };

function domFrom(html) {
  return new JSDOM(`<!doctype html><html><body>${html}</body></html>`).window
    .document;
}

test("findHideTargets flags the AI Overview block and climbs to its top block", () => {
  const doc = domFrom(`
    <div id="rcnt">
      <div id="center_col">
        <div id="rso">
          <div class="overview-card" id="target">
            <div><div role="heading">AI Overview</div><p>slop…</p></div>
          </div>
          <div class="result" id="keep"><a>A real result</a></div>
        </div>
      </div>
    </div>`);

  const targets = GSB.findHideTargets(doc, ALL_ON);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].kind, "overview");
  // Climbed up to the direct child of #rso, not the heading itself.
  assert.equal(targets[0].el.id, "target");
});

test("findHideTargets never targets a structural root element", () => {
  // Label sits directly inside #rso: the safe thing is to hide the label leaf,
  // never the #rso container that holds every result.
  const doc = domFrom(`<div id="rso"><h2 id="h">AI Overview</h2></div>`);
  const targets = GSB.findHideTargets(doc, ALL_ON);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].el.id, "h");
  assert.notEqual(targets[0].el.id, "rso");
});

test("topLevelBlock returns null when the label IS a root", () => {
  // A (degenerate) label that is itself a root container must not be hidden.
  const doc = domFrom(`<div id="rso">AI Overview</div>`);
  assert.equal(GSB.topLevelBlock(doc.getElementById("rso")), null);
});

test("findHideTargets hides NOTHING when there is no results container", () => {
  // Regression: a label with no #rso/#search/#center_col/#rcnt ancestor must
  // never cause a page-level wrapper to be hidden (the "blanked page" bug).
  const doc = domFrom(`
    <div id="page-wrapper">
      <div id="banner"><h2>AI Overview</h2></div>
      <div id="everything-else">real content</div>
    </div>`);
  assert.deepEqual(GSB.findHideTargets(doc, ALL_ON), []);
});

test("findHideTargets ignores the phrase inside an organic result title", () => {
  // Searching *for* "ai overview" must not nuke the results that mention it.
  const doc = domFrom(`
    <div id="rso">
      <div class="g"><a href="#"><h3>Google AI Overview explained</h3></a></div>
      <div class="g"><a href="#"><h3>AI Overview</h3></a></div>
    </div>`);
  // <h3> result titles are not candidates, even when exactly "AI Overview".
  assert.deepEqual(GSB.findHideTargets(doc, ALL_ON), []);
});

test("findHideTargets refuses a block that still wraps the results list", () => {
  const doc = domFrom(`
    <div id="rcnt">
      <div id="cont">
        <div role="heading">AI Overview</div>
        <div id="search"><div id="rso">real results</div></div>
      </div>
    </div>`);
  // Climbing reaches #cont (child of #rcnt), but it contains #search/#rso, so
  // hiding it would blank the results — refuse.
  assert.deepEqual(GSB.findHideTargets(doc, ALL_ON), []);
});

test("findHideTargets leaves ordinary results untouched", () => {
  const doc = domFrom(`
    <div id="rso">
      <div class="result"><h3>Overview of climate policy</h3></div>
      <div class="result"><h3>AI industry news</h3></div>
    </div>`);
  assert.deepEqual(GSB.findHideTargets(doc, ALL_ON), []);
});

test("findHideTargets targets the AI Mode tab link only", () => {
  const doc = domFrom(`
    <div id="hdtb">
      <a id="all" href="#">All</a>
      <a id="aimode" href="#"><span>AI Mode</span></a>
      <a id="images" href="#">Images</a>
    </div>`);
  const targets = GSB.findHideTargets(doc, ALL_ON);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].kind, "aimode");
  assert.equal(targets[0].el.id, "aimode");
});

test("findHideTargets respects disabled settings", () => {
  const doc = domFrom(`
    <div id="rso"><div id="ov"><div role="heading">AI Overview</div></div></div>
    <div id="hdtb"><a><span>AI Mode</span></a></div>`);

  assert.equal(
    GSB.findHideTargets(doc, { hideOverviews: false, hideAiMode: true }).length,
    1, // only the AI Mode tab
  );
  assert.equal(
    GSB.findHideTargets(doc, { hideOverviews: false, hideAiMode: false })
      .length,
    0,
  );
});

test("findHideTargets de-duplicates when several labels share a block", () => {
  const doc = domFrom(`
    <div id="rso">
      <div id="ov">
        <span>AI Overview</span>
        <div role="heading">AI Overview</div>
      </div>
    </div>`);
  const targets = GSB.findHideTargets(doc, ALL_ON);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].el.id, "ov");
});

test("topLevelBlock stops at the first structural root ancestor", () => {
  const doc = domFrom(
    `<div id="center_col"><section><div id="leaf">AI Overview</div></section></div>`,
  );
  const leaf = doc.getElementById("leaf");
  const block = GSB.topLevelBlock(leaf);
  assert.equal(block.tagName, "SECTION");
});
