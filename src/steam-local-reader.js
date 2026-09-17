'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readAchievementStatMap } = require('./steam-schema-reader');

const APP_ID = '1326470';

function resolveBundledFile(filename) {
  const sourcePath = path.join(__dirname, filename);
  const asarSegment = `${path.sep}app.asar${path.sep}`;
  if (!sourcePath.includes(asarSegment)) return sourcePath;
  return sourcePath.replace(asarSegment, `${path.sep}app.asar.unpacked${path.sep}`);
}

function uniqueExisting(paths) {
  const seen = new Set();
  return paths.filter((value) => {
    if (!value) return false;
    const normalized = path.normalize(value);
    const key = normalized.toLowerCase();
    if (seen.has(key) || !fs.existsSync(normalized)) return false;
    seen.add(key);
    return true;
  });
}

function registrySteamRoots() {
  if (process.platform !== 'win32') return [];
  const queries = [
    ['HKCU\\Software\\Valve\\Steam', 'SteamPath'],
    ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'],
    ['HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath']
  ];
  const roots = [];
  for (const [key, value] of queries) {
    try {
      const result = spawnSync('reg.exe', ['query', key, '/v', value], { encoding: 'utf8', windowsHide: true, timeout: 2500 });
      if (result.status !== 0) continue;
      const match = result.stdout.match(new RegExp(`${value}\\s+REG_\\w+\\s+(.+)$`, 'mi'));
      if (match?.[1]) roots.push(match[1].trim().replace(/\//g, '\\'));
    } catch {
      // Registry lookup is only one discovery route.
    }
  }
  return roots;
}

function libraryRootsFromVdf(steamRoot) {
  const file = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
  if (!fs.existsSync(file)) return [];
  try {
    const text = fs.readFileSync(file, 'utf8');
    const roots = [];
    for (const match of text.matchAll(/"path"\s+"([^"]+)"/gi)) {
      roots.push(match[1].replace(/\\\\/g, '\\'));
    }
    return roots;
  } catch {
    return [];
  }
}

function installDirFromManifest(libraryRoot) {
  const manifest = path.join(libraryRoot, 'steamapps', `appmanifest_${APP_ID}.acf`);
  if (!fs.existsSync(manifest)) return null;
  try {
    const text = fs.readFileSync(manifest, 'utf8');
    const match = text.match(/"installdir"\s+"([^"]+)"/i);
    if (!match?.[1]) return null;
    return path.join(libraryRoot, 'steamapps', 'common', match[1]);
  } catch {
    return null;
  }
}


function locateStatsSchema(steamRoot) {
  if (!steamRoot) return null;
  const statsDir = path.join(steamRoot, 'appcache', 'stats');
  if (!fs.existsSync(statsDir)) return null;

  const exact = path.join(statsDir, `UserGameStatsSchema_${APP_ID}.bin`);
  if (fs.existsSync(exact)) return exact;

  try {
    const candidates = fs.readdirSync(statsDir)
      .filter((name) => name.includes(APP_ID) && /schema/i.test(name) && /\.bin$/i.test(name))
      .map((name) => path.join(statsDir, name));
    return candidates.find((file) => fs.existsSync(file)) || null;
  } catch {
    return null;
  }
}

function locateSteamApiDll(gamePath) {
  if (!gamePath || !fs.existsSync(gamePath)) return null;

  const direct = [
    path.join(gamePath, 'steam_api64.dll'),
    path.join(gamePath, 'SonsOfTheForest_Data', 'Plugins', 'x86_64', 'steam_api64.dll'),
    path.join(gamePath, 'SonsOfTheForest_Data', 'Plugins', 'steam_api64.dll'),
    path.join(gamePath, 'SonsOfTheForest_Data', 'Plugins', 'x86', 'steam_api64.dll')
  ];
  const exact = uniqueExisting(direct)[0];
  if (exact) return exact;

  // Unity/Steam packaging can move the redistributable between plugin folders.
  // Search only inside the detected game directory and stop at a shallow depth.
  const queue = [{ dir: gamePath, depth: 0 }];
  const maxDepth = 5;
  const maxDirectories = 5000;
  let visited = 0;

  while (queue.length && visited < maxDirectories) {
    const { dir, depth } = queue.shift();
    visited += 1;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === 'steam_api64.dll') return full;
      if (!entry.isDirectory() || depth >= maxDepth) continue;
      // Avoid branches that can be very large and cannot contain the runtime DLL we need.
      if (/^(logs?|screenshots?|crash|cache|temp)$/i.test(entry.name)) continue;
      queue.push({ dir: full, depth: depth + 1 });
    }
  }

  return null;
}

