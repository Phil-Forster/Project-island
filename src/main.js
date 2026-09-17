'use strict';

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let splashWindow = null;
let splashFailSafe = null;
let dashboardRevealFallback = null;
let watcher = null;
let watchTimer = null;
let selectedSaveId = null;
let manualSaveRoot = null;
let cachedSteam = { result: null, fetchedAt: 0 };
let dataServices = null;
let mainCreateFallback = null;

const STEAM_CACHE_TTL_MS = 60_000;
const APP_USER_MODEL_ID = 'uk.co.philforster.sotfachievementtracker';
const APP_ICON = path.join(__dirname, '..', 'build', 'icon.png');

function getDataServices() {
  if (!dataServices) {
    const saveReader = require('./save-reader');
    const steamReader = require('./steam-reader');
    const achievementReader = require('./achievements');
    dataServices = {
      discoverSaves: saveReader.discoverSaves,
      readSave: saveReader.readSave,
      SAVE_ROOT: saveReader.SAVE_ROOT,
      fetchSteamAchievements: steamReader.fetchSteamAchievements,
      mergeAchievementState: achievementReader.mergeAchievementState
    };
  }
  return dataServices;
}

const splashReadyArg = process.argv.find((arg) => arg.startsWith('--splash-ready-file='));
const splashReadyFile = splashReadyArg ? splashReadyArg.slice('--splash-ready-file='.length).replace(/^\"|\"$/g, '') : null;
let splashReadySignalled = false;

function signalInstallerHandoffReady() {
  if (!splashReadyFile || splashReadySignalled) return;
  splashReadySignalled = true;
  try {
    fs.writeFileSync(splashReadyFile, 'ready', 'utf8');
  } catch {
    // Installer handoff is best-effort; application startup must never depend on it.
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    movable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  let mainStarted = false;
  const showSplash = () => {
    if (!splashWindow || splashWindow.isDestroyed()) return;
    splashWindow.show();
    splashWindow.focus();
    signalInstallerHandoffReady();
  };

  const startMain = () => {
    if (mainStarted) return;
    mainStarted = true;
    if (mainCreateFallback) {
      clearTimeout(mainCreateFallback);
      mainCreateFallback = null;
    }
    setImmediate(() => {
      createWindow();
      splashFailSafe = setTimeout(revealMainWindow, 20_000);
    });
  };

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    showSplash();
    // The splash shell is now paint-ready, so dashboard startup can continue
    // while the deferred background artwork finishes loading independently.
    startMain();
  });
  splashWindow.webContents.once('did-fail-load', startMain);
  // A damaged splash must never prevent the application itself from starting.
  mainCreateFallback = setTimeout(startMain, 1500);

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function updateSplashStatus(label, progress) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const value = Number.isFinite(Number(progress)) ? Math.max(0, Math.min(100, Number(progress))) : null;
  splashWindow.webContents.send('splash:status', {
    label: typeof label === 'string' ? label : '',
    progress: value
  });
}

