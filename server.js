'use strict';
/*
 * iraady.com — company site + admin dashboard. No dependencies: Node's http
 * module, a JSON store on the /data volume, server-rendered pages.
 *
 *   /                 landing page rendered from content
 *   /admin            dashboard (static app in public/admin, talks to /api/admin/*)
 *   /api/enquiries    contact form → stored (the form also still emails via formsubmit)
 *   /api/orders       checkout callback → stored (payment itself stays with Flutterwave)
 */
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/store');
const auth = require('./lib/auth');
const render = require('./lib/render');

const PORT = Number(process.env.PORT) || 80;
const PUBLIC = path.join(__dirname, 'public');
const PAGES = path.join(__dirname, 'pages');
const UPLOADS = path.join(store.DATA_DIR, 'uploads');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.woff2': 'font/woff2'
};

const CONTENT_SECTIONS = ['site', 'metrics', 'products', 'services', 'process', 'team', 'pricing', 'faq', 'blog', 'offices', 'projects'];
const ENQUIRY_STATUSES = ['new', 'contacted', 'proposal', 'won', 'lost', 'spam'];

// ---------- helpers ----------
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': type || 'text/plain; charset=utf-8' }, extra || {}));
  res.end(body);
}

function json(res, status, obj, extra) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', Object.assign({ 'Cache-Control': 'no-store' }, extra || {}));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request is too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req, limit = 1024 * 1024) {
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(buf.toString()));
  try {
    return JSON.parse(buf.toString());
  } catch {
    throw Object.assign(new Error('Request body is not valid JSON'), { status: 400 });
  }
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}

