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

// Start the large background artwork request during initial rendering so
// Electron's ready-to-show paint already has the scene available. Delaying
// this request caused a visible shell/art pop in packaged builds.
if (art?.dataset.src && !art.getAttribute('src')) {
  art.src = art.dataset.src;
}
