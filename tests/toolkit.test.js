'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ACHIEVEMENTS, mergeAchievementState } = require('../src/achievements');
const { discoverSaves } = require('../src/save-reader');
const { readLocalPlaytime } = require('../src/steam-local-reader');

test('Steam-only mode retains all 32 achievement definitions', () => {
  const merged = mergeAchievementState(null, []);
  assert.equal(ACHIEVEMENTS.length, 32);
  assert.equal(merged.length, 32);
  assert.ok(merged.every((item) => item.state === 'unknown'));
  assert.ok(merged.every((item) => item.category && item.guidance));
});

test('manual save discovery accepts a selected slot folder', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sotf-save-'));
  try {
    fs.writeFileSync(path.join(root, 'SaveData.zip'), Buffer.from('fixture'));
    const discovery = discoverSaves(root);
    assert.equal(discovery.saves.length, 1);
    assert.equal(discovery.saves[0].id, path.basename(root));
    assert.equal(discovery.saves[0].mode, 'Manual');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('reads Steam playtime from the logged-in account local config', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'steam-playtime-'));
  const accountId = 12345n;
  const steamId = (76561197960265728n + accountId).toString();
  const configDir = path.join(root, 'userdata', accountId.toString(), 'config');
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'localconfig.vdf'), `"apps"\n{\n  "1326470"\n  {\n    "Playtime" "120"\n    "Playtime2" "987"\n    "LastPlayed" "1788200000"\n  }\n}`);
    const playtime = readLocalPlaytime({ steamRoot: root, steamId });
    assert.equal(playtime.minutes, 987);
    assert.equal(playtime.hours, 16.45);
    assert.equal(playtime.lastPlayed, 1788200000);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
