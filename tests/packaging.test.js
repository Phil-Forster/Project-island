const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('packages the app with ASAR while keeping the PowerShell Steam helper external', () => {
  const pkg = JSON.parse(read('package.json'));
  const steamReader = read('src/steam-local-reader.js');

  assert.equal(pkg.build.asar, true);
  assert.deepEqual(pkg.build.asarUnpack, ['src/steam-helper.ps1']);
  assert.match(steamReader, /app\.asar\.unpacked/);
  assert.match(steamReader, /resolveBundledFile\('steam-helper\.ps1'\)/);
});
