/*
 * Content script. Runs at document_start on Google search pages.
 *
 * Two independent jobs:
 *   1. Prevention  — in "Web results only" mode, redirect to udm=14 before the
 *      page renders, so Google never produces an AI Overview.
 *   2. Removal     — hide the AI Overview / AI Mode DOM for the normal SERP,
 *      via a fail-safe text-label scanner (see core.js).
 *
 * Depends on the shared GSB namespace defined by lib/core.js and lib/settings.js
 * (loaded before this file per the manifest).
 */
(function () {
  "use strict";

  const {
    webOnlyRedirect,
    findHideTargets,
    DEFAULTS,
    getSettings,
    onSettingsChanged,
  } = globalThis.GSB;

  const MIRROR_KEY = "gsb:settings";
  const HIDDEN = "gsb-hidden";

  // ---- synchronous per-origin mirror (for instant redirect at document_start)
  function readMirror() {
    try {
      return JSON.parse(window.localStorage.getItem(MIRROR_KEY) || "null");
    } catch {
      return null;
    }
  }
  function writeMirror(settings) {
    try {
      window.localStorage.setItem(MIRROR_KEY, JSON.stringify(settings));
    } catch {
      /* private mode / storage disabled — ignore */
    }
  }

  // ---- 1. prevention: redirect as early as possible using the cached mirror
  const mirror = readMirror() || DEFAULTS;
  if (mirror.webOnly) {
    const target = webOnlyRedirect(window.location.href);
    if (target && target !== window.location.href) {
      window.location.replace(target);
      return; // stop; the fresh navigation re-runs this script cleanly
    }
  }

  // ---- 2. removal: scan the DOM for the AI Overview / AI Mode and hide them
  let settings = { ...DEFAULTS };

  function hideBlock(node, kind) {
    if (!node || node.classList.contains(HIDDEN)) return;
    node.classList.add(HIDDEN);
    node.setAttribute("data-gsb", kind);
  }

  function unhideKind(kind) {
    document
      .querySelectorAll(`.${HIDDEN}[data-gsb="${kind}"]`)
      .forEach((el) => {
        el.classList.remove(HIDDEN);
        el.removeAttribute("data-gsb");
      });
  }

  function scan() {
    for (const { el, kind } of findHideTargets(document, settings)) {
      hideBlock(el, kind);
    }
  }

  // Debounce scans triggered by DOM mutations.
  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(() => {
      scheduled = false;
      scan();
    });
  }

  const observer = new MutationObserver(scheduleScan);

  // Observe from document_start (documentElement exists this early) so the AI
  // Overview is caught and hidden as Google streams it in — the scan runs in a
  // requestAnimationFrame callback, i.e. before the frame is painted, so the
  // Overview never flashes on screen. Waiting for DOMContentLoaded, by
  // contrast, lets the Overview paint during initial parse.
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  scan();

  // Re-scan at the usual milestones in case content settles between frames.
  document.addEventListener("DOMContentLoaded", scan, { once: true });
  window.addEventListener("load", scan, { once: true });

  // ---- reconcile with real storage, then keep in sync
  function apply(newSettings) {
    const prev = settings;
    settings = newSettings;
    writeMirror(settings);
    if (prev.hideOverviews && !settings.hideOverviews) unhideKind("overview");
    if (prev.hideAiMode && !settings.hideAiMode) unhideKind("aimode");
    scheduleScan();
  }

  getSettings().then(apply);
  onSettingsChanged(apply);
})();
