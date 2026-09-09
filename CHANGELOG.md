# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-09-09

### Fixed

- Start the `MutationObserver` at `document_start` instead of waiting for
  `DOMContentLoaded`, so the AI Overview is hidden as it streams in rather than
  flashing on screen for a moment before results load.

## [1.0.0] - 2026-09-09

### Added

- Hide **AI Overviews** on the Google results page via a curated CSS fast-path
  plus a durable, locale-aware text-label scanner with a `MutationObserver`.
- Hide the **AI Mode** tab from the results toolbar.
- **Web results only** mode: an optional client-side redirect to `udm=14` that
  _prevents_ AI Overviews from being generated at all, in any language.
- Cross-browser builds from a single `src/` tree: Chrome, Edge, Firefox, and a
  Safari conversion path (`npm run build:safari`).
- Toolbar popup with three toggles, synced via the extension `storage` API.
- Dependency-free build tooling: per-browser packaging with a bundled ZIP
  writer, icon generation, and manifest generation from a Google-domain list.
- Unit, DOM, manifest, and ZIP test suites (`node --test`).
- CI (lint, format, tests, build) and project docs.

[Unreleased]: https://github.com/leo-aa88/google-slop-blocker/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/leo-aa88/google-slop-blocker/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/leo-aa88/google-slop-blocker/releases/tag/v1.0.0
