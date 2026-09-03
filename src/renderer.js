'use strict';

const elements = {
  sourceHeading: document.getElementById('source-heading'),
  sourcePath: document.getElementById('sourcePath'),
  savePicker: document.getElementById('savePicker'),
  saveMeta: document.getElementById('saveMeta'),
  summary: document.getElementById('summary'),
  achievementGrid: document.getElementById('achievementGrid'),
  template: document.getElementById('achievementTemplate'),
  notice: document.getElementById('notice'),
  refresh: document.getElementById('refresh'),
  openSaveRoot: document.getElementById('openSaveRoot'),
  openGameFolder: document.getElementById('openGameFolder'),
  browseSaveFolder: document.getElementById('browseSaveFolder'),
  search: document.getElementById('search'),
  filters: [...document.querySelectorAll('.filter')],
  tourHelp: document.getElementById('tourHelp'),
  tourOverlay: document.getElementById('tourOverlay'),
  tourCoach: document.getElementById('tourCoach'),
  tourStepCount: document.getElementById('tourStepCount'),
  tourTitle: document.getElementById('tourTitle'),
  tourText: document.getElementById('tourText'),
  tourSkip: document.getElementById('tourSkip'),
  tourBack: document.getElementById('tourBack'),
  tourNext: document.getElementById('tourNext')
};

let activeFilter = 'all';
let initialReadySignalled = false;

const CARD_ART = Array.from({ length: 6 }, (_, index) =>
  `assets/card-art-full/sotf-full-${String(index + 1).padStart(2, '0')}.webp`
);
const cardArtReady = Promise.all(CARD_ART.map((src) => {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  if (image.decode) return image.decode().catch(() => undefined);
  return new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
})).then(() => undefined);

const TOUR_STORAGE_KEY = 'sotf-achievement-tracker-tour-v2';
let tourIndex = -1;
let tourTarget = null;
let tourPreviousFocus = null;
let tourOpenedHead = null;
let tourAutoChecked = false;

const tourSteps = [
  {
    title: 'Steam stays primary',
    text: 'The signed-in Steam account supplies achievement state and playtime. A save is optional and never replaces Steam.',
    target: () => document.querySelector('.status-panel')
  },
  {
    title: 'Optional save evidence',
    text: 'Use Steam only, choose an automatically discovered save, or browse to another save folder for additional context.',
    target: () => document.querySelector('.save-source')
  },
  {
    title: 'Steam data',
    text: 'Steam read, playtime and numeric UserStats are presented independently from the selected save.',
    target: () => document.querySelector('[data-tour="steam-read"]')
  },
  {
    title: 'Filter the achievement list',
    text: 'Use the state filters or search box to narrow the list without changing any achievement data.',
    target: () => document.querySelector('.toolbar')
  },
  {
    title: 'Open an achievement',
    text: 'Each card separates Steam result, numeric progress, selected-save evidence and requirements/guidance.',
    target: () => firstTourAchievementCard(),
    prepare: () => expandTourAchievement()
  }
];

function escapeText(value) {
  return value == null ? '' : String(value);
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(date);
}

function formatUnlockDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
  return `${datePart} at ${timePart}`;
}

function formatPlaytime(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return 'Unavailable';
  if (value < 60) return `${Math.round(value)} min`;
  return `${(value / 60).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hours`;
}

function stateLabel(item) {
  switch (item.state) {
    case 'unlocked': return 'Unlocked';
    case 'locked': return 'Locked';
    default: return 'Unknown';
  }
}

function renderSavePicker(data) {
  const selected = data.selectedSave;
  elements.savePicker.innerHTML = '';

  const steamOnly = document.createElement('option');
  steamOnly.value = '';
  steamOnly.textContent = 'Steam only';
  elements.savePicker.append(steamOnly);

  for (const save of data.discovery?.saves || []) {
    const key = save.key;
    const option = document.createElement('option');
    option.value = key;
    option.selected = selected && key === selected.key;
    option.textContent = `${save.mode} · ${save.id} · ${formatDate(save.modifiedAt)}`;
    elements.savePicker.append(option);
  }
  elements.savePicker.value = selected?.key || '';
  elements.saveMeta.textContent = selected
    ? `${selected.mode} · ${formatDate(data.saveMeta?.saveTime || selected.modifiedAt)} · Steam remains authoritative.`
    : data.discovery?.saves?.length
      ? `${data.discovery.saves.length} saves found. Steam only is active.`
      : 'No saves found. Steam remains the achievement authority.';
  elements.openSaveRoot.disabled = !(selected || data.discovery?.roots?.length);
}