function discoverGamePath() {
  const explicit = process.env.SOTF_GAME_PATH;
  const registryRoots = registrySteamRoots();
  const steamRoots = uniqueExisting(registryRoots);

  // Steam itself is the source of truth for installation discovery. We do not
  // sweep drive letters or assume a particular SteamLibrary path. The primary
  // Steam install comes from the Windows registry and secondary libraries come
  // from Steam's own libraryfolders.vdf.
  const libraries = uniqueExisting([
    ...steamRoots,
    ...steamRoots.flatMap(libraryRootsFromVdf)
  ]);

  const gameCandidates = [];
  if (explicit) gameCandidates.push(explicit);

  for (const root of libraries) {
    // Steam's manifest is authoritative and also handles non-default install folder names.
    const manifestPath = installDirFromManifest(root);
    if (manifestPath) gameCandidates.push(manifestPath);

  }

  const existingGames = uniqueExisting(gameCandidates);
  for (const gamePath of existingGames) {
    const dllPath = locateSteamApiDll(gamePath);
    if (dllPath) {
      const steamRoot = steamRoots[0] || null;
      const schemaPath = locateStatsSchema(steamRoot);
      return {
        ok: true,
        gamePath,
        dllPath,
        steamRoot,
        schemaPath,
        libraries,
        discovery: fs.existsSync(path.join(path.dirname(path.dirname(gamePath)), `appmanifest_${APP_ID}.acf`))
          ? 'steam-appmanifest'
          : 'filesystem'
      };
    }
  }

  if (existingGames.length > 0) {
    return {
      ok: false,
      gamePath: existingGames[0],
      dllPath: null,
      libraries,
      error: `Sons Of The Forest was found at ${existingGames[0]}, but steam_api64.dll was not found inside the game directory.`
    };
  }

  return {
    ok: false,
    gamePath: null,
    dllPath: null,
    libraries,
    error: steamRoots.length === 0
      ? 'Steam installation could not be resolved from the Windows registry.'
      : `Steam was found, but appmanifest_${APP_ID}.acf was not present in any library declared by Steam.`
  };
}

function discoverSteamAccount() {
  for (const steamRoot of uniqueExisting(registrySteamRoots())) {
    const loginUsers = path.join(steamRoot, 'config', 'loginusers.vdf');
    if (!fs.existsSync(loginUsers)) continue;
    try {
      const text = fs.readFileSync(loginUsers, 'utf8');
      const blocks = [...text.matchAll(/"(\d{10,20})"\s*\{([\s\S]*?)\n\s*\}/g)];
      const users = blocks.map((match) => ({
        steamId: match[1],
        accountName: match[2].match(/"AccountName"\s+"([^"]*)"/i)?.[1] || null,
        personaName: match[2].match(/"PersonaName"\s+"([^"]*)"/i)?.[1] || null,
        mostRecent: match[2].match(/"MostRecent"\s+"1"/i) != null,
        timestamp: Number(match[2].match(/"Timestamp"\s+"(\d+)"/i)?.[1] || 0)
      })).sort((left, right) => Number(right.mostRecent) - Number(left.mostRecent) || right.timestamp - left.timestamp);
      if (users[0]) return { ok: true, steamRoot, ...users[0] };
    } catch {
      // Continue to the next registry-discovered Steam root.
    }
  }
  return { ok: false, steamId: null, error: 'The most recent Steam account could not be resolved from loginusers.vdf.' };
}

function extractVdfObject(text, key) {
  const match = new RegExp(`"${String(key)}"\\s*\\{`, 'i').exec(text);
  if (!match) return null;
  const open = text.indexOf('{', match.index);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return text.slice(open + 1, index);
  }
  return null;
}

