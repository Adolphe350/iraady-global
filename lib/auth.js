'use strict';
/*
 * Admin sign-in for the dashboard. One admin account:
 *   - email from ADMIN_EMAIL (default info@iraady.com)
 *   - password: the hash saved from the dashboard (data/admin.json) wins;
 *     until one is set, ADMIN_PASSWORD from the environment is used.
 * Sessions are signed cookies (HMAC-SHA256), 7 days, HttpOnly + Secure + SameSite=Strict.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const store = require('./store');

const COOKIE = 'iraady_admin';
const SESSION_DAYS = 7;

let secret = null;
function getSecret() {
  if (secret) return secret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    secret = process.env.SESSION_SECRET;
    return secret;
  }
  // No secret configured: generate one and keep it on the volume.
  const p = path.join(store.DATA_DIR, 'session.secret');
  try {
    secret = fs.readFileSync(p, 'utf8').trim();
  } catch {
    secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(p, secret, { mode: 0o600 });
  }
  return secret;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex');
}

function verifyHash(password, stored) {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function adminEmail() {
  return (process.env.ADMIN_EMAIL || 'info@iraady.com').toLowerCase();
}

async function checkCredentials(email, password) {
  if (!email || !password) return false;
  if (String(email).trim().toLowerCase() !== adminEmail()) return false;
  const saved = await store.read('admin', null);
  if (saved && saved.passwordHash) return verifyHash(password, saved.passwordHash);
  const envPass = process.env.ADMIN_PASSWORD;
  return !!envPass && envPass.length >= 10 && safeEqual(password, envPass);
}

async function setPassword(password) {
  await store.write('admin', { passwordHash: hashPassword(password), changedAt: new Date().toISOString() });
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  if (!safeEqual(mac, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(req, value, maxAgeSec) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`;
}

function startSession(req) {
  const token = sign({ sub: adminEmail(), exp: Date.now() + SESSION_DAYS * 86400000, v: 1 });
  return sessionCookie(req, token, SESSION_DAYS * 86400);
}

function endSession(req) {
  return sessionCookie(req, '', 0);
}

function currentAdmin(req) {
  const payload = verify(parseCookies(req)[COOKIE]);
  return payload ? { email: payload.sub } : null;
}

// Simple in-memory limiter: N attempts per key per window.
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++;
  buckets.set(key, b);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n <= max;
}

module.exports = { checkCredentials, setPassword, startSession, endSession, currentAdmin, rateLimit, adminEmail };
