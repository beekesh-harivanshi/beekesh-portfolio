// ─────────────────────────────────────────────────────────────────────────────
// server.js — the portfolio CMS.
//
//   node cms/server.js            → http://localhost:4173        (public site)
//                                   http://localhost:4173/admin  (dashboard)
//
// Zero dependencies: only Node built-ins (http, fs, crypto, node:sqlite), so
// there is nothing to npm install and nothing to compile.
//
// The one rule that matters: EDITING NEVER TOUCHES THE LIVE SITE.
// Everything the admin changes goes into `draft`. The public page is rendered
// from `published`, and only /api/publish moves one into the other.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { open, createStore } = require('./lib/db');
const auth = require('./lib/auth');
const { render } = require('./lib/render');
const { externalise, sniffType } = require('./lib/media');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = process.env.TEMPLATE || path.join(ROOT, 'beekesh-portfolio.html');
const ADMIN_DIR = path.join(__dirname, 'public');
// Overridable so the same code can run against a copy (useful for testing, and
// for pointing a deployment at a mounted volume).
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, 'media');
const SEED = process.env.SEED || path.join(__dirname, 'seed.json');

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY = Number(process.env.MAX_UPLOAD_MB || 120) * 1024 * 1024;

fs.mkdirSync(MEDIA_DIR, { recursive: true });

const db = open(path.join(DATA_DIR, 'cms.db'));
const store = createStore(db);

// ── first run: create the admin account and seed the content ────────────────
function bootstrap() {
  if (!fs.existsSync(SEED)) {
    console.error('\n  seed.json is missing. Run:  node cms/import-content.js\n');
    process.exit(1);
  }

  // The seed carries the original artwork as data URIs. Writing them out here —
  // on EVERY boot, not just the first — means the database keeps only URLs while
  // the files can always be rebuilt. If cms/media/ is ever emptied, restarting
  // the server puts every image back under the same content-hashed name, and all
  // the existing /media/… URLs in the database start working again.
  const raw = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const before = new Set(fs.readdirSync(MEDIA_DIR));
  const seed = externalise(raw, MEDIA_DIR);
  const restored = fs.readdirSync(MEDIA_DIR).filter(f => !before.has(f)).length;

  store.ensureDoc(seed);
  const merged = store.mergeMissingKeys(seed);

  if (store.countUsers() === 0) {
    const username = process.env.ADMIN_USER || 'admin';
    // A real random password, printed once. It is only ever stored hashed.
    const password = process.env.ADMIN_PASS || crypto.randomBytes(9).toString('base64url');
    store.createUser(username, auth.hashPassword(password));
    console.log('\n  ┌──────────────────────────────────────────────┐');
    console.log('  │  Admin account created                       │');
    console.log('  └──────────────────────────────────────────────┘');
    console.log('     user      : ' + username);
    console.log('     password  : ' + password);
    console.log('     (change it after logging in — it is shown only once)\n');
  }
  if (restored) {
    console.log('  media: restored ' + restored + ' missing file(s) from seed.json');
  }
  if (merged) {
    console.log('  content: added ' + merged + ' new field(s) that this site did not have yet');
  }
  store.purgeExpiredSessions();
}

// ── the page template, cached until the file changes ────────────────────────
let tplCache = { mtime: 0, html: '' };
function template() {
  const st = fs.statSync(TEMPLATE);
  if (st.mtimeMs !== tplCache.mtime) {
    tplCache = { mtime: st.mtimeMs, html: fs.readFileSync(TEMPLATE, 'utf8') };
  }
  return tplCache.html;
}

// ── tiny helpers ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};
function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}
function sendJson(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('invalid JSON'); }
}

function serveFile(res, file, { download = false } = {}) {
  fs.readFile(file, (err, buf) => {
    if (err) { send(res, 404, 'Not found'); return; }
    let type = MIME[path.extname(file).toLowerCase()];
    if (!type) {
      // An older upload may have been saved with a useless extension such as
      // ".octet-stream". The bytes still say what the file is, so identify it
      // from them rather than serving a download the browser will not display.
      const s = sniffType(buf);
      type = s ? s.mime : 'application/octet-stream';
    }
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' };
    if (download) headers['Content-Disposition'] = 'attachment';
    send(res, 200, buf, headers);
  });
}

