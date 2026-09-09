/* Popup controller: binds the three toggles to stored settings. */
(function () {
  "use strict";

  const { getSettings, saveSettings } = globalThis.GSB;
  const FIELDS = ["hideOverviews", "hideAiMode", "webOnly"];
  const statusEl = document.getElementById("status");
  let statusTimer;

  function flashStatus(message) {
    statusEl.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (statusEl.textContent = ""), 1600);
  }

  getSettings().then((settings) => {
    for (const id of FIELDS) {
      const input = document.getElementById(id);
      input.checked = !!settings[id];
      input.addEventListener("change", () => {
        saveSettings({ [id]: input.checked }).then(() => {
          flashStatus("Saved · reload Google to apply");
        });
      });
    }
  });
})();
