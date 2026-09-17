const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const project = require('./project.json');
const args = process.argv.slice(1);
const portableFile = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
const portableName = path.basename(portableFile).toLowerCase();
const explicitMode = valueOf('--mode');
const mode = explicitMode || (portableName.includes('uninstaller') ? 'uninstall' : 'install');
const isSilent = args.some((arg) => arg.toLowerCase() === '/s' || arg === '--silent');
const isFromTemp = args.includes('--from-temp');
let installDir = valueOf('--install-dir') || valueOf('_?=') || defaultInstallDir();
let mainWindow = null;
let busy = false;

function valueOf(prefix) {
  const token = prefix.endsWith('=') ? prefix : `${prefix}=`;
  const direct = args.find((arg) => arg.startsWith(token));
  if (direct) return direct.slice(token.length).replace(/^"|"$/g, '');
  if (!prefix.endsWith('=')) {
    const index = args.indexOf(prefix);
    if (index >= 0 && args[index + 1]) return args[index + 1].replace(/^"|"$/g, '');
  }
  return null;
}

function defaultInstallDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Programs', project.installFolderName);
}

function parseRegistryValue(text, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(text || '').match(new RegExp(`^\\s*${escaped}\\s+REG_\\w+\\s+(.+)$`, 'mi'));
  return match?.[1]?.trim() || null;
}

function readInstalledState() {
  const fallbackDir = defaultInstallDir();
  const fallbackApp = path.join(fallbackDir, project.appExecutableName);

  if (process.platform === 'win32') {
    const uninstallRoot = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall';
    try {
      const search = spawnSync('reg.exe', ['query', uninstallRoot, '/s', '/f', project.installFolderName], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 3000,
      });
      if (!search.error && search.status === 0) {
        const keys = [...new Set(
          String(search.stdout || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => /^HKEY_CURRENT_USER\\/i.test(line))
        )];
        for (const key of keys) {
          const query = spawnSync('reg.exe', ['query', key], {
            encoding: 'utf8',
            windowsHide: true,
            timeout: 1500,
          });
          if (query.error || query.status !== 0) continue;
          const displayName = parseRegistryValue(query.stdout, 'DisplayName');
          if (!displayName || displayName.toLowerCase() !== project.installFolderName.toLowerCase()) continue;
          const registeredDir = parseRegistryValue(query.stdout, 'InstallLocation') || fallbackDir;
          const appPath = path.join(registeredDir, project.appExecutableName);
          if (!fs.existsSync(appPath)) continue;
          return {
            installed: true,
            installedVersion: parseRegistryValue(query.stdout, 'DisplayVersion'),
            installDir: registeredDir,
            source: 'uninstall-registry',
          };
        }
      }
    } catch {
      // Fall back to the standard current-user installation directory.
    }
  }

  const installed = fs.existsSync(fallbackApp);
  return {
    installed,
    installedVersion: null,
    installDir: fallbackDir,
    source: installed ? 'filesystem' : null,
  };
}

function isPerUserPath(candidate) {
  if (process.platform !== 'win32') return true;
  const resolved = path.resolve(candidate).toLowerCase();
  const roots = [
    process.env.USERPROFILE || os.homedir(),
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
  ].map((value) => path.resolve(value).toLowerCase());
  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function emitPhase(label, progress) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('deployment:phase', { label, progress });
}

function hiddenProcess(executable, rawArgs) {
  return new Promise((resolve) => {
    const child = spawn(executable, rawArgs, {
      windowsHide: true,
      stdio: 'ignore',
    });
    child.on('error', (error) => resolve({ ok: false, code: -1, message: error.message }));
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, code: 0 });
      else resolve({ ok: false, code, message: `Deployment engine exited with code ${code}.` });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 640,
    minWidth: 820,
    minHeight: 560,
    show: false,
    frame: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#0c100f',
    icon: path.join(__dirname, 'assets', 'badge.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (event) => {
    if (busy) event.preventDefault();
  });
}