/** State-changing admin calls must come from this site (cookies are SameSite=Strict too). */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function serveFile(res, filePath, cache) {
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return false;
    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': cache });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

function within(base, rel) {
  const p = path.normalize(path.join(base, rel));
  return p.startsWith(base + path.sep) ? p : null;
}

// ---------- pages ----------
const legal = {};
async function loadLegal() {
  const titles = { 'privacy.html': 'Privacy policy', 'terms.html': 'Terms of service', 'thank-you.html': 'Thank you' };
  for (const name of Object.keys(titles)) {
    const html = await fsp.readFile(path.join(PAGES, name), 'utf8');
    let main = (/<main[^>]*>([\s\S]*?)<\/main>/i.exec(html) || [, ''])[1];
    main = main.replace(/<div class="container">|<\/div>\s*$/g, '').replace(/href="index\.html/g, 'href="/');
    legal[name] = { title: titles[name], main };
  }
}

async function content() {
  return store.read('content', {});
}

// ---------- admin API ----------
async function adminApi(req, res, pathname) {
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const ip = clientIp(req);
    if (!auth.rateLimit('login:' + ip, 8, 15 * 60 * 1000)) return json(res, 429, { error: 'Too many attempts. Wait 15 minutes and try again.' });
    const body = await readJson(req);
    if (!(await auth.checkCredentials(body.email, body.password))) return json(res, 401, { error: 'Email or password is not right.' });
    return json(res, 200, { ok: true, email: auth.adminEmail() }, { 'Set-Cookie': auth.startSession(req) });
  }
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': auth.endSession(req) });
  }

  const admin = auth.currentAdmin(req);
  if (!admin) return json(res, 401, { error: 'Sign in required' });
  if (req.method !== 'GET' && !sameOrigin(req)) return json(res, 403, { error: 'Cross-site request refused' });

  if (pathname === '/api/admin/me') return json(res, 200, { email: admin.email });

  if (pathname === '/api/admin/overview') {
    const [enq, orders, c] = await Promise.all([store.read('enquiries', []), store.read('orders', []), content()]);
    const since = Date.now() - 30 * 86400000;
    return json(res, 200, {
      enquiries: { total: enq.length, new: enq.filter((e) => e.status === 'new').length, last30: enq.filter((e) => Date.parse(e.createdAt) > since).length },
      orders: { total: orders.length, last30: orders.filter((o) => Date.parse(o.createdAt) > since).length, revenue: orders.reduce((s, o) => s + (Number(o.amount) || 0), 0) },
      content: { projects: (c.projects || []).length, products: (c.products || []).length, team: (c.team || []).length, shop: (c.projects || []).filter((p) => typeof p.price === 'number').length },
      recent: enq.slice(-6).reverse()
    });
  }

  if (pathname === '/api/admin/content' && req.method === 'GET') return json(res, 200, await content());

  const sec = /^\/api\/admin\/content\/([a-z]+)$/.exec(pathname);
  if (sec && req.method === 'PUT') {
    const key = sec[1];
    if (!CONTENT_SECTIONS.includes(key)) return json(res, 404, { error: 'Unknown section' });
    const body = await readJson(req, 2 * 1024 * 1024);
    const value = body.value;
    if (key === 'site' ? (typeof value !== 'object' || Array.isArray(value)) : !Array.isArray(value)) {
      return json(res, 400, { error: key === 'site' ? 'Expected an object' : 'Expected a list' });
    }
    const updated = await store.update('content', {}, (c) => { c[key] = value; c.updatedAt = new Date().toISOString(); return c; });
    return json(res, 200, { ok: true, value: updated[key] });
  }

  if (pathname === '/api/admin/enquiries' && req.method === 'GET') return json(res, 200, { enquiries: (await store.read('enquiries', [])).slice().reverse() });
  const enq = /^\/api\/admin\/enquiries\/([\w-]+)$/.exec(pathname);
  if (enq && req.method === 'PATCH') {
    const body = await readJson(req);
    let found = null;
    await store.update('enquiries', [], (list) => list.map((e) => {
      if (e.id !== enq[1]) return e;
      if (body.status && ENQUIRY_STATUSES.includes(body.status)) e.status = body.status;
      if (typeof body.note === 'string') e.note = clean(body.note, 4000);
      e.updatedAt = new Date().toISOString();
      found = e;
      return e;
    }));
    return found ? json(res, 200, { enquiry: found }) : json(res, 404, { error: 'Not found' });
  }
  if (enq && req.method === 'DELETE') {
    await store.update('enquiries', [], (list) => list.filter((e) => e.id !== enq[1]));
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/admin/orders' && req.method === 'GET') return json(res, 200, { orders: (await store.read('orders', [])).slice().reverse() });
  const ord = /^\/api\/admin\/orders\/([\w-]+)$/.exec(pathname);
  if (ord && req.method === 'PATCH') {
    const body = await readJson(req);
    let found = null;
    await store.update('orders', [], (list) => list.map((o) => {
      if (o.id !== ord[1]) return o;
      if (['reported', 'verified', 'delivered', 'refunded'].includes(body.status)) o.status = body.status;
      if (typeof body.note === 'string') o.note = clean(body.note, 4000);
      found = o;
      return o;
    }));
    return found ? json(res, 200, { order: found }) : json(res, 404, { error: 'Not found' });
  }

  if (pathname === '/api/admin/upload' && req.method === 'POST') {
    const body = await readJson(req, 8 * 1024 * 1024);
    const m = /^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ''));
    if (!m) return json(res, 400, { error: 'Send a PNG, JPEG, WebP or GIF image' });
    const buf = Buffer.from(m[3], 'base64');
    if (buf.length > 5 * 1024 * 1024) return json(res, 413, { error: 'Images must be 5 MB or less' });
    const name = crypto.randomBytes(10).toString('hex') + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]);
    await fsp.writeFile(path.join(UPLOADS, name), buf);
    return json(res, 200, { url: '/uploads/' + name });
  }

  if (pathname === '/api/admin/password' && req.method === 'POST') {
    const body = await readJson(req);
    if (!(await auth.checkCredentials(admin.email, body.current))) return json(res, 400, { error: 'Your current password is not right.' });
    if (String(body.next || '').length < 12) return json(res, 400, { error: 'Use at least 12 characters.' });
    await auth.setPassword(String(body.next));
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Not found' });
}

