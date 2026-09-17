const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { resolveCompletionState, parseCount } = require('../src/completion-banner');

test('requires a non-empty fully resolved Steam catalogue before confirming completion', () => {
  assert.deepEqual(
    resolveCompletionState({ total: 32, unlocked: 32, steamResolved: true, persisted: false }),
    { complete: true, persist: true, definitive: true }
  );

  assert.deepEqual(
    resolveCompletionState({ total: 0, unlocked: 0, steamResolved: true, persisted: false }),
    { complete: false, persist: false, definitive: false }
  );
});

test('does not treat rounded near-completion as complete', () => {
  assert.deepEqual(
    resolveCompletionState({ total: 32, unlocked: 31, steamResolved: true, persisted: true }),
    { complete: false, persist: false, definitive: true }
  );
});

test('preserves a previously confirmed completion through a partial Steam read', () => {
  assert.deepEqual(
    resolveCompletionState({ total: 32, unlocked: 29, steamResolved: false, persisted: true }),
    { complete: true, persist: true, definitive: false }
  );
});

test('does not infer completion from an unresolved Steam read with no prior confirmation', () => {
  assert.deepEqual(
    resolveCompletionState({ total: 32, unlocked: 32, steamResolved: false, persisted: false }),
    { complete: false, persist: false, definitive: false }
  );
});

test('count parser reads tracker summary and Steam-read ratios', () => {
  assert.deepEqual(parseCount('32 / 32'), { current: 32, total: 32 });
  assert.deepEqual(parseCount('32 / 32 · Local UserStats'), { current: 32, total: 32 });
  assert.equal(parseCount('Unavailable'), null);
});

test('completion banner assets are wired into the tracker shell', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  assert.match(html, /completion-banner\.css/);
  assert.match(html, /completion-banner\.js/);
  assert.ok(html.indexOf('renderer.js') < html.indexOf('completion-banner.js'));
});

test('completion banner follows the themed family presentation', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'src', 'completion-banner.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'completion-banner.css'), 'utf8');

  assert.match(script, /SURVIVAL RECORD COMPLETE/);
  assert.match(script, /All achievements complete/);
  assert.match(script, /Island record complete/);
  assert.match(script, /project-island-badge\.webp/);
  assert.match(script, /insertAdjacentElement\('afterend', banner\)/);
  assert.doesNotMatch(script, /Steam confirms all/);
  assert.match(styles, /app-background-island\.webp/);
  assert.match(styles, /\.completion-banner__status/);
});
