'use strict';

const label = document.getElementById('splashStatus');
const fill = document.getElementById('splashProgressFill');
const progress = document.getElementById('splashProgress');
const art = document.querySelector('.splash__art');

function applyStatus(payload = {}) {
  const nextLabel = typeof payload.label === 'string' && payload.label.trim()
    ? payload.label.trim()
    : 'Starting achievement tracker…';
  const nextProgress = Number.isFinite(Number(payload.progress))
    ? Math.max(0, Math.min(100, Number(payload.progress)))
    : 0;

  label.textContent = nextLabel;
  fill.style.width = `${nextProgress}%`;
  progress.setAttribute('aria-valuenow', String(Math.round(nextProgress)));
}

applyStatus({ label: 'Starting achievement tracker…', progress: 5 });
window.sotfSplash?.onStatus(applyStatus);

async function notifyWhenArtworkIsPaintable() {
  try {
    if (art && !art.complete) {
      await new Promise((resolve) => {
        art.addEventListener('load', resolve, { once: true });
        art.addEventListener('error', resolve, { once: true });
      });
    }
    if (art?.decode) await art.decode();
  } catch {
    // The main process has its own fail-safe; a decode error must not block startup.
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.sotfSplash?.notifyVisualReady());
  });
}

notifyWhenArtworkIsPaintable();
