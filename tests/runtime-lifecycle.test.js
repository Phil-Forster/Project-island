const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('releases the Electron single-instance lock as the main window starts closing on Windows', () => {
  const source = readSource('src/main.js');
  const closeBlock = source.match(/mainWindow\.on\('close',[\s\S]*?\n  \}\);/);
  assert.ok(closeBlock, 'main-window close handler should exist');
  assert.match(closeBlock[0], /app\.releaseSingleInstanceLock\(\);/);
});

test('uses BrowserWindow readiness for the visible splash and preserves installer handoff', () => {
  const main = readSource('src/main.js');
  const preload = readSource('src/splash-preload.js');
  const renderer = readSource('src/splash.js');

  assert.match(main, /--splash-ready-file=/);
  assert.match(main, /splashWindow\.once\('ready-to-show',[\s\S]*?showSplash\(\);/);
  assert.match(main, /const showSplash\s*=\s*\(\)\s*=>\s*\{[\s\S]*?signalInstallerHandoffReady\(\);/);
  assert.doesNotMatch(main, /splash:visual-ready|splashShowFallback|splashArtReady|splashPageReady/);
  assert.doesNotMatch(preload, /notifyVisualReady|splash:visual-ready/);
  assert.doesNotMatch(renderer, /notifyVisualReady|splash:visual-ready/);
});
