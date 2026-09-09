/*
 * Core, side-effect-free logic for Google Slop Blocker.
 *
 * This file is a plain classic script (it runs as a content script and is
 * ALSO require()-able from Node for unit tests). Everything here is pure so it
 * can be tested without a browser. No DOM, storage, or chrome.* access.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GSB = Object.assign(root.GSB || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /*
   * Strings Google uses to label the AI Overview block, per locale. Matching
   * is case-insensitive and whitespace-normalised (see normalizeLabel).
   *
   * English is reliable. Other locales are best-effort and drift as Google
   * rewords things — non-English users are better served by "Web results only"
   * mode, which is entirely language-independent. PRs to extend this list are
   * welcome (see CONTRIBUTING.md).
   */
  const AI_OVERVIEW_LABELS = [
    "ai overview",
    "ai overviews",
    "übersicht mit ki",
    "ki-übersicht", // de
    "resumen con ia",
    "descripción general de ia", // es
    "aperçu ia", // fr
    "panoramica ai", // it
    "visão geral criada por ia",
    "resumo de ia", // pt
    "ai-overzicht", // nl
    "przegląd ai", // pl
    "обзор от ии", // ru
    "ai による概要", // ja
    "ai 개요", // ko
    "ai 概览",
    "ai摘要", // zh
  ];

  const AI_MODE_LABELS = ["ai mode", "modo ia", "ki-modus", "mode ia"];

  /** Collapse whitespace, trim, lowercase. */
  function normalizeLabel(text) {
    return String(text == null ? "" : text)
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function matchesAnyLabel(text, labels) {
    const n = normalizeLabel(text);
    if (!n || n.length > 48) return false; // labels are short; bail on prose
    return labels.some((l) => n === l || n.startsWith(l + " "));
  }

  const isAiOverviewLabel = (text) => matchesAnyLabel(text, AI_OVERVIEW_LABELS);
  const isAiModeLabel = (text) => matchesAnyLabel(text, AI_MODE_LABELS);

  /*
   * Structural SERP containers whose *direct child* holding the AI Overview is
   * the largest thing we will ever hide. We climb up to one of these and hide
   * the child — never the container itself, and never higher.
   */
  const ROOT_IDS = [
    "rso",
    "search",
    "center_col",
    "rcnt",
    "main",
    "appbar",
    "hdtb",
  ];

  // If a candidate hide-block contains one of these, it wraps the whole results
  // area — a sign we climbed too far — so we refuse to hide it. This is a
  // backstop against blanking the page.
  const RESULTS_CONTAINER_SELECTOR = "#search, #rso, #rcnt, #center_col";

  // The canonical marker of a Google organic (or video) result is a link that
  // wraps a heading: `<a> … <h3>`. The AI Overview card never contains one, so
  // any block that does is holding real results and must not be hidden. This is
  // what stops us swallowing results when Google nests the Overview and the
  // results inside a shared wrapper (e.g. the "GDPR" SERP).
  const ORGANIC_RESULT_SELECTOR = "a h3";

  // The AI Overview title is a heading, not body text. Restricting candidates
  // to headings (never spans/result <h3> titles) keeps us from matching the
  // phrase where it merely appears inside an organic result — important when
  // the query itself is about "AI Overview".
  const OVERVIEW_LABEL_SELECTOR =
    'h1, h2, div[role="heading"], [role="heading"]';

  /** True if `el` contains a Google organic/video result. */
  function containsOrganicResults(el) {
    return !!el.querySelector(ORGANIC_RESULT_SELECTOR);
  }

  /**
   * Climb from an "AI Overview" label to the largest ancestor that still wraps
   * only the Overview card — never real results. We stop climbing as soon as
   * the next parent would pull in organic results or is a structural results
   * container, and we refuse the result outright if it still holds results or a
   * results container. Returns null (hide nothing) when there's nothing safe to
   * hide. Pure: uses only DOM traversal.
   */
  function topLevelBlock(labelEl, rootIds) {
    const roots = new Set(rootIds || ROOT_IDS);
    const doc = labelEl.ownerDocument;
    const body = doc && doc.body;
    const html = doc && doc.documentElement;
    let node = labelEl;
    while (node.parentElement) {
      const parent = node.parentElement;
      // Reaching the document edges without passing through a results context
      // means we're not inside the SERP results — hide nothing (fail-safe).
      if (parent === body || parent === html) return null;
      // Stop at a results container, or at a parent that also holds organic
      // results (climbing into it would hide them). `node` is the Overview card.
      if (roots.has(parent.id) || containsOrganicResults(parent)) break;
      node = parent;
    }
    if (!node.parentElement) return null;
    if (roots.has(node.id)) return null; // never a structural root itself
    if (node.querySelector(RESULTS_CONTAINER_SELECTOR)) return null;
    if (containsOrganicResults(node)) return null; // still too broad — bail
    return node;
  }

  /**
   * Given a DOM subtree and the active settings, return the unique elements to
   * hide, each tagged with its kind ("overview" | "aimode"). Pure — performs no
   * mutation, so it is unit-testable with a synthetic DOM.
   */
  function findHideTargets(root, settings) {
    const seen = new Set();
    const targets = [];
    const add = (el, kind) => {
      if (el && !seen.has(el)) {
        seen.add(el);
        targets.push({ el, kind });
      }
    };

    if (settings.hideOverviews) {
      for (const el of root.querySelectorAll(OVERVIEW_LABEL_SELECTOR)) {
        if (!isAiOverviewLabel(el.textContent)) continue;
        // topLevelBlock returns null unless the block is safe to hide.
        add(topLevelBlock(el), "overview");
      }
    }

    if (settings.hideAiMode) {
      // The AI Mode entry point is a toolbar link; hide just that link/tab.
      for (const a of root.querySelectorAll("a")) {
        if (isAiModeLabel(a.textContent)) add(a.closest("li") || a, "aimode");
      }
    }

    return targets;
  }

  /** True for a Google Search results URL (any Google ccTLD). */
  function isGoogleSearchUrl(href) {
    let u;
    try {
      u = new URL(href);
    } catch {
      return false;
    }
    return (
      /(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === "/search"
    );
  }

  /*
   * "Web results only" prevention mode.
   *
   * udm=14 selects Google's plain "Web" corpus, which never contains an AI
   * Overview — so this stops the Overview from being generated at all, rather
   * than hiding it after the fact. Returns the URL to redirect to, or null when
   * no redirect is needed:
   *   - not a Google search results page
   *   - no actual query (?q=)
   *   - a legacy vertical (?tbm=... e.g. shopping)
   *   - already pinned to a corpus (?udm=... — includes udm=14 itself)
   */
  function webOnlyRedirect(href) {
    let u;
    try {
      u = new URL(href);
    } catch {
      return null;
    }
    if (!isGoogleSearchUrl(href)) return null;
    const p = u.searchParams;
    if (!p.get("q")) return null;
    if (p.has("tbm")) return null;
    if (p.get("udm")) return null;
    p.set("udm", "14");
    u.search = p.toString();
    return u.toString();
  }

  return {
    AI_OVERVIEW_LABELS,
    AI_MODE_LABELS,
    ROOT_IDS,
    OVERVIEW_LABEL_SELECTOR,
    RESULTS_CONTAINER_SELECTOR,
    normalizeLabel,
    isAiOverviewLabel,
    isAiModeLabel,
    isGoogleSearchUrl,
    webOnlyRedirect,
    topLevelBlock,
    findHideTargets,
  };
});
