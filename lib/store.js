'use strict';
/*
 * Tiny JSON store on the /data volume. Each collection is one file, written
 * atomically (temp file + rename) and serialised per file, so a crash mid-write
 * can never leave a half-written file behind.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || '/data';
const SEED = path.join(__dirname, '..', 'seed', 'content.json');

const queues = new Map();
const cache = new Map();

function file(name) {
  return path.join(DATA_DIR, name + '.json');
}

async function read(name, fallback) {
  if (cache.has(name)) return cache.get(name);
  try {
    const value = JSON.parse(await fsp.readFile(file(name), 'utf8'));
    cache.set(name, value);
    return value;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return fallback;
  }
}

function write(name, value) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev.then(async () => {
    const tmp = file(name) + '.' + process.pid + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(value, null, 1));
    await fsp.rename(tmp, file(name));
    cache.set(name, value);
  });
  queues.set(name, next.catch(() => {}));
  return next;
}

/** Read-modify-write under the per-file queue. */
function update(name, fallback, fn) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev.then(async () => {
    const current = await read(name, fallback);
    const updated = await fn(JSON.parse(JSON.stringify(current)));
    const tmp = file(name) + '.' + process.pid + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(updated, null, 1));
    await fsp.rename(tmp, file(name));
    cache.set(name, updated);
    return updated;
  });
  queues.set(name, next.catch(() => {}));
  return next;
}

async function init() {
  await fsp.mkdir(path.join(DATA_DIR, 'uploads'), { recursive: true });
  // First boot: the site's content starts as the seed shipped in the repo.
  try {
    await fsp.access(file('content'));
  } catch {
    await fsp.copyFile(SEED, file('content'));
    console.log('Seeded content from', SEED);
  }
}

function id(prefix) {
  return prefix + '_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

module.exports = { DATA_DIR, init, read, write, update, id };
