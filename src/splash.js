'use strict';

const label = document.getElementById('splashStatus');
const fill = document.getElementById('splashProgressFill');
const progress = document.getElementById('splashProgress');

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

// The main process already waits for Electron's ready-to-show event. Do not
// additionally block the splash on large artwork decoding; the page has a
// solid fallback background and the image can finish painting after display.
window.sotfSplash?.notifyVisualReady();
