const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('deployment shell detects an existing registered install and presents update state', () => {
  const main = read('deployment-ui/main.js');
  const renderer = read('deployment-ui/renderer.js');

  assert.match(main, /function readInstalledState\(/);
  assert.match(main, /HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Uninstall/);
  assert.match(main, /DisplayVersion/);
  assert.match(main, /InstallLocation/);
  assert.match(main, /installedState\.installed/);
  assert.match(renderer, /EXISTING INSTALLATION DETECTED/);
  assert.match(renderer, /isUpdateMode\(\) \? 'Update' : 'Install'/);
  assert.match(renderer, /Updating…/);
});

test('deployment shell scripts remain syntactically valid', () => {
  for (const relativePath of ['deployment-ui/main.js', 'deployment-ui/renderer.js']) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, relativePath)], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${relativePath} failed syntax check: ${result.stderr || result.stdout}`);
  }
});

test('splash starts its background artwork request during initial rendering', () => {
  const splash = read('src/splash.js');
  assert.match(splash, /art\.src = art\.dataset\.src/);
  assert.doesNotMatch(splash, /setTimeout\([\s\S]*?art\.src = art\.dataset\.src/);
});
