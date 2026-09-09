#!/usr/bin/env bash
#
# Wrap the extension as a Safari App Extension.
#
# Safari uses the same WebExtension/MV3 code as Chrome and Firefox, but ships
# inside a native macOS/iOS app. Apple provides a converter that generates an
# Xcode project from an unpacked extension.
#
# Requirements: macOS with Xcode + command line tools (provides `xcrun` and
# `safari-web-extension-converter`).
#
# Usage:
#   npm run build:safari            # generate the Xcode project
#
# Then open the generated project in Xcode to build/sign/notarize, and enable
# the extension in Safari → Settings → Extensions (turn on "Allow unsigned
# extensions" in the Develop menu for local testing).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_BUILD="$ROOT/dist/chrome"
OUT="$ROOT/dist/safari"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "error: Safari packaging requires macOS with Xcode." >&2
  exit 1
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "error: xcrun not found — install Xcode command line tools." >&2
  exit 1
fi

# Ensure we have a fresh unpacked build to convert.
node "$ROOT/scripts/build.mjs" chrome

rm -rf "$OUT"
mkdir -p "$OUT"

xcrun safari-web-extension-converter "$CHROME_BUILD" \
  --project-location "$OUT" \
  --app-name "Google Slop Blocker" \
  --bundle-identifier "io.github.leo-aa88.googleslopblocker" \
  --no-open --force

echo
echo "Safari Xcode project created in dist/safari/."
echo "Open it in Xcode to build, sign, and run."
