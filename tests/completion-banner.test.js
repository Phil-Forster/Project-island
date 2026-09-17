const test = require('node:test');
const assert = require('node:assert/strict');

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
