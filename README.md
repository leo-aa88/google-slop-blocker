# Google Slop Blocker

> Remove Google's **AI Overviews** and AI-generated search clutter — on
> **Chrome, Edge, Firefox, Safari**, and every other Chromium browser, from a
> single codebase.

<p align="center">
  <img src="src/icons/icon-128.png" alt="Google Slop Blocker icon" width="96" height="96" />
</p>

<p align="center">
  <a href="https://github.com/leo-aa88/google-slop-blocker/actions/workflows/ci.yml"><img src="https://github.com/leo-aa88/google-slop-blocker/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license" />
</p>

Most "hide the AI Overview" tools only cover the Chrome Web Store and simply set
`display: none` — Google still generates the AI answer, you just don't see it.
Google Slop Blocker is different on two fronts:

1. **Truly cross-browser, packaged per store.** One `src/` tree builds to
   Chrome, Edge, Firefox, and Safari, each with the manifest that store expects.
2. **Prevention, not just hiding.** An optional **Web results only** mode
   redirects your searches to Google's plain `udm=14` corpus, where an AI
   Overview is _never generated in the first place_.

---

## Features

- **Hide AI Overviews** — removes the AI Overview block from the results page.
- **Hide the AI Mode tab** — drops the "AI Mode" entry point from the toolbar.
- **Web results only (prevention)** — optional redirect to `udm=14`, so Google
  serves classic web links and produces no AI Overview at all. Works in every
  language, since it never depends on reading the page.
- **Durable & fail-safe** — a locale-aware text-label scanner finds the Overview
  even when Google shuffles its obfuscated CSS class names, and is designed to
  hide _nothing_ rather than risk hiding real results when the markup is
  unfamiliar.
- **Privacy-respecting** — no network requests, no analytics, no remote code.
  The only permission requested is `storage` (to remember your toggles).
- **Tiny and dependency-free at runtime** — plain JavaScript, no frameworks.

## Install

Store listings are coming soon. Until then it installs manually in about a
minute — **no build tools required** for Chrome, Edge, or Firefox.

**Step 1 — get the files.** Click the green **Code ▾ → Download ZIP** above and
unzip it (or `git clone` the repo).

**Chrome · Edge · Brave · Opera · Vivaldi**

1. Open `chrome://extensions` (on Edge: `edge://extensions`).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the **`src`** folder.

That's it — the icon appears in your toolbar.

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select **`src/manifest.json`**.

_(Firefox removes temporary add-ons when it restarts; repeat to re-add.)_

**Safari** (macOS)

Requires Xcode. Run `npm run build:safari`, then open the generated project in
`dist/safari/` and run it. Details in [docs/SAFARI.md](docs/SAFARI.md).

<details>
<summary>Prefer packaged <code>.zip</code> builds? (optional)</summary>

```bash
npm ci && npm run build   # writes dist/chrome, dist/edge, dist/firefox + zips
```

Then load `dist/chrome` (or `dist/edge`) as above, or `dist/firefox/manifest.json`
in Firefox.

</details>

## Usage

Click the toolbar icon to open the popup and toggle:

| Toggle                | What it does                                                        | Default |
| --------------------- | ------------------------------------------------------------------- | ------- |
| **Hide AI Overviews** | Removes the AI Overview box from the results page.                  | On      |
| **Hide AI Mode tab**  | Removes the "AI Mode" tab from the toolbar.                         | On      |
| **Web results only**  | Redirects searches to `udm=14`; **prevents** AI Overviews entirely. | Off     |

Reload any open Google tab after changing a setting.

> **Tip:** If you don't mind losing the image thumbnails / knowledge panels on
> the results page, **Web results only** is the most bulletproof option — it's
> language-independent and stops the AI answer from being generated at all.

## How it works

```
┌── Web results only (prevention) ──────────────────────────────┐
│  Search → content script (document_start) rewrites the URL to  │
│  udm=14 before render → Google returns plain web links, no AIO │
└────────────────────────────────────────────────────────────────┘

┌── Hide (default) ─────────────────────────────────────────────┐
│  content.js label-scanner finds the "AI Overview" heading,     │
│  climbs to the enclosing results block, and tags it hidden;    │
│  a MutationObserver re-scans as Google streams content in.     │
│  Fail-safe: only ever hides a child of a known results         │
│  container, never something that wraps the results list.       │
└────────────────────────────────────────────────────────────────┘
```

The heavy lifting is a few small, pure functions in
[`src/lib/core.js`](src/lib/core.js) — fully unit-tested without a browser.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the details.

## Development

```bash
npm ci              # install dev tooling
npm test            # run the unit + DOM tests (node --test)
npm run lint        # eslint + prettier --check
npm run format      # prettier --write
npm run build       # build all targets + zips into dist/
npm run check       # manifest freshness + lint + tests (what CI runs)
```

Regenerating derived files:

```bash
npm run gen:icons     # rebuild PNG icons from scripts/gen-icons.py (needs Pillow)
npm run gen:manifest  # rebuild src/manifest.json from the domain list
```

## Why not just uBlock Origin?

You can hide the Overview with a uBlock cosmetic filter, but that's a
Chrome-Manifest-V2 story that's fading, it only hides (never prevents), and the
class-name filters break constantly. This project ships a maintained,
cross-browser package with a prevention mode and a self-healing scanner.

## Contributing

Selectors drift as Google changes its markup — PRs that refresh them or add
locale labels are especially welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and
our [Code of Conduct](CODE_OF_CONDUCT.md).

## Privacy & security

No data leaves your browser. See [PRIVACY.md](PRIVACY.md) and
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Leonardo Araujo

---

_Not affiliated with, endorsed by, or sponsored by Google LLC. "Google" is a
trademark of Google LLC._
