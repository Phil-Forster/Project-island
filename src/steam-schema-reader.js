'use strict';

const fs = require('fs');

// Steam stores UserGameStatsSchema files as binary Valve KeyValues. Keeping
// this parser small and read-only lets the tracker use the schema's real
// achievement -> progress-stat relationship instead of guessing from nearby
// printable strings.
const KV_TYPE = Object.freeze({
  OBJECT: 0,
  STRING: 1,
  INT32: 2,
  FLOAT32: 3,
  POINTER: 4,
  WSTRING: 5,
  COLOR: 6,
  UINT64: 7,
  END: 8,
  INT64: 10,
  ALTERNATE_END: 11
});

const MAX_SCHEMA_BYTES = 32 * 1024 * 1024;
const MAX_DEPTH = 96;
const MAX_ENTRIES = 250000;

function readCString(buffer, cursor) {
  const start = cursor.offset;
  const end = buffer.indexOf(0, start);
  if (end < 0) throw new Error('Unterminated KeyValues string.');
  cursor.offset = end + 1;
  return buffer.toString('utf8', start, end);
}

function requireBytes(buffer, cursor, length) {
  if (!Number.isInteger(length) || length < 0 || cursor.offset + length > buffer.length) {
    throw new Error('Unexpected end of KeyValues data.');
  }
}

function readWideString(buffer, cursor) {
  requireBytes(buffer, cursor, 2);
  const characterCount = buffer.readUInt16LE(cursor.offset);
  cursor.offset += 2;
  const byteLength = characterCount * 2;
  requireBytes(buffer, cursor, byteLength);
  const value = buffer.toString('utf16le', cursor.offset, cursor.offset + byteLength).replace(/\0$/, '');
  cursor.offset += byteLength;
  return value;
}

function readScalar(buffer, cursor, type) {
  switch (type) {
    case KV_TYPE.STRING:
      return readCString(buffer, cursor);
    case KV_TYPE.INT32:
      requireBytes(buffer, cursor, 4);
      cursor.offset += 4;
      return buffer.readInt32LE(cursor.offset - 4);
    case KV_TYPE.FLOAT32:
      requireBytes(buffer, cursor, 4);
      cursor.offset += 4;
      return buffer.readFloatLE(cursor.offset - 4);
    case KV_TYPE.POINTER:
    case KV_TYPE.COLOR:
      requireBytes(buffer, cursor, 4);
      cursor.offset += 4;
      return buffer.readUInt32LE(cursor.offset - 4);
    case KV_TYPE.WSTRING:
      return readWideString(buffer, cursor);
    case KV_TYPE.UINT64:
      requireBytes(buffer, cursor, 8);
      cursor.offset += 8;
      return buffer.readBigUInt64LE(cursor.offset - 8).toString();
    case KV_TYPE.INT64:
      requireBytes(buffer, cursor, 8);
      cursor.offset += 8;
      return buffer.readBigInt64LE(cursor.offset - 8).toString();
    default:
      throw new Error(`Unsupported KeyValues type ${type}.`);
  }
}

function parseObject(buffer, cursor, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error('KeyValues nesting limit exceeded.');
  const entries = [];

  while (cursor.offset < buffer.length) {
    if (cursor.entryCount >= MAX_ENTRIES) throw new Error('KeyValues entry limit exceeded.');
    const type = buffer[cursor.offset];
    cursor.offset += 1;

    if (type === KV_TYPE.END || type === KV_TYPE.ALTERNATE_END) return entries;

    const key = readCString(buffer, cursor);
    cursor.entryCount += 1;
    const value = type === KV_TYPE.OBJECT
      ? parseObject(buffer, cursor, depth + 1)
      : readScalar(buffer, cursor, type);
    entries.push({ key, type, value });
  }

  if (depth > 0) throw new Error('Unterminated KeyValues object.');
  return entries;
}

function parseBinaryKeyValues(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new TypeError('Schema must be a Buffer.');
  if (buffer.length === 0 || buffer.length > MAX_SCHEMA_BYTES) throw new Error('Schema size is invalid.');
  return parseObject(buffer, { offset: 0, entryCount: 0 });
}

function stringsInEntry(entry, output) {
  if (entry.key) output.add(entry.key);
  if (entry.type === KV_TYPE.OBJECT) {
    for (const child of entry.value) stringsInEntry(child, output);
  } else if (typeof entry.value === 'string' && entry.value) {
    output.add(entry.value);
  }
}

function stringsInObject(entries) {
  const output = new Set();
  for (const entry of entries) stringsInEntry(entry, output);
  return output;
}

function collectObjects(entries, depth = 0, output = []) {
  output.push({ entries, depth, strings: stringsInObject(entries) });
  for (const entry of entries) {
    if (entry.type === KV_TYPE.OBJECT) collectObjects(entry.value, depth + 1, output);
  }
  return output;
}

function buildAchievementStatMap(entries, achievementApiNames, statNames) {
  const achievements = new Set((achievementApiNames || []).filter(Boolean));
  const stats = new Set((statNames || []).filter(Boolean));
  const objects = collectObjects(entries);
  const result = {};

  for (const achievement of achievements) {
    // Choose the deepest/smallest object that contains both the achievement
    // token and one or more successfully readable Steam stat tokens. In the
    // schema this is the achievement definition block and its progress child.
    const matches = objects
      .filter((object) => object.strings.has(achievement))
      .map((object) => ({
        ...object,
        candidates: [...object.strings].filter((value) => value !== achievement && stats.has(value))
      }))
      .filter((object) => object.candidates.length > 0)
      .sort((left, right) => right.depth - left.depth
        || left.candidates.length - right.candidates.length
        || left.strings.size - right.strings.size);

    if (!matches.length) continue;
    const best = matches[0];
    const equallySpecific = matches.filter((match) => match.depth === best.depth
      && match.candidates.length === best.candidates.length
      && match.strings.size === best.strings.size);
    const candidates = [...new Set(equallySpecific.flatMap((match) => match.candidates))];
    if (candidates.length) result[achievement] = candidates;
  }

  return result;
}

function readAchievementStatMap(schemaPath, achievementApiNames, statNames) {
  if (!schemaPath || !fs.existsSync(schemaPath)) return { ok: false, map: {}, error: 'Steam stats schema was not found.' };
  try {
    const buffer = fs.readFileSync(schemaPath);
    const entries = parseBinaryKeyValues(buffer);
    return {
      ok: true,
      map: buildAchievementStatMap(entries, achievementApiNames, statNames),
      error: null
    };
  } catch (error) {
    return { ok: false, map: {}, error: error.message };
  }
}

module.exports = {
  KV_TYPE,
  parseBinaryKeyValues,
  buildAchievementStatMap,
  readAchievementStatMap
};