// Never let a client-supplied path climb out of its directory.
function safeJoin(base, rel) {
  const p = path.resolve(base, '.' + path.posix.normalize('/' + rel));
  return p.startsWith(base) ? p : null;
}

// ── request context ─────────────────────────────────────────────────────────
function context(req) {
  const cookies = auth.parseCookies(req.headers.cookie);
  const token = cookies[auth.SESSION_COOKIE];
  const session = token ? store.getSession(token) : null;
  return { token, session, authed: !!session };
}

const requireAuth = ctx => {
  if (!ctx.authed) {
    const e = new Error('not authenticated');
    e.status = 401;
    throw e;
  }
};

// ── routes ──────────────────────────────────────────────────────────────────
async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const method = req.method.toUpperCase();
  const ctx = context(req);

  // ── public website (published content only) ──────────────────────────────
  if (method === 'GET' && (p === '/' || p === '/index.html')) {
    const html = render(template(), store.getPublished(), 'public');
    return send(res, 200, html, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
  }

  // ── preview (draft content, admin only) ──────────────────────────────────
  if (method === 'GET' && p === '/preview') {
    if (!ctx.authed) return redirect(res, '/admin');
    const html = render(template(), store.getDraft(), 'preview');
    return send(res, 200, html, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
  }

  // ── admin dashboard ──────────────────────────────────────────────────────
  if (method === 'GET' && (p === '/admin' || p === '/admin/')) {
    return serveFile(res, path.join(ADMIN_DIR, 'admin.html'));
  }
  if (method === 'GET' && p.startsWith('/admin/assets/')) {
    const file = safeJoin(ADMIN_DIR, p.slice('/admin/assets/'.length));
    if (!file) return send(res, 400, 'Bad path');
    return serveFile(res, file);
  }

  // ── uploaded media ───────────────────────────────────────────────────────
  if (method === 'GET' && p.startsWith('/media/')) {
    const file = safeJoin(MEDIA_DIR, p.slice('/media/'.length));
    if (!file) return send(res, 400, 'Bad path');
    return serveFile(res, file);
  }

  // ── API ──────────────────────────────────────────────────────────────────
  if (p === '/api/session' && method === 'GET') {
    const me = ctx.authed ? store.findUserById(ctx.session.user_id) : null;
    return sendJson(res, 200, {
      authed: ctx.authed,
      username: me ? me.username : null,
      meta: store.getMeta(),
      unpublished: store.hasUnpublishedChanges()
    });
  }

  if (p === '/api/login' && method === 'POST') {
    const { username, password } = await readJson(req);
    const user = store.findUser(String(username || ''));
    // Always run the hash comparison so a missing user and a wrong password
    // take the same amount of time.
    const ok = user
      ? auth.verifyPassword(String(password || ''), user.pass_hash)
      : (auth.verifyPassword(String(password || ''), 'scrypt$16384$8$1$AAAA$AAAA'), false);
    if (!user || !ok) return sendJson(res, 401, { error: 'Wrong username or password.' });
    const token = auth.newToken();
    store.createSession(token, user.id, auth.SESSION_TTL_MS);
    return sendJson(res, 200, { ok: true, username: user.username }, {
      'Set-Cookie': auth.sessionCookie(token)
    });
  }

  if (p === '/api/logout' && method === 'POST') {
    if (ctx.token) store.deleteSession(ctx.token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
  }

  if (p === '/api/password' && method === 'POST') {
    requireAuth(ctx);
    const { current, next } = await readJson(req);
    if (String(next || '').length < 8) {
      return sendJson(res, 400, { error: 'New password must be at least 8 characters.' });
    }
    const me = store.findUserById(ctx.session.user_id);
    if (!me || !auth.verifyPassword(String(current || ''), me.pass_hash)) {
      return sendJson(res, 403, { error: 'Current password is wrong.' });
    }
    store.setPassword(me.id, auth.hashPassword(String(next)));
    return sendJson(res, 200, { ok: true });
  }

  if (p === '/api/content' && method === 'GET') {
    requireAuth(ctx);
    return sendJson(res, 200, {
      draft: store.getDraft(),
      published: store.getPublished(),
      meta: store.getMeta(),
      unpublished: store.hasUnpublishedChanges()
    });
  }

  if (p === '/api/save' && method === 'POST') {
    requireAuth(ctx);
    const { draft } = await readJson(req);
    if (!draft || typeof draft !== 'object') return sendJson(res, 400, { error: 'No draft supplied.' });
    store.setDraft(draft);
    return sendJson(res, 200, {
      ok: true, meta: store.getMeta(), unpublished: store.hasUnpublishedChanges()
    });
  }

  if (p === '/api/publish' && method === 'POST') {
    requireAuth(ctx);
    store.publish();
    return sendJson(res, 200, {
      ok: true, meta: store.getMeta(), unpublished: store.hasUnpublishedChanges()
    });
  }

  if (p === '/api/discard' && method === 'POST') {
    requireAuth(ctx);
    store.discardDraft();
    return sendJson(res, 200, {
      ok: true, draft: store.getDraft(), meta: store.getMeta(), unpublished: false
    });
  }

  // Media goes to disk; only the URL is stored. Nothing is ever base64'd into
  // the page or the database.
  if (p === '/api/upload' && method === 'POST') {
    requireAuth(ctx);
    const { name, data } = await readJson(req);
    if (!data) return sendJson(res, 400, { error: 'No file data.' });
    const m = /^data:([^;,]+);base64,(.*)$/s.exec(String(data));
    const declaredMime = m ? m[1] : 'application/octet-stream';
    const b64 = m ? m[2] : String(data);
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) return sendJson(res, 400, { error: 'Empty file.' });

    // Trust the bytes over the browser's filename and MIME type. A photo that
    // arrives as "application/octet-stream" with no extension would otherwise be
    // stored as .octet-stream and served as a download the browser never renders.
    const sniffed = sniffType(buf);
    const orig = path.basename(String(name || 'file'));
    let ext = sniffed ? sniffed.ext : path.extname(orig).toLowerCase();
    if (!ext || !MIME[ext]) {
      const guess = '.' + String(declaredMime.split('/')[1] || '').toLowerCase();
      ext = MIME[guess] ? guess : '.bin';
    }
    const mime = sniffed ? sniffed.mime : declaredMime;

    const stem = crypto.randomBytes(6).toString('hex');
    const filename = `${Date.now()}-${stem}${ext}`;
    fs.writeFileSync(path.join(MEDIA_DIR, filename), buf);

    const rec = { url: '/media/' + filename, name: orig, mime, size: buf.length };
    store.addMedia(rec);
    return sendJson(res, 200, { ok: true, ...rec });
  }

  if (p === '/api/media' && method === 'GET') {
    requireAuth(ctx);
    return sendJson(res, 200, { items: store.listMedia() });
  }

  if (p === '/api/media/delete' && method === 'POST') {
    requireAuth(ctx);
    const { url } = await readJson(req);
    const file = safeJoin(MEDIA_DIR, String(url || '').replace(/^\/media\//, ''));
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
    store.deleteMedia(String(url || ''));
    return sendJson(res, 200, { ok: true });
  }

  // ── anything else ────────────────────────────────────────────────────────
  return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
}

function redirect(res, to) {
  send(res, 302, '', { Location: to });
}

// ── server ──────────────────────────────────────────────────────────────────
bootstrap();

http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (err) {
    if (err && err.status === 401) {
      return sendJson(res, 401, { error: 'Please log in again.', login: true });
    }
    console.error('[error]', req.method, req.url, err && err.message);
    if (!res.headersSent) {
      sendJson(res, 500, { error: (err && err.message) || 'Server error' });
    }
  }
}).listen(PORT, HOST, () => {
  console.log(`\n  Portfolio CMS running`);
  console.log(`    website : http://${HOST}:${PORT}/`);
  console.log(`    admin   : http://${HOST}:${PORT}/admin`);
  console.log(`    preview : http://${HOST}:${PORT}/preview\n`);
});