function revealMainWindow() {
  if (splashFailSafe) {
    clearTimeout(splashFailSafe);
    splashFailSafe = null;
  }
  if (dashboardRevealFallback) {
    clearTimeout(dashboardRevealFallback);
    dashboardRevealFallback = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
}

function scheduleMainReveal(delayMs = 700) {
  if (dashboardRevealFallback) clearTimeout(dashboardRevealFallback);
  dashboardRevealFallback = setTimeout(() => {
    dashboardRevealFallback = null;
    revealMainWindow();
  }, delayMs);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0b0e0d',
    icon: fs.existsSync(APP_ICON) ? APP_ICON : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.on('close', () => {
    if (process.platform !== 'darwin') app.releaseSingleInstanceLock();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    updateSplashStatus(`Dashboard failed to load (${errorCode}): ${errorDescription}`, 100);
    scheduleMainReveal(250);
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function selectSave(discovery) {
  if (!selectedSaveId || !discovery.saves.length) return null;
  return discovery.saves.find((save) => save.key === selectedSaveId) || null;
}

async function getSteamState(force = false) {
  const now = Date.now();
  if (!force && cachedSteam.result && now - cachedSteam.fetchedAt < STEAM_CACHE_TTL_MS) {
    return cachedSteam.result;
  }
  const { fetchSteamAchievements } = getDataServices();
  const result = await fetchSteamAchievements();
  cachedSteam = { result, fetchedAt: now };
  return result;
}

function discoverAllSaves() {
  const { discoverSaves, SAVE_ROOT } = getDataServices();
  const roots = [SAVE_ROOT, manualSaveRoot].filter(Boolean);
  const discoveries = roots.map((root) => discoverSaves(root));
  const byKey = new Map();
  for (const discovery of discoveries) {
    for (const save of discovery.saves || []) byKey.set(save.key, save);
  }
  const saves = [...byKey.values()].sort((a, b) => b.modifiedMs - a.modifiedMs);
  return {
    root: SAVE_ROOT,
    roots: [...new Set(discoveries.filter((item) => item.found).map((item) => item.root))],
    found: saves.length > 0,
    steamIds: [...new Set(saves.map((save) => save.steamId).filter(Boolean))],
    saves
  };
}

async function buildDashboard({ forceSteam = false, onStatus = null } = {}) {
  const report = typeof onStatus === 'function' ? onStatus : () => {};

  report('Starting data services…', 8);
  const { readSave, SAVE_ROOT, mergeAchievementState } = getDataServices();

  report('Reading Steam achievement state…', 20);
  const steam = await getSteamState(forceSteam);

  report('Finding optional Sons of the Forest saves…', 44);
  const discovery = discoverAllSaves();
  const saveDescriptor = selectSave(discovery);
  let save = null;
  let saveError = null;
  if (saveDescriptor) {
    report('Reading selected save…', 62);
    try { save = readSave(saveDescriptor); }
    catch (error) { saveError = `Save read failed: ${error.message}`; }
  }

  report('Preparing achievement guidance…', 84);
  const achievements = mergeAchievementState(save, steam.achievements || []);
  report('Preparing dashboard…', 96);

  return {
    ok: true,
    saveRoot: SAVE_ROOT,
    discovery,
    selectedSave: save ? saveDescriptor : null,
    saveError,
    saveMeta: save ? {
      gameName: save.gameState?.GameName || saveDescriptor.id,
      saveTime: save.gameState?.SaveTime || saveDescriptor.modifiedAt,
      gameType: save.gameState?.GameType || saveDescriptor.mode,
      days: save.gameState?.GameDays ?? null,
      hours: save.gameState?.GameHours ?? null,
      minutes: save.gameState?.GameMinutes ?? null,
      fileCount: save.fileCount,
      playerStateEntries: save.playerState?.entries?.length || 0
    } : null,
    gamePath: steam.local?.gamePath || null,
    steamId: steam.steamId || null,
    personaName: steam.account?.personaName || null,
    accountMismatch: Boolean(saveDescriptor?.steamId && steam.steamId && saveDescriptor.steamId !== steam.steamId),
    steam,
    achievements
  };
}

function stopWatcher() {
  if (watchTimer) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

function startWatcher(saveRoot) {
  stopWatcher();
  if (!saveRoot || !fs.existsSync(saveRoot)) return;

  try {
    watcher = fs.watch(saveRoot, { recursive: true }, () => {
      clearTimeout(watchTimer);
      watchTimer = setTimeout(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const data = await buildDashboard();
        mainWindow.webContents.send('dashboard-updated', data);
      }, 700);
    });
  } catch {
    // Watching is optional; manual refresh remains available.
  }
}

ipcMain.handle('app:meta', () => ({ version: app.getVersion() }));

ipcMain.handle('dashboard:get', async () => {
  const data = await buildDashboard({ onStatus: updateSplashStatus });
  // Renderer ui:ready is the preferred handoff. This fallback prevents a
  // fully loaded dashboard remaining hidden if that one IPC signal is missed.
  updateSplashStatus('Rendering dashboard…', 98);
  if (data?.saveRoot) startWatcher(data.saveRoot);
  scheduleMainReveal(900);
  return data;
});
ipcMain.handle('dashboard:refresh', async () => buildDashboard({ forceSteam: true }));
ipcMain.handle('dashboard:select-save', async (_event, saveKey) => {
  selectedSaveId = typeof saveKey === 'string' && saveKey.length < 1000 && saveKey.trim() ? saveKey : null;
  const data = await buildDashboard();
  startWatcher(data.selectedSave?.folder || data.saveRoot);
  return data;
});
ipcMain.handle('save:browse', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a Sons of the Forest save folder',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };
  const candidateRoot = result.filePaths[0];
  const { discoverSaves } = getDataServices();
  const candidate = discoverSaves(candidateRoot);
  if (!candidate.saves.length) return { canceled: false, ok: false, error: 'No SaveData.zip files were found in that folder.' };
  manualSaveRoot = candidateRoot;
  selectedSaveId = candidate.saves[0].key;
  const data = await buildDashboard();
  startWatcher(data.selectedSave?.folder || data.saveRoot);
  return { canceled: false, ok: true, data };
});
ipcMain.on('ui:ready', (event) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) return;
  updateSplashStatus('Ready', 100);
  setTimeout(revealMainWindow, 180);
});

ipcMain.handle('folder:open-save-root', async () => {
  const { SAVE_ROOT } = getDataServices();
  const target = selectedSaveId ? path.dirname(selectedSaveId) : (manualSaveRoot || SAVE_ROOT);
  if (fs.existsSync(target)) {
    const result = await shell.openPath(target);
    return { ok: result === '', error: result || null };
  }
  return { ok: false, error: 'Save folder does not exist.' };
});
ipcMain.handle('folder:open-game', async () => {
  const gamePath = cachedSteam.result?.local?.gamePath;
  if (gamePath && fs.existsSync(gamePath)) {
    const result = await shell.openPath(gamePath);
    return { ok: result === '', error: result || null };
  }
  return { ok: false, error: 'Sons of the Forest installation folder is not currently available.' };
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return;
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
      splashWindow.focus();
    }
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID);
    createSplashWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
      }
    });
  });

  app.on('before-quit', () => {
    stopWatcher();
    if (splashFailSafe) clearTimeout(splashFailSafe);
    if (dashboardRevealFallback) clearTimeout(dashboardRevealFallback);
    if (mainCreateFallback) clearTimeout(mainCreateFallback);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
