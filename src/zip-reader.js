'use strict';

const fs = require('fs');
const zlib = require('zlib');

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function findEocd(buffer) {
  const minimum = 22;
  const maximumComment = 0xffff;
  const start = Math.max(0, buffer.length - minimum - maximumComment);
  for (let offset = buffer.length - minimum; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === SIG_EOCD) return offset;
  }
  throw new Error('ZIP end-of-central-directory record not found.');
}

function readZipEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  const eocd = findEocd(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== SIG_CENTRAL) {
      throw new Error(`Invalid ZIP central directory entry at offset ${offset}.`);
    }

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

    if (buffer.readUInt32LE(localOffset) !== SIG_LOCAL) {
      throw new Error(`Invalid ZIP local header for ${name}.`);
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    let data;
    if (compression === 0) data = Buffer.from(compressed);
    else if (compression === 8) data = zlib.inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP compression method ${compression} for ${name}.`);

    if (uncompressedSize !== 0 && data.length !== uncompressedSize) {
      throw new Error(`ZIP size mismatch for ${name}.`);
    }

    entries.set(name.replace(/\\/g, '/'), data);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

module.exports = { readZipEntries };