function renderSummary(data) {
  const achievements = data.achievements || [];
  const total = achievements.length;
  const unlocked = achievements.filter((item) => item.state === 'unlocked').length;
  const locked = achievements.filter((item) => item.state === 'locked').length;
  const unknown = achievements.filter((item) => item.state === 'unknown').length;

  const cards = [
    ['Achievements', `${unlocked} / ${total}`],
    ['Locked', locked],
    ['Unknown', unknown],
    ['Steam playtime', formatPlaytime(data.steam?.playtime?.minutes)],
    ['Save context', data.selectedSave ? data.selectedSave.mode : 'Steam only'],
    ['Save time', data.saveMeta?.days == null ? '—' : `Day ${data.saveMeta.days} · ${String(data.saveMeta.hours ?? 0).padStart(2, '0')}:${String(data.saveMeta.minutes ?? 0).padStart(2, '0')}`],
    ['Steam read', `${data.steam?.count || 0}/${total} · ${data.steam?.source === 'steam-local-api' ? 'Local API' : data.steam?.source === 'steam-community' ? 'Community' : 'Unresolved'}`],
    ['Steam stats', data.steam?.source === 'steam-local-api' ? `${data.steam?.statsCount || 0} counters` : '—']
  ];

  elements.summary.innerHTML = '';
  for (const [label, value] of cards) {
    const card = document.createElement('div');
    card.className = 'summary-card';
    if (label === 'Steam read') card.dataset.tour = 'steam-read';
    if (label === 'Steam stats') card.dataset.tour = 'steam-stats';
    const labelEl = document.createElement('span');
    labelEl.className = 'summary-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = `summary-value${String(value).length > 16 ? ' small' : ''}`;
    valueEl.textContent = value;
    card.append(labelEl, valueEl);
    elements.summary.append(card);
  }
}

function renderSubstates(container, substates) {
  container.innerHTML = '';
  container.hidden = !substates?.length;
  if (!substates?.length) return;

  for (const item of substates) {
    const row = document.createElement('div');
    row.className = 'substate';
    const label = document.createElement('span');
    label.className = 'substate-label';
    label.textContent = escapeText(item.label);
    const value = document.createElement('span');
    value.className = 'substate-value';
    value.textContent = item.value === true ? 'Yes' : item.value === false ? 'No' : escapeText(item.value ?? item.state);
    row.append(label, value);
    container.append(row);
  }
}

