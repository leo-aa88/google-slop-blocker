import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "src", "manifest.json"), "utf8"),
);
const domains = JSON.parse(
  readFileSync(join(root, "scripts", "google-domains.json"), "utf8"),
);

test("manifest is MV3 with least-privilege permissions", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  // No host_permissions: the content script works in-page only.
  assert.equal(manifest.host_permissions, undefined);
});

test("content-script matches cover every configured Google domain", () => {
  const matches = manifest.content_scripts[0].matches;
  assert.equal(matches.length, domains.length);
  for (const d of domains) {
    assert.ok(matches.includes(`*://*.${d}/*`), `missing match for ${d}`);
  }
});

test("every match pattern is well-formed", () => {
  for (const m of manifest.content_scripts[0].matches) {
    assert.match(m, /^\*:\/\/\*\.google\.[a-z.]+\/\*$/);
  }
});

test("declared script/style files line up and run early", () => {
  const cs = manifest.content_scripts[0];
  assert.equal(cs.run_at, "document_start");
  assert.deepEqual(cs.js, [
    "lib/settings.js",
    "lib/core.js",
    "content/content.js",
  ]);
  assert.deepEqual(cs.css, ["content/content.css"]);
});

test("manifest version matches package.json", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(manifest.version, pkg.version);
});
