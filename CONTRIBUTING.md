# Contributing to Google Slop Blocker

Thanks for helping keep Google search free of AI slop! Contributions of all
sizes are welcome — especially **selector/label refreshes** when Google changes
its markup.

By participating you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Getting set up

```bash
git clone https://github.com/leo-aa88/google-slop-blocker.git
cd google-slop-blocker
npm ci            # dev tooling only (the extension has no runtime deps)
npm run check     # manifest freshness + lint + tests — run this before a PR
```

Load the extension unpacked while you work (see the README's
[Install](README.md#install) section). `src/` is directly loadable in Chromium
and Firefox; run `npm run build` to produce the packaged per-browser variants.

## Project conventions

- **No runtime dependencies.** The shipped extension is plain JS/CSS/HTML. Dev
  dependencies (ESLint, Prettier, jsdom, web-ext) are fine.
- **Keep logic in `src/lib/core.js`.** It's pure and unit-tested. Side effects
  (DOM, storage, redirects) live in `content.js`, `settings.js`, and the popup.
- **Formatting & linting** are enforced in CI: `npm run lint` (ESLint +
  Prettier). Run `npm run format` to auto-fix.
- **Tests** run with `node --test` (`npm test`). Add or update tests for any
  behavior change. DOM behavior is testable with jsdom — see `test/dom.test.mjs`.
- **`src/manifest.json` is generated.** Don't hand-edit it. Change
  `scripts/manifest.base.json` or `scripts/google-domains.json` and run
  `npm run gen:manifest`. CI fails if it's stale (`npm run check:manifest`).

## Keeping the scanner working (the common contribution)

Google frequently reshuffles the AI Overview's markup. The scanner keys off the
visible **"AI Overview" heading text** and the id of the enclosing results
container, so most breakage falls into one of two buckets:

1. On a Google results page showing an AI Overview, open DevTools and inspect
   the Overview container.
2. **New locale / reworded label:** confirm the visible label text. Add the
   lowercase string to `AI_OVERVIEW_LABELS` (or `AI_MODE_LABELS`) in
   [`src/lib/core.js`](src/lib/core.js). This is the most common and most
   durable fix.
3. **Label is no longer a heading:** if Google renders "AI Overview" as
   something other than `h1`/`h2`/`[role="heading"]`, widen
   `OVERVIEW_LABEL_SELECTOR` in `core.js` — but keep it narrow enough that it
   can't match organic result titles (avoid `h3`, bare `span`/`div`).
4. **Results container id changed:** if the Overview's ancestor container isn't
   in `ROOT_IDS`, add it (and, if it can wrap the whole results list, to
   `RESULTS_CONTAINER_SELECTOR`). The scanner only hides a direct child of a
   `ROOT_IDS` container and never a block that contains the results list — keep
   that invariant intact.
5. Add a regression test. Two good options:
   - a focused case in `test/dom.test.mjs` with a synthetic DOM, or
   - **a real fixture**: save the misbehaving results page as
     `test/fixtures/<name>.html` (DevTools → right-click `<html>` → Copy
     outerHTML). The fixture harness (`test/fixtures.test.mjs`) automatically
     asserts the extension never hides organic results (`a h3`) or a results
     container; add `<meta name="gsb-expect-overview" content="true|false">` to
     assert whether an Overview should be detected.
6. Note the date and your locale in the PR description — markup varies by region.

## Adding a locale

- Add the label string(s) to `AI_OVERVIEW_LABELS` / `AI_MODE_LABELS` in
  `core.js`, lowercase.
- Add a matching assertion to `test/core.test.mjs`.

## Commit & PR

- Use clear, imperative commit messages (e.g. "Add Polish AI Overview label").
- Keep PRs focused. Describe what you changed and how you verified it (browser +
  version + locale help a lot for selector changes).
- Ensure `npm run check` passes.

## Reporting bugs

Use the issue templates. For "Overview not hidden" reports, please include your
browser, version, language/region, and — if you can — the outer HTML of the
Overview container. That's what lets us fix selectors quickly.
