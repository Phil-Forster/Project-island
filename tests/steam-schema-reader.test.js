'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  KV_TYPE,
  parseBinaryKeyValues,
  buildAchievementStatMap
} = require('../src/steam-schema-reader');

function cstring(value) {
  return Buffer.concat([Buffer.from(value, 'utf8'), Buffer.from([0])]);
}

function stringEntry(key, value) {
  return Buffer.concat([Buffer.from([KV_TYPE.STRING]), cstring(key), cstring(value)]);
}

function objectEntry(key, children) {
  return Buffer.concat([
    Buffer.from([KV_TYPE.OBJECT]),
    cstring(key),
    ...children,
    Buffer.from([KV_TYPE.END])
  ]);
}

test('maps achievement API names to the stat in their own progress block', () => {
  const schema = Buffer.concat([
    objectEntry('1326470', [
      objectEntry('bits', [
        objectEntry('collector', [
          stringEntry('name', 'ACH_COLLECT_WATCHES'),
          objectEntry('progress', [stringEntry('stat', 'STAT_WATCH_PICKUPS')])
        ]),
        objectEntry('blisters', [
          stringEntry('name', 'ACH_DIG_1000'),
          objectEntry('progress', [stringEntry('stat', 'STAT_DIG_COUNT')])
        ])
      ])
    ]),
    Buffer.from([KV_TYPE.END])
  ]);

  const parsed = parseBinaryKeyValues(schema);
  const map = buildAchievementStatMap(
    parsed,
    ['ACH_COLLECT_WATCHES', 'ACH_DIG_1000'],
    ['STAT_WATCH_PICKUPS', 'STAT_DIG_COUNT', 'UNRELATED_STAT']
  );

  assert.deepEqual(map.ACH_COLLECT_WATCHES, ['STAT_WATCH_PICKUPS']);
  assert.deepEqual(map.ACH_DIG_1000, ['STAT_DIG_COUNT']);
});

test('does not associate a stat from a sibling achievement', () => {
  const schema = Buffer.concat([
    objectEntry('bits', [
      objectEntry('one', [
        stringEntry('name', 'ACH_COLLECT_WATCHES'),
        objectEntry('progress', [stringEntry('stat', 'STAT_WATCH_PICKUPS')])
      ]),
      objectEntry('two', [
        stringEntry('name', 'ACH_DIG_1000'),
        objectEntry('progress', [stringEntry('stat', 'STAT_DIG_COUNT')])
      ])
    ]),
    Buffer.from([KV_TYPE.END])
  ]);

  const map = buildAchievementStatMap(
    parseBinaryKeyValues(schema),
    ['ACH_COLLECT_WATCHES'],
    ['STAT_WATCH_PICKUPS', 'STAT_DIG_COUNT']
  );

  assert.deepEqual(map.ACH_COLLECT_WATCHES, ['STAT_WATCH_PICKUPS']);
});

test('rejects truncated schema data safely', () => {
  const truncated = Buffer.concat([
    Buffer.from([KV_TYPE.STRING]),
    cstring('name'),
    Buffer.from('unterminated', 'utf8')
  ]);
  assert.throws(() => parseBinaryKeyValues(truncated), /Unterminated/);
});