// ---------- public API ----------
async function publicApi(req, res, pathname) {
  if (pathname === '/api/enquiries' && req.method === 'POST') {
    const ip = clientIp(req);
    if (!auth.rateLimit('enq:' + ip, 6, 60 * 60 * 1000)) return json(res, 429, { error: 'Too many messages from here. Please email us instead.' });
    const b = await readJson(req, 64 * 1024);
    if (b._honey) return json(res, 200, { ok: true }); // bots fill the hidden field
    const e = {
      id: store.id('enq'),
      name: clean(b.name, 200), email: clean(b.email, 200), phone: clean(b.phone, 60), company: clean(b.company, 200),
      budget: clean(b.budget, 60), timeline: clean(b.timeline, 60), message: clean(b.message, 8000),
      source: clean(b.source || 'contact-form', 60), status: 'new', createdAt: new Date().toISOString()
    };
    if (!e.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email) || !e.message) return json(res, 400, { error: 'Name, a valid email and a message are needed.' });
    await store.update('enquiries', [], (list) => { list.push(e); return list.slice(-5000); });
    return json(res, 201, { ok: true });
  }

  if (pathname === '/api/orders' && req.method === 'POST') {
    const ip = clientIp(req);
    if (!auth.rateLimit('ord:' + ip, 20, 60 * 60 * 1000)) return json(res, 429, { error: 'Too many requests' });
    const b = await readJson(req, 32 * 1024);
    const c = await content();
    const project = (c.projects || []).find((p) => p.id === b.projectId);
    if (!project) return json(res, 400, { error: 'Unknown project' });
    const o = {
      id: store.id('ord'),
      projectId: project.id, projectName: project.name, amount: Number(project.price) || 0, currency: 'USD',
      name: clean(b.name, 200), email: clean(b.email, 200), phone: clean(b.phone, 60),
      transactionId: clean(b.transactionId, 100), txRef: clean(b.txRef, 120),
      // Reported by the buyer's browser after Flutterwave's callback; confirm it in Flutterwave before delivering.
      status: 'reported', createdAt: new Date().toISOString()
    };
    await store.update('orders', [], (list) => { list.push(o); return list.slice(-5000); });
    return json(res, 201, { ok: true });
  }
  return json(res, 404, { error: 'Not found' });
}

// ---------- router ----------
async function handle(req, res) {
  securityHeaders(res);
  const url = new URL(req.url, 'http://x');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }

  if (pathname === '/health') return json(res, 200, { ok: true });
  if (pathname.startsWith('/api/admin/')) return adminApi(req, res, pathname);
  if (pathname.startsWith('/api/')) return publicApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');

  if (pathname === '/' || pathname === '/index.html') {
    return send(res, 200, render.home(await content()), TYPES['.html'], { 'Cache-Control': 'no-cache' });
  }
  if (legal[pathname.slice(1)]) {
    const l = legal[pathname.slice(1)];
    const html = render.page(await content(), { title: `${l.title} — Iraady Ltd`, description: `${l.title} for Iraady Ltd.`, canonical: `https://iraady.com${pathname}`, main: l.main });
    return send(res, 200, html, TYPES['.html'], { 'Cache-Control': 'no-cache' });
  }
  if (pathname === '/projects.json') {
    return json(res, 200, (await content()).projects || [], { 'Cache-Control': 'public, max-age=300' });
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    res.setHeader('X-Robots-Tag', 'noindex');
    const asset = pathname.startsWith('/admin/') && within(PUBLIC, pathname);
    if (asset && /\.(js|css|svg)$/.test(pathname) && (await serveFile(res, asset, 'no-cache'))) return;
    return serveFile(res, path.join(PUBLIC, 'admin', 'index.html'), 'no-cache');
  }
  if (pathname.startsWith('/uploads/')) {
    const f = within(UPLOADS, pathname.slice('/uploads/'.length));
    if (f && (await serveFile(res, f, 'public, max-age=31536000, immutable'))) return;
    return send(res, 404, 'Not found');
  }
  const f = within(PUBLIC, pathname);
  if (f) {
    const cache = /\.(css|js)$/.test(f) ? 'public, max-age=300' : 'public, max-age=86400';
    if (await serveFile(res, f, cache)) return;
  }
  return send(res, 404, render.page(await content(), {
    title: 'Page not found — Iraady Ltd', description: 'Page not found', canonical: 'https://iraady.com/',
    main: '<section class="doc-hero"><p class="tag">404</p><h1>That page is not here.</h1><p><a class="btn btn-primary" href="/">Back to iraady.com</a></p></section>'
  }), TYPES['.html']);
}

(async () => {
  await store.init();
  await loadLegal();
  http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      if (!res.headersSent) json(res, status, { error: status >= 500 ? 'Something went wrong' : err.message });
      else res.end();
    });
  }).listen(PORT, () => console.log('iraady.com listening on', PORT));
})();
