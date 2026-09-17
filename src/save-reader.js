'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readZipEntries } = require('./zip-reader');

const SAVE_ROOT = path.join(
  process.env.USERPROFILE || os.homedir(),
  'AppData',
  'LocalLow',
  'Endnight',
  'SonsOfTheForest',
  'Saves'
);

function exists(value) {
  try {
    fs.accessSync(value, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function safeStat(value) {
  try {
    return fs.statSync(value);
  } catch {
    return null;
  }
}

function collectSavePackages(root, maxDepth = 5) {
  const found = [];
  const queue = [{ dir: root, depth: 0 }];
  let visited = 0;
  while (queue.length && found.length < 300 && visited < 5000) {
    const current = queue.shift();
    visited += 1;
    let entries;
    try { entries = fs.readdirSync(current.dir, { withFileTypes: true }); } catch { continue; }
    const saveData = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === 'savedata.zip');
    if (saveData) found.push(path.join(current.dir, saveData.name));
    if (current.depth >= maxDepth) continue;
    for (const entry of entries) {
      if (entry.isDirectory()) queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
    }
  }
  return found;
}

function discoverSaves(root = SAVE_ROOT) {
  if (!exists(root)) {
    return { root, found: false, steamIds: [], saves: [] };
  }

  const saves = collectSavePackages(root).map((saveDataZip) => {
    const folder = path.dirname(saveDataZip);
    const segments = path.resolve(folder).split(path.sep);
    const steamId = [...segments].reverse().find((segment) => /^\d{10,20}$/.test(segment)) || null;
    const mode = [...segments].reverse().find((segment) => ['SinglePlayer', 'Multiplayer', 'MultiplayerClient'].includes(segment)) || 'Manual';
    const stat = safeStat(saveDataZip);
    return {
      key: path.resolve(saveDataZip), steamId, mode, id: path.basename(folder), folder,
      saveDataZip: path.resolve(saveDataZip), modifiedAt: stat?.mtime?.toISOString() || null,
      modifiedMs: stat?.mtimeMs || 0
    };
  });
  const steamIds = [...new Set(saves.map((save) => save.steamId).filter(Boolean))];

  saves.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return { root, found: true, steamIds, saves };
}

function parseOuterJson(text, filename) {
  const outer = JSON.parse(text);
  const parsed = {};

  if (!outer || typeof outer !== 'object' || !outer.Data || typeof outer.Data !== 'object') {
    return { filename, raw: outer, parsed };
  }

  for (const [key, value] of Object.entries(outer.Data)) {
    if (typeof value === 'string') {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  }

  return { filename, version: outer.Version || null, raw: outer, parsed };
}

function loadJsonFromZip(zip, filename) {
  const data = zip.get(filename);
  if (!data) return null;
  return parseOuterJson(data.toString('utf8'), filename);
}

function normalizePlayerState(playerState) {
  const entries = Array.isArray(playerState?._entries) ? playerState._entries : [];
  const byName = {};

  for (const entry of entries) {
    const value = Object.prototype.hasOwnProperty.call(entry, 'BoolValue')
      ? entry.BoolValue
      : Object.prototype.hasOwnProperty.call(entry, 'IntValue')
        ? entry.IntValue
        : Object.prototype.hasOwnProperty.call(entry, 'FloatValue')
          ? entry.FloatValue
          : Object.prototype.hasOwnProperty.call(entry, 'StringValue')
            ? entry.StringValue
            : true;
    byName[entry.Name] = value;
  }

  return { ...playerState, entries, byName };
}

function normalizeInventory(inventory) {
  const blocks = Array.isArray(inventory?.ItemInstanceManagerData?.ItemBlocks)
    ? inventory.ItemInstanceManagerData.ItemBlocks
    : [];
  const byId = {};
  for (const block of blocks) {
    if (block && Number.isFinite(block.ItemId)) byId[block.ItemId] = block;
  }
  return { ...inventory, itemBlocks: blocks, byId };
}

function getVail(saveData) {
  return saveData?.VailWorldSim && typeof saveData.VailWorldSim === 'object'
    ? saveData.VailWorldSim
    : {};
}

function readSave(saveDescriptor) {
  const zip = readZipEntries(saveDescriptor.saveDataZip);

  const gameState = loadJsonFromZip(zip, 'GameStateSaveData.json')?.parsed?.GameState || {};
  const playerStateRaw = loadJsonFromZip(zip, 'PlayerStateSaveData.json')?.parsed?.PlayerState || {};
  const inventoryRaw = loadJsonFromZip(zip, 'PlayerInventorySaveData.json')?.parsed?.PlayerInventory || {};
  const clothing = loadJsonFromZip(zip, 'PlayerClothingSystemSaveData.json')?.parsed?.PlayerClothingSystem || {};
  const armour = loadJsonFromZip(zip, 'PlayerArmourSystemSaveData.json')?.parsed?.PlayerArmourSystem || {};
  const plating = loadJsonFromZip(zip, 'ItemPlatingSaveManagerSaveData.json')?.parsed?.ItemPlatingSaveManager || {};
  const construction = loadJsonFromZip(zip, 'ConstructionsSaveData.json')?.parsed?.Constructions || {};
  const cooking = loadJsonFromZip(zip, 'CookingSaveManagerSaveData.json')?.parsed?.CookingSaveManager || {};
  const saveData = loadJsonFromZip(zip, 'SaveData.json')?.parsed || {};
  const gameSetup = loadJsonFromZip(zip, 'GameSetupSaveData.json')?.parsed?.GameSetup || {};

  const printers = [
    ['Bunker A', 'Resin3dPrinter_BunkerASaveData.json', 'Resin3dPrinter_BunkerA'],
    ['Bunker B', 'Resin3dPrinter_BunkerBSaveData.json', 'Resin3dPrinter_BunkerB'],
    ['Entertainment', 'Resin3dPrinter_EntertainmentSaveData.json', 'Resin3dPrinter_Entertainment'],
    ['Residential', 'Resin3dPrinter_ResidentialSaveData.json', 'Resin3dPrinter_Residential']
  ].map(([name, filename, key]) => ({
    name,
    state: loadJsonFromZip(zip, filename)?.parsed?.[key] || {}
  }));

  const vail = getVail(saveData);
  const actors = Array.isArray(vail.Actors) ? vail.Actors : [];
  const influences = Array.isArray(vail.InfluenceMemory) ? vail.InfluenceMemory : [];

  return {
    descriptor: saveDescriptor,
    gameState,
    gameSetup,
    playerState: normalizePlayerState(playerStateRaw),
    inventory: normalizeInventory(inventoryRaw),
    clothing,
    armour,
    plating,
    construction,
    cooking,
    saveData,
    vail,
    actors,
    influences,
    printers,
    fileCount: zip.size
  };
}

module.exports = {
  SAVE_ROOT,
  discoverSaves,
  readSave
};
