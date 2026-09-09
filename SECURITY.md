# Security Policy

## Supported versions

The latest released version receives security fixes. Please make sure you're on
the newest release before reporting.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, report privately using GitHub's
[**Report a vulnerability**](https://github.com/leo-aa88/google-slop-blocker/security/advisories/new)
(Security → Advisories), or email **leonardo.aa88@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce, and
- affected browser(s) and version(s).

You can expect an acknowledgement within **7 days** and, where applicable, a
fix and coordinated disclosure. We'll credit you unless you prefer to remain
anonymous.

## Scope & threat model

This is a content-script-only extension that:

- requests a single permission (`storage`),
- makes **no network requests** and loads **no remote code**,
- runs only on Google Search pages (`*.google.<tld>/*`).

Relevant concerns we care about include: DOM-injection or XSS via the content
script or popup, the `udm=14` redirect being abused to reach an unintended
origin, unsafe handling of stored settings, and any accidental data exfiltration
(there should be none). Reports along these lines are very welcome.

## Out of scope

- Google changing its markup so an Overview is briefly visible (that's a
  selector bug — please file a normal issue).
- Vulnerabilities in dev-only tooling that don't ship in the extension.
