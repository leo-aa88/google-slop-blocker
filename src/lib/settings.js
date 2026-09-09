/*
 * Settings storage wrapper. Works across Chromium (chrome.*) and Firefox
 * (browser.*), preferring synced storage and falling back to local. Exposes a
 * tiny promise-based API on the shared GSB namespace.
 */
(function () {
  "use strict";

  const ext =
    typeof browser !== "undefined" && browser.storage
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : null;

  const DEFAULTS = Object.freeze({
    // Remove the AI Overview block from the results page (DOM hiding).
    hideOverviews: true,
    // Hide the "AI Mode" tab / entry points in the results toolbar.
    hideAiMode: true,
    // Prevention mode: redirect searches to the udm=14 "Web" corpus, where
    // Google never generates an AI Overview in the first place.
    webOnly: false,
  });

  const KEYS = Object.keys(DEFAULTS);

  function area() {
    // storage.sync can be disabled by policy; fall back to local.
    return (ext.storage && ext.storage.sync) || ext.storage.local;
  }

  function getSettings() {
    return new Promise((resolve) => {
      if (!ext || !ext.storage) return resolve({ ...DEFAULTS });
      try {
        area().get(DEFAULTS, (stored) => {
          if (ext.runtime && ext.runtime.lastError)
            return resolve({ ...DEFAULTS });
          resolve({ ...DEFAULTS, ...(stored || {}) });
        });
      } catch {
        resolve({ ...DEFAULTS });
      }
    });
  }

  function saveSettings(patch) {
    return new Promise((resolve) => {
      if (!ext || !ext.storage) return resolve();
      const clean = {};
      for (const k of KEYS) if (k in patch) clean[k] = !!patch[k];
      try {
        area().set(clean, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  /** Subscribe to changes; callback receives the full merged settings. */
  function onSettingsChanged(callback) {
    if (!ext || !ext.storage || !ext.storage.onChanged) return () => {};
    const listener = (changes) => {
      if (KEYS.some((k) => k in changes)) getSettings().then(callback);
    };
    ext.storage.onChanged.addListener(listener);
    return () => ext.storage.onChanged.removeListener(listener);
  }

  globalThis.GSB = Object.assign(globalThis.GSB || {}, {
    DEFAULTS,
    getSettings,
    saveSettings,
    onSettingsChanged,
  });
})();