async function transferUninstallerToTempIfNeeded() {
  if (mode !== 'uninstall' || isSilent || isFromTemp) return false;
  if (!process.env.PORTABLE_EXECUTABLE_FILE) return false;
  try {
    const tempExe = path.join(os.tmpdir(), `${project.projectSlug}-uninstaller-${Date.now()}.exe`);
    fs.copyFileSync(portableFile, tempExe);
    const child = spawn(tempExe, [`--mode=uninstall`, '--from-temp', `--install-dir=${installDir}`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function rawUninstallArgs() {
  const forwarded = [];
  const lower = args.map((arg) => arg.toLowerCase());
  if (lower.includes('--updated')) forwarded.push('--updated');
  if (lower.includes('--keep-shortcuts')) forwarded.push('--keep-shortcuts');
  forwarded.push('/S', '/KEEP_APP_DATA', '/currentuser');
  forwarded.push(`_?=${installDir}`);
  return forwarded;
}

async function runUninstallEngine() {
  const raw = path.join(installDir, project.rawUninstallerName);
  if (!fs.existsSync(raw)) return { ok: false, code: 2, message: `Deployment engine not found: ${raw}` };
  return hiddenProcess(raw, rawUninstallArgs());
}

async function runSilentUninstall() {
  const result = await runUninstallEngine();
  process.exitCode = result.ok ? 0 : (result.code || 1);
}

function schedulePortableCleanup() {
  if (!isFromTemp || !process.env.PORTABLE_EXECUTABLE_FILE) return;
  const target = process.env.PORTABLE_EXECUTABLE_FILE;
  try {
    const escaped = String(target).replace(/'/g, "''");
    const command = `Start-Sleep -Milliseconds 1200; Remove-Item -LiteralPath '${escaped}' -Force -ErrorAction SilentlyContinue`;
    const encoded = Buffer.from(command, 'utf16le').toString('base64');
    spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
  } catch {}
}

function availableRoots() {
  if (process.platform !== 'win32') return ['/'];
  const roots = [];
  for (let code = 65; code <= 90; code += 1) {
    const root = `${String.fromCharCode(code)}:\\`;
    try {
      if (fs.existsSync(root)) roots.push(root);
    } catch {}
  }
  return roots;
}

function listDirectories(requestedPath) {
  if (!requestedPath) {
    return { ok: true, current: '', parent: null, roots: availableRoots(), entries: [] };
  }
  try {
    let resolved = path.resolve(requestedPath);
    while (!fs.existsSync(resolved)) {
      const parent = path.dirname(resolved);
      if (parent === resolved) break;
      resolved = parent;
    }
    const entries = fs.readdirSync(resolved, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== '.' && name !== '..')
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const parent = path.dirname(resolved);
    return { ok: true, current: resolved, parent: parent === resolved ? null : parent, roots: [], entries };
  } catch (error) {
    return { ok: false, current: requestedPath, parent: null, roots: availableRoots(), entries: [], message: error.message };
  }
}

ipcMain.handle('deployment:get-context', () => {
  const installedState = readInstalledState();
  if (mode === 'install' && !valueOf('--install-dir') && installedState.installed) installDir = installedState.installDir;
  return { project, mode, version: project.version, installDir, ...installedState };
});
ipcMain.handle('deployment:list-directory', (_event, requestedPath) => listDirectories(requestedPath));
ipcMain.handle('deployment:install', async (_event, requestedDir) => {
  if (busy) return { ok: false, code: 16, message: 'A deployment operation is already running.' };
  const updating = readInstalledState().installed;
  busy = true;
  installDir = requestedDir || installDir;
  if (!isPerUserPath(installDir)) {
    busy = false;
    return { ok: false, code: 13, message: 'Choose an installation folder inside your Windows user profile.' };
  }
  try {
    const worker = path.join(process.resourcesPath, 'engine', 'deployment-engine.exe');
    if (!fs.existsSync(worker)) return { ok: false, code: 2, message: `Deployment engine not found: ${worker}` };
    emitPhase(updating ? 'Updating for the current Windows user' : 'Installing for the current Windows user', 12);
    const result = await hiddenProcess(worker, ['/S', '/currentuser', `/D=${installDir}`]);
    if (!result.ok) return result;
    emitPhase('Verifying installed application', 92);
    const appPath = path.join(installDir, project.appExecutableName);
    if (!fs.existsSync(appPath)) return { ok: false, code: 3, message: `Installation finished but the application executable was not found at ${appPath}.` };
    emitPhase(updating ? 'Update complete' : 'Installation complete', 100);
    return { ok: true, installDir, updated: updating };
  } finally {
    busy = false;
  }
});
ipcMain.handle('deployment:uninstall', async () => {
  if (busy) return { ok: false, code: 16, message: 'A deployment operation is already running.' };
  busy = true;
  try {
    emitPhase('Removing for the current Windows user', 12);
    const result = await runUninstallEngine();
    if (result.ok) emitPhase('Removal complete', 100);
    return result;
  } finally {
    busy = false;
  }
});
ipcMain.handle('deployment:launch', async () => {
  const target = path.join(installDir, project.appExecutableName);
  if (!fs.existsSync(target)) return { ok: false, message: `Installed application not found: ${target}` };
  const readyFile = path.join(os.tmpdir(), `${project.projectSlug}-splash-ready-${process.pid}-${Date.now()}.signal`);
  try { fs.rmSync(readyFile, { force: true }); } catch {}
  try {
    const child = spawn(target, [`--splash-ready-file=${readyFile}`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      cwd: installDir,
    });
    child.unref();
  } catch (error) {
    return { ok: false, message: error.message };
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (fs.existsSync(readyFile)) {
      try { fs.rmSync(readyFile, { force: true }); } catch {}
      return { ok: true, splashReady: true };
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  try { fs.rmSync(readyFile, { force: true }); } catch {}
  return { ok: true, splashReady: false };
});
ipcMain.handle('deployment:close', () => {
  schedulePortableCleanup();
  app.quit();
  return true;
});

app.whenReady().then(async () => {
  if (mode === 'uninstall' && isSilent) {
    await runSilentUninstall();
    schedulePortableCleanup();
    app.quit();
    return;
  }
  if (await transferUninstallerToTempIfNeeded()) {
    app.quit();
    return;
  }
  createWindow();
});

app.on('window-all-closed', () => {
  schedulePortableCleanup();
  app.quit();
});
