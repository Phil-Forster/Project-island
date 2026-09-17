const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('releases the Electron single-instance lock before quitting on Windows', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  const windowCloseBlock = source.match(/app\.on\('window-all-closed',[\s\S]*?\n  \}\);/);
  assert.ok(windowCloseBlock, 'window-all-closed handler should exist');
  assert.match(windowCloseBlock[0], /app\.releaseSingleInstanceLock\(\);[\s\S]*app\.quit\(\);/);
});
