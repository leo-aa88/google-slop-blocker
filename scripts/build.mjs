#!/usr/bin/env node
/*
 * Builds per-browser packages from a single `src/` tree.
 *
 *   node scripts/build.mjs [chrome|edge|firefox|all] [--zip]
 *
 * Output goes to dist/<target>/ (an unpacked, loadable extension) and, with
 * --zip, dist/<target>.zip ready for each browser's store.
 *
 * The only cross-browser manifest difference we need is Firefox's required
 * `browser_specific_settings.gecko` block; Chromium ignores it but we keep the
 * builds separate so each store gets exactly what it expects.
 *
 * Safari: run `npm run build:safari` (macOS + Xcode) — it converts dist/chrome
 * with Apple's safari-web-extension-converter. See README.
 *
 * Zero runtime dependencies: Node's stdlib only (ZIP writer is bundled).
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipDir } from "./lib/zip.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const srcDir = join(root, "src");
const distDir = join(root, "dist");

const GECKO_ID = "google-slop-blocker@leo-aa88.github.io";
// Firefox 140 is the current ESR (128 is EOL) and is the first version to
// recognise `data_collection_permissions`, which AMO now requires.
const GECKO_MIN_VERSION = "140.0";

const TARGETS = ["chrome", "edge", "firefox"];

function readManifest() {
  return JSON.parse(readFileSync(join(srcDir, "manifest.json"), "utf8"));
}

function buildTarget(target) {
  const outDir = join(distDir, target);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  cpSync(srcDir, outDir, { recursive: true });

  const manifest = readManifest();
  if (target === "firefox") {
    manifest.browser_specific_settings = {
      gecko: {
        id: GECKO_ID,
        strict_min_version: GECKO_MIN_VERSION,
        // We collect no data (see PRIVACY.md). AMO requires this be explicit.
        data_collection_permissions: { required: ["none"] },
      },
      // Firefox for Android gained data_collection_permissions in 142.
      gecko_android: { strict_min_version: "142.0" },
    };
  }
  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );

  console.log(`built dist/${target}/ (v${manifest.version})`);
  return { outDir, version: manifest.version };
}

function zipTarget(target, outDir, version) {
  const zipPath = join(distDir, `${target}-v${version}.zip`);
  rmSync(zipPath, { force: true });
  // Archive with the manifest at the root (no leading directory), as stores
  // require.
  zipDir(outDir, zipPath);
  console.log(`packaged ${zipPath.replace(root + "/", "")}`);
}

function main() {
  const args = process.argv.slice(2);
  const wantZip = args.includes("--zip");
  const requested = args.filter((a) => !a.startsWith("--"));
  const targets =
    requested.length === 0 || requested.includes("all")
      ? TARGETS
      : requested.filter((t) => TARGETS.includes(t));

  if (targets.length === 0) {
    console.error(`Unknown target. Choose from: ${TARGETS.join(", ")}, all`);
    process.exit(1);
  }
  if (!existsSync(join(srcDir, "manifest.json"))) {
    console.error("src/manifest.json missing — run `npm run gen:manifest`.");
    process.exit(1);
  }

  mkdirSync(distDir, { recursive: true });
  for (const target of targets) {
    const { outDir, version } = buildTarget(target);
    if (wantZip) zipTarget(target, outDir, version);
  }
}

main();