function renderAchievements(data) {
  elements.achievementGrid.innerHTML = '';

  for (const [index, item] of (data.achievements || []).entries()) {
    const node = elements.template.content.cloneNode(true);
    const card = node.querySelector('.achievement-card');
    const head = node.querySelector('.achievement-head');
    const body = node.querySelector('.achievement-body');
    const icon = node.querySelector('.achievement-icon');
    const iconFallback = node.querySelector('.achievement-icon-fallback');
    const name = node.querySelector('.achievement-name');
    const description = node.querySelector('.achievement-description');
    const state = node.querySelector('.state-label');
    const steamResultSummary = node.querySelector('.steam-result-summary');
    const evidenceSummary = node.querySelector('.evidence-summary');
    const unlockRow = node.querySelector('.unlock-row');
    const steamSourceText = node.querySelector('.steam-source-text');
    const saveSourceText = node.querySelector('.save-source-text');
    const numericEmpty = node.querySelector('.numeric-empty');
    const saveProgress = node.querySelector('.save-progress');
    const categoryBadge = node.querySelector('.category-badge');
    const guidanceText = node.querySelector('.guidance-text');
    const substates = node.querySelector('.substates');
    const progressWrap = node.querySelector('.progress-wrap');
    const progressText = node.querySelector('.progress-text');
    const progressPercent = node.querySelector('.progress-percent');
    const progressBar = node.querySelector('.progress-bar');
    const progressTrack = node.querySelector('.progress-track');

    card.dataset.state = item.state;
    card.dataset.name = item.name.toLowerCase();
    card.style.setProperty('--card-art', `url("${CARD_ART[index % CARD_ART.length]}")`);
    const bodyId = `achievement-body-${index}`;
    body.id = bodyId;
    head.setAttribute('aria-controls', bodyId);
    if (item.iconUrl) {
      icon.src = item.iconUrl;
      icon.hidden = false;
      iconFallback.hidden = true;
      icon.addEventListener('error', () => {
        icon.hidden = true;
        iconFallback.hidden = false;
      }, { once: true });
    }

    name.textContent = item.name;
    description.textContent = item.description || (item.evidence?.summary || 'No Steam description returned');
    state.textContent = stateLabel(item);

    const steamProgress = item.displayProgress?.kind === 'save-guide' ? null : item.displayProgress;
    if (steamProgress) {
      const current = Number(steamProgress.current || 0);
      const target = Number(steamProgress.target || 0);
      const percent = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
      progressWrap.hidden = false;
      progressText.textContent = steamProgress.text || `${current} / ${target}`;
      progressPercent.textContent = `${Math.round(percent)}%`;
      progressBar.style.width = `${percent}%`;
      progressTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
      progressTrack.setAttribute('aria-valuemax', '100');
      progressTrack.setAttribute('aria-label', `${item.name} progress`);
      numericEmpty.hidden = true;
    } else numericEmpty.textContent = item.targetInfo
      ? `Steam defines a ${Number(item.targetInfo.target).toLocaleString('en-GB')} ${item.targetInfo.unit} target, but no current counter was returned.`
      : 'No trustworthy intermediate numeric counter is defined for this achievement.';

    const steamStateText = typeof item.steam?.unlocked === 'boolean'
      ? `Steam state: ${item.steam.unlocked ? 'Unlocked' : 'Locked'}.`
      : 'Steam state could not be resolved.';
    steamResultSummary.textContent = steamStateText;

    if (item.state === 'unlocked') {
      const formattedUnlock = formatUnlockDate(item.unlockedAt);
      unlockRow.hidden = false;
      unlockRow.textContent = formattedUnlock
        ? formattedUnlock
        : 'Steam did not return an unlock timestamp for this achievement.';
    }

    const steamSource = item.steam?.stateSource === 'steam-local-api'
      ? 'Steam local UserStats API'
      : item.steam?.stateSource === 'steam-community'
        ? 'Steam Community achievement state'
        : 'Steam state unresolved';
    const steamCounterSource = item.steam?.progress?.statName
      ? ` · counter: ${item.steam.progress.statName}`
      : '';
    steamSourceText.textContent = `${steamSource}${steamCounterSource}`;

    if (!data.selectedSave) {
      evidenceSummary.textContent = 'No save selected. Steam remains the only active achievement source.';
      saveSourceText.textContent = 'Steam only';
      renderSubstates(substates, []);
    } else {
      evidenceSummary.textContent = item.evidence?.summary || 'No verified selected-save field is mapped for this achievement.';
      saveSourceText.textContent = item.evidence?.source || 'Selected save checked; no mapped evidence';
      if (item.evidence?.progress) {
        const current = Number(item.evidence.progress.current || 0);
        const target = Number(item.evidence.progress.target || 0);
        saveProgress.hidden = false;
        saveProgress.textContent = `${current.toLocaleString('en-GB')} / ${target.toLocaleString('en-GB')} ${item.evidence.progress.unit || ''}`.trim();
      }
      renderSubstates(substates, item.evidence?.substates || []);
    }
    categoryBadge.textContent = item.category || 'Achievement';
    guidanceText.textContent = item.guidance || item.description;

    head.addEventListener('click', () => {
      const expanded = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', String(!expanded));
      body.hidden = expanded;
    });

    elements.achievementGrid.append(node);
  }

  applyFilters();
}

function applyFilters() {
  const term = elements.search.value.trim().toLowerCase();
  for (const card of elements.achievementGrid.querySelectorAll('.achievement-card')) {
    const state = card.dataset.state;
    const stateMatch = activeFilter === 'all'
      || (activeFilter === 'unlocked' && state === 'unlocked')
      || (activeFilter === 'locked' && state === 'locked')
      || (activeFilter === 'unknown' && state === 'unknown');
    const textMatch = !term || card.textContent.toLowerCase().includes(term);
    card.hidden = !(stateMatch && textMatch);
  }
}

function showNotice(message) {
  elements.notice.hidden = !message;
  elements.notice.textContent = message || '';
}


