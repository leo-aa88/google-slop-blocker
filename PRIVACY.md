# Privacy Policy

**Google Slop Blocker does not collect, store, transmit, or sell any personal
data.** Full stop.

## What the extension accesses

- **Your on/off settings** (three toggles) are stored using the browser's
  extension `storage` API. If your browser has extension sync enabled, the
  browser — not us — may sync these three booleans across your devices. They
  never reach any server we control (we don't control any).
- **A local mirror of those settings** is written to Google's own site storage
  (`localStorage`) in your browser, purely so the "Web results only" redirect
  can act instantly. It never leaves your device.

## What the extension does on Google pages

- Reads the current page's DOM to find and hide the AI Overview block.
- Optionally rewrites the search URL to add `udm=14` (Web results only).

That's it. No page content, search terms, or browsing history is recorded or
sent anywhere.

## Network activity

The extension makes **no network requests of its own** and contains **no remote
code, analytics, trackers, or telemetry**.

## Permissions

- `storage` — to remember your three toggle settings. Nothing else.
- Host access is limited to Google Search domains (`*.google.<tld>`), and only
  to run the content script there.

## Changes

If this policy ever changes, the update will appear in this file and in the
[CHANGELOG](CHANGELOG.md).

## Contact

Questions? Email **leonardo.aa88@gmail.com** or open an issue.
