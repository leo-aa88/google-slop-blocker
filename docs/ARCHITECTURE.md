# Architecture

Google Slop Blocker is intentionally small. This document explains how the
pieces fit together and why.

## Directory layout

```
src/                       # the extension itself (loadable unpacked in Chromium)
  manifest.json            # GENERATED from scripts/manifest.base.json + domains
  lib/
    core.js                # pure logic (UMD: content script + Node tests)
    settings.js            # chrome/browser storage wrapper (promises)
  content/
    content.js             # the content script (side effects only)
    content.css            # instant, no-flash hiding (document_start)
  popup/                   # the toolbar popup UI
  icons/                   # PNG icons (generated)
scripts/                   # build & codegen (Node ESM, no runtime deps)
  build.mjs                # per-browser packaging → dist/
  gen-manifest.mjs         # regenerate src/manifest.json
  gen-icons.py             # regenerate icons (Pillow)
  google-domains.json      # every Google ccTLD the content script runs on
  lib/zip.mjs              # dependency-free ZIP writer
test/                      # node --test suites (core, DOM, manifest, zip)
```

## Two independent strategies

### 1. Prevention — "Web results only" (`udm=14`)

`udm=14` selects Google's plain **Web** corpus. That page never contains an AI
Overview, so switching to it means Google never generates one. This is:

- **language-independent** (no page text is read), and
- **cheap and robust** (it's just a query parameter).

The content script runs at `document_start` and, using a synchronous mirror of
the setting in the page-origin `localStorage`, calls `location.replace()` to add
`udm=14` before the page renders. `webOnlyRedirect()` in `core.js` decides
whether a redirect is needed (skips non-queries, legacy `tbm=` verticals, and
URLs already pinned to a corpus, so there's no redirect loop).

### 2. Removal — hide the Overview on the normal SERP

When you want the full results page minus the AI Overview, `content.js` runs a
**text-label scanner** (`findHideTargets` in `core.js`):

1. It looks at heading elements only (`h1, h2, [role="heading"]`) whose text is a
   known "AI Overview" label (in many locales). Restricting to headings avoids
   matching the phrase where it merely appears inside an organic result — which
   matters when the query itself is about "AI Overview".
2. `topLevelBlock` climbs to the **direct child of the nearest results
   container** (`#rso`, `#search`, `#center_col`, `#rcnt`) and returns it.
3. Two fail-safes prevent ever blanking the page: if no results-container
   ancestor is found, it hides **nothing**; and any candidate block that still
   contains the results list (`#search`/`#rso`/…) is refused.
4. The chosen block gets `.gsb-hidden` (`display: none`). A debounced
   `MutationObserver` re-runs the scan as Google streams content in.

We deliberately **do not** ship class/attribute CSS selectors for the Overview:
Google's obfuscated class names change constantly, and a stale, overly broad
selector risks hiding real results. The visible label is the more stable signal,
and the scanner's guards make over-hiding safe by construction.

## Why `core.js` is UMD

`core.js` contains all the logic worth testing, written as pure functions with
no DOM/storage/`chrome.*` side effects. A small UMD wrapper lets the same file
be:

- loaded as a classic content script (assigns to `globalThis.GSB`), and
- `require()`d by the Node test runner.

This means the risky logic (URL rewriting, label matching, block selection) is
unit-tested without spinning up a browser. `settings.js` and `content.js` hold
the unavoidable side effects and stay thin.

## Permissions (least privilege)

The manifest requests only `storage`. There are **no** `host_permissions`: the
content script does everything in-page, so `content_scripts.matches` is
sufficient and there's no cross-origin network access to justify. Fewer
permissions → easier store review and a smaller attack surface.

## Cross-browser packaging

`scripts/build.mjs` copies `src/` to `dist/<target>/` and applies the only
per-store manifest difference that matters: Firefox's required
`browser_specific_settings.gecko` block. Chromium ignores that key, so Chrome
and Edge share the base manifest verbatim. Safari is generated from the Chrome
build with Apple's `safari-web-extension-converter` (see [SAFARI.md](SAFARI.md)).