function firstTourAchievementCard() {
  return elements.achievementGrid.querySelector('.achievement-card:not([hidden])')
    || elements.achievementGrid.querySelector('.achievement-card');
}

function expandTourAchievement() {
  const card = firstTourAchievementCard();
  if (!card) return;
  const head = card.querySelector('.achievement-head');
  const body = card.querySelector('.achievement-body');
  if (!head || !body) return;

  if (head.getAttribute('aria-expanded') !== 'true') {
    head.setAttribute('aria-expanded', 'true');
    body.hidden = false;
    tourOpenedHead = head;
  }
}

function restoreTourAchievement() {
  if (!tourOpenedHead) return;
  const bodyId = tourOpenedHead.getAttribute('aria-controls');
  const body = bodyId ? document.getElementById(bodyId) : null;
  tourOpenedHead.setAttribute('aria-expanded', 'false');
  if (body) body.hidden = true;
  tourOpenedHead = null;
}

function clearTourTarget() {
  if (!tourTarget) return;
  tourTarget.classList.remove('tour-focus');
  tourTarget = null;
}

function positionTourCoach() {
  if (tourIndex < 0 || !tourTarget || elements.tourCoach.hidden) return;

  const rect = tourTarget.getBoundingClientRect();
  const coach = elements.tourCoach;
  const margin = 18;
  const gap = 14;
  const coachWidth = coach.offsetWidth;
  const coachHeight = coach.offsetHeight;

  let left = rect.left + (rect.width - coachWidth) / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - coachWidth - margin));

  let top = rect.bottom + gap;
  if (top + coachHeight > window.innerHeight - margin) {
    top = rect.top - coachHeight - gap;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - coachHeight - margin));

  coach.style.left = `${Math.round(left)}px`;
  coach.style.top = `${Math.round(top)}px`;
}

function showTourStep(index) {
  if (index < 0 || index >= tourSteps.length) {
    endTour({ completed: true });
    return;
  }

  clearTourTarget();
  tourIndex = index;
  const step = tourSteps[index];
  if (typeof step.prepare === 'function') step.prepare();

  const target = step.target();
  if (!target) {
    showTourStep(index + 1);
    return;
  }

  tourTarget = target;
  tourTarget.classList.add('tour-focus');
  tourTarget.scrollIntoView({ block: 'center', inline: 'nearest' });

  elements.tourStepCount.textContent = `${index + 1} of ${tourSteps.length}`;
  elements.tourTitle.textContent = step.title;
  elements.tourText.textContent = step.text;
  elements.tourBack.disabled = index === 0;
  elements.tourNext.textContent = index === tourSteps.length - 1 ? 'Finish' : 'Next';
  elements.tourOverlay.hidden = false;
  elements.tourCoach.hidden = false;

  requestAnimationFrame(() => {
    positionTourCoach();
    elements.tourNext.focus();
  });
}

function startTour({ replay = false } = {}) {
  if (tourIndex >= 0 || !elements.achievementGrid.children.length) return;
  tourPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (!replay) tourAutoChecked = true;
  showTourStep(0);
}

function endTour({ completed = false } = {}) {
  clearTourTarget();
  restoreTourAchievement();
  elements.tourOverlay.hidden = true;
  elements.tourCoach.hidden = true;
  elements.tourCoach.style.left = '';
  elements.tourCoach.style.top = '';
  tourIndex = -1;

  if (completed) {
    try { window.localStorage.setItem(TOUR_STORAGE_KEY, 'complete'); } catch (_) {}
  }

  if (tourPreviousFocus && document.contains(tourPreviousFocus)) {
    tourPreviousFocus.focus();
  }
  tourPreviousFocus = null;
}

function maybeStartFirstRunTour() {
  if (tourAutoChecked || tourIndex >= 0 || !elements.achievementGrid.children.length) return;
  tourAutoChecked = true;
  let completed = false;
  try { completed = window.localStorage.getItem(TOUR_STORAGE_KEY) === 'complete'; } catch (_) {}
  if (!completed) startTour();
}

