#!/usr/bin/env node
// Regenerates src/manifest.json from manifest.base.json + google-domains.json.
// The committed manifest is kept in sync so `src/` loads unpacked as-is.
//
//   node scripts/gen-manifest.mjs [--check]
//
// --check exits non-zero if the committed manifest is stale (used in CI).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const base = JSON.parse(readFileSync(join(here, "manifest.base.json"), "utf8"));
const domains = JSON.parse(
  readFileSync(join(here, "google-domains.json"), "utf8"),
);

const matches = domains.map((d) => `*://*.${d}/*`);

// No host_permissions on purpose: the content script does all of its work
// in-page (DOM hiding + an optional client-side redirect), so `matches` alone
// is enough. Fewer permissions = an easier review and a smaller attack surface.
const manifest = {
  ...base,
  content_scripts: base.content_scripts.map((cs) => ({ ...cs, matches })),
};

const out = JSON.stringify(manifest, null, 2) + "\n";
const target = join(root, "src", "manifest.json");

if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");
  if (current !== out) {
    console.error(
      "src/manifest.json is out of date. Run `npm run gen:manifest`.",
    );
    process.exit(1);
  }
  console.log("manifest is up to date");
} else {
  writeFileSync(target, out);
  console.log(`wrote src/manifest.json (${domains.length} Google domains)`);
}