function readLocalPlaytime(account, appId = APP_ID) {
  if (!account?.steamRoot || !/^\d{10,20}$/.test(String(account.steamId || ''))) return null;
  try {
    const accountId = (BigInt(account.steamId) - 76561197960265728n).toString();
    const localConfig = path.join(account.steamRoot, 'userdata', accountId, 'config', 'localconfig.vdf');
    if (!fs.existsSync(localConfig)) return null;
    const block = extractVdfObject(fs.readFileSync(localConfig, 'utf8'), appId);
    if (!block) return null;
    const rawMinutes = block.match(/"Playtime2"\s+"(\d+)"/i)?.[1]
      || block.match(/"Playtime"\s+"(\d+)"/i)?.[1];
    const minutes = Number(rawMinutes);
    if (rawMinutes == null || !Number.isFinite(minutes) || minutes < 0) return null;
    return {
      minutes,
      hours: minutes / 60,
      lastPlayed: Number(block.match(/"LastPlayed"\s+"(\d+)"/i)?.[1] || 0) || null,
      source: 'Steam localconfig.vdf'
    };
  } catch {
    return null;
  }
}

function parseHelperOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;
  // Add-Type can occasionally emit host text before JSON. Parse the final JSON object/array line first.
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(lines[index]); } catch { /* try preceding line */ }
  }
  try { return JSON.parse(text); } catch { return null; }
}

function readLocalSteamAchievements(expectedSteamId) {
  if (process.platform !== 'win32') {
    return { ok: false, source: 'steam-local-api', rows: [], error: 'Local Steam API reader is Windows-only.' };
  }

  const discovery = discoverGamePath();
  if (!discovery.ok) return { ...discovery, source: 'steam-local-api', rows: [] };

  const helper = resolveBundledFile('steam-helper.ps1');
  if (!fs.existsSync(helper)) {
    return { ok: false, source: 'steam-local-api', rows: [], gamePath: discovery.gamePath, dllPath: discovery.dllPath, error: 'Steam helper script is missing.' };
  }

  try {
    const env = {
      ...process.env,
      SteamAppId: APP_ID,
      SteamGameId: APP_ID,
      SOTF_STEAM_API_DLL: discovery.dllPath
    };
    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helper, '-DllPath', discovery.dllPath, '-ExpectedSteamId', String(expectedSteamId || ''), '-SchemaPath', discovery.schemaPath || ''],
      {
        cwd: discovery.gamePath,
        env,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 20000,
        maxBuffer: 1024 * 1024 * 4
      }
    );

    const parsed = parseHelperOutput(result.stdout);
    if (!parsed) {
      return {
        ok: false,
        source: 'steam-local-api',
        rows: [],
        gamePath: discovery.gamePath,
        dllPath: discovery.dllPath,
        schemaPath: discovery.schemaPath || null,
        error: String(result.stderr || '').trim() || `Steam helper returned no readable result (exit ${result.status}).`
      };
    }

    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const stats = Array.isArray(parsed.stats) ? parsed.stats : [];
    const schemaMapping = readAchievementStatMap(
      discovery.schemaPath,
      rows.map((row) => row.apiName),
      stats.map((stat) => stat.name)
    );
    const rowsWithSchemaStats = rows.map((row) => ({
      ...row,
      schemaStats: Array.isArray(schemaMapping.map?.[row.apiName])
        ? schemaMapping.map[row.apiName]
        : []
    }));

    return {
      ...parsed,
      rows: rowsWithSchemaStats,
      source: 'steam-local-api',
      gamePath: discovery.gamePath,
      dllPath: discovery.dllPath,
      schemaPath: discovery.schemaPath || null,
      discovery: discovery.discovery,
      schemaMappingOk: schemaMapping.ok,
      schemaMappingCount: Object.keys(schemaMapping.map || {}).length,
      schemaMappingError: schemaMapping.error || null,
      helperExitCode: result.status,
      stderr: String(result.stderr || '').trim() || null
    };
  } catch (error) {
    return {
      ok: false,
      source: 'steam-local-api',
      rows: [],
      gamePath: discovery.gamePath,
      dllPath: discovery.dllPath,
      schemaPath: discovery.schemaPath || null,
      error: error.message
    };
  }
}

module.exports = {
  discoverSteamAccount,
  discoverGamePath,
  readLocalPlaytime,
  locateSteamApiDll,
  locateStatsSchema,
  readLocalSteamAchievements
};