function render(data) {
  if (!data?.ok) {
    elements.sourceHeading.textContent = 'Steam unavailable';
    elements.sourcePath.textContent = data?.gamePath || '';
    showNotice(data?.error || 'Unable to read Sons of the Forest data.');
    elements.summary.innerHTML = '';
    elements.achievementGrid.innerHTML = '';
    return;
  }

  elements.sourceHeading.textContent = data.personaName ? `Steam primary · ${data.personaName}` : 'Steam primary · Sons of the Forest';
  elements.sourcePath.textContent = data.gamePath || 'Sons of the Forest installation was not found locally.';
  renderSavePicker(data);
  renderSummary(data);
  renderAchievements(data);
  if (tourIndex >= 0) showTourStep(tourIndex);
  else maybeStartFirstRunTour();

  const total = data.achievements?.length || 0;
  const notices = [];
  if (!data.steam?.ok || data.steam?.count !== total) notices.push(`${data.steam?.error || `Steam resolved ${data.steam?.count || 0} of ${total} achievement states.`} The tracker will not infer missing Steam achievement states from the save.`);
  else if (data.steam?.source === 'steam-local-api' && Number(data.steam?.statsCount || 0) === 0) notices.push(`All ${total} Steam achievement states resolved, but no local Steam stat counters were discovered. Achievement states remain correct; cumulative sub-counts may be unavailable until the local UserStats schema is resolved.`);
  if (data.accountMismatch) notices.push('The selected save belongs to a different Steam ID from the currently logged-in Steam account. Save evidence is shown as context only.');
  if (data.saveError) notices.push(data.saveError);
  showNotice(notices.join(' ') || null);
}

async function load({ refresh = false } = {}) {
  elements.refresh.disabled = true;
  elements.refresh.textContent = 'Reading…';
  try {
    const dashboardRequest = refresh ? window.sotf.refreshDashboard() : window.sotf.getDashboard();
    const [data] = await Promise.all([dashboardRequest, cardArtReady]);
    render(data);
  } catch (error) {
    showNotice(`Unable to refresh the tracker: ${error?.message || error}`);
  } finally {
    elements.refresh.disabled = false;
    elements.refresh.textContent = 'Refresh';
    if (!initialReadySignalled) {
      initialReadySignalled = true;
      window.sotf.notifyReady();
    }
  }
}

elements.refresh.addEventListener('click', () => load({ refresh: true }));
elements.tourHelp.addEventListener('click', () => startTour({ replay: true }));
elements.tourSkip.addEventListener('click', () => endTour({ completed: true }));
elements.tourBack.addEventListener('click', () => showTourStep(tourIndex - 1));
elements.tourNext.addEventListener('click', () => {
  if (tourIndex === tourSteps.length - 1) endTour({ completed: true });
  else showTourStep(tourIndex + 1);
});
window.addEventListener('resize', positionTourCoach);
window.addEventListener('keydown', (event) => {
  if (tourIndex < 0) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    endTour({ completed: true });
  }
});
elements.openSaveRoot.addEventListener('click', async () => {
  try {
    const result = await window.sotf.openSaveRoot();
    if (!result?.ok) showNotice(result?.error || 'Unable to open the save folder.');
  } catch (error) {
    showNotice(`Unable to open the save folder: ${error?.message || error}`);
  }
});
elements.openGameFolder.addEventListener('click', async () => {
  try {
    const result = await window.sotf.openGameFolder();
    if (!result?.ok) showNotice(result?.error || 'Unable to open the game folder.');
  } catch (error) {
    showNotice(`Unable to open the game folder: ${error?.message || error}`);
  }
});
elements.browseSaveFolder.addEventListener('click', async () => {
  elements.browseSaveFolder.disabled = true;
  try {
    const result = await window.sotf.browseSaveFolder();
    if (result?.ok && result.data) render(result.data);
    else if (!result?.canceled) showNotice(result?.error || 'No Sons of the Forest saves were found in that folder.');
  } catch (error) {
    showNotice(`Unable to browse for saves: ${error?.message || error}`);
  } finally {
    elements.browseSaveFolder.disabled = false;
  }
});
elements.savePicker.addEventListener('change', async () => {
  try {
    render(await window.sotf.selectSave(elements.savePicker.value));
  } catch (error) {
    showNotice(`Unable to switch saves: ${error?.message || error}`);
  }
});
elements.search.addEventListener('input', applyFilters);
for (const button of elements.filters) {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    elements.filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    applyFilters();
  });
}

window.sotf.onDashboardUpdated((data) => render(data));
load();
