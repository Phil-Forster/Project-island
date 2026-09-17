const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('releases the Electron single-instance lock as the main window starts closing on Windows', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  const closeBlock = source.match(/mainWindow\.on\('close',[\s\S]*?\n  \}\);/);
  assert.ok(closeBlock, 'main-window close handler should exist');
  assert.match(closeBlock[0], /app\.releaseSingleInstanceLock\(\);/);
});
