'use strict';

(function initialiseCompletionBanner(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root?.document) {
    root.ProjectIslandCompletion = api;
    api.install(root.document, root.localStorage);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const STORAGE_KEY = 'project-island-achievements-complete-v1';

  function resolveCompletionState({ total, unlocked, steamResolved, persisted = false }) {
    const catalogueReady = Number.isInteger(total) && total > 0;
    const fullyResolved = catalogueReady && steamResolved === true;

    if (fullyResolved) {
      const complete = unlocked === total;
      return {
        complete,
        persist: complete,
        definitive: true
      };
    }

    return {
      complete: catalogueReady && Boolean(persisted),
      persist: Boolean(persisted),
      definitive: false
    };
  }

  function parseCount(text) {
    const match = String(text || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;
    return {
      current: Number(match[1]),
      total: Number(match[2])
    };
  }

  function readSnapshot(documentRef) {
    const achievementCount = parseCount(documentRef.querySelector('.completion-count')?.textContent);
    const steamRead = parseCount(documentRef.querySelector('[data-tour="steam-read"] .telemetry-value')?.textContent);
    if (!achievementCount || !steamRead) return null;

    return {
      total: achievementCount.total,
      unlocked: achievementCount.current,
      steamResolved: achievementCount.total > 0
        && steamRead.current === achievementCount.total
        && steamRead.total === achievementCount.total
    };
  }

  function readPersisted(storage) {
    try {
      return storage?.getItem(STORAGE_KEY) === 'complete';
    } catch (_) {
      return false;
    }
  }

  function writePersisted(storage, value) {
    try {
      if (value) storage?.setItem(STORAGE_KEY, 'complete');
      else storage?.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function ensureBanner(documentRef) {
    let banner = documentRef.getElementById('completionBanner');
    if (banner) return banner;

    banner = documentRef.createElement('section');
    banner.id = 'completionBanner';
    banner.className = 'completion-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.hidden = true;
    banner.innerHTML = `
      <span class="completion-banner__seal" aria-hidden="true">✓</span>
      <span class="completion-banner__copy">
        <span class="completion-banner__eyebrow">PROJECT ISLAND · STEAM RECORD COMPLETE</span>
        <strong class="completion-banner__title">All achievements recovered</strong>
        <span class="completion-banner__detail"></span>
      </span>
      <span class="completion-banner__status">100%</span>
    `;

    const main = documentRef.querySelector('main');
    if (main) main.prepend(banner);
    return banner;
  }

  function evaluate(documentRef, storage) {
    const banner = ensureBanner(documentRef);
    const snapshot = readSnapshot(documentRef);
    if (!snapshot) {
      banner.hidden = true;
      return null;
    }

    const persisted = readPersisted(storage);
    const state = resolveCompletionState({ ...snapshot, persisted });

    if (state.definitive) writePersisted(storage, state.persist);

    banner.hidden = !state.complete;
    banner.dataset.source = state.definitive ? 'confirmed' : 'persisted';

    const detail = banner.querySelector('.completion-banner__detail');
    if (detail) {
      detail.textContent = state.definitive
        ? `Steam confirms all ${snapshot.total} achievement states as unlocked.`
        : `Previously confirmed complete. The current Steam read is partial, so the confirmed completion state is being retained.`;
    }

    return state;
  }

  function install(documentRef, storage) {
    const start = () => {
      const summary = documentRef.getElementById('summary');
      if (!summary) return;

      ensureBanner(documentRef);
      evaluate(documentRef, storage);

      const observer = new MutationObserver(() => evaluate(documentRef, storage));
      observer.observe(summary, { childList: true, subtree: true, characterData: true });
    };

    if (documentRef.readyState === 'loading') {
      documentRef.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  return {
    STORAGE_KEY,
    resolveCompletionState,
    parseCount,
    readSnapshot,
    evaluate,
    install
  };
});
