// ─────────────────────────────────────────────────────────────────────────────
// db.js — SQLite storage for the portfolio CMS.
//
// Three things live here:
//   docs      one row holding the DRAFT and the PUBLISHED content document
//   users     the admin account(s), password stored as a scrypt hash
//   sessions  login sessions, so a refresh or a re-login keeps you signed in
//   media     a record of every uploaded file (the file itself lives on disk)
//
// The draft/published split is the whole point of the system: editing only ever
// touches `draft`, and the public website reads `published`. Nothing a visitor
// sees changes until Publish is pressed.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// node:sqlite is still flagged experimental and prints a warning on require().
// It is a Node built-in (no npm install, no native build), so we keep it but
// stop the noise from polluting the server log.
const origEmitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  if (String(warning).includes('SQLite')) return;
  return origEmitWarning.call(process, warning, ...rest);
};

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const now = () => new Date().toISOString();

function open(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS docs (
      id                INTEGER PRIMARY KEY CHECK (id = 1),
      draft             TEXT    NOT NULL,
      published         TEXT    NOT NULL,
      draft_updated_at  TEXT,
      published_at      TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    NOT NULL UNIQUE,
      pass_hash  TEXT    NOT NULL,
      created_at TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT    PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      created_at TEXT    NOT NULL,
      expires_at TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      url        TEXT    NOT NULL,
      name       TEXT,
      mime       TEXT,
      size       INTEGER,
      created_at TEXT    NOT NULL
    );
  `);
  return db;
}

function createStore(db) {
  const getDoc = db.prepare('SELECT * FROM docs WHERE id = 1');
  const initDoc = db.prepare(
    'INSERT INTO docs (id, draft, published, draft_updated_at, published_at) VALUES (1, ?, ?, ?, ?)'
  );
  const saveDraft = db.prepare('UPDATE docs SET draft = ?, draft_updated_at = ? WHERE id = 1');
  const savePublished = db.prepare(
    'UPDATE docs SET published = ?, published_at = ? WHERE id = 1'
  );

  return {
    // Seed the single row the first time the server ever runs.
    ensureDoc(seed) {
      if (getDoc.get()) return;
      const json = JSON.stringify(seed);
      initDoc.run(json, json, now(), now());
    },

    getDraft() {
      const row = getDoc.get();
      return row ? JSON.parse(row.draft) : null;
    },
    getPublished() {
      const row = getDoc.get();
      return row ? JSON.parse(row.published) : null;
    },
    getMeta() {
      const row = getDoc.get() || {};
      return {
        draftUpdatedAt: row.draft_updated_at || null,
        publishedAt: row.published_at || null
      };
    },
    setDraft(doc) {
      saveDraft.run(JSON.stringify(doc), now());
    },
    publish() {
      const row = getDoc.get();
      if (!row) return;
      savePublished.run(row.draft, now());
    },
    // "Discard changes" — throw the draft away and start again from what is live.
    discardDraft() {
      const row = getDoc.get();
      if (!row) return;
      saveDraft.run(row.published, now());
    },
    // True when the draft differs from what visitors are seeing.
    hasUnpublishedChanges() {
      const row = getDoc.get();
      if (!row) return false;
      return row.draft !== row.published;
    },

    // When a NEW field is added to the page (a new data-cms key, a new list, a
    // new section) it would otherwise never appear in a site that was seeded
    // before it existed. Copy in anything the stored document does not have yet,
    // and leave every existing value untouched.
    mergeMissingKeys(seed) {
      const row = getDoc.get();
      if (!row) return 0;
      let added = 0;
      // A key that was once written under a different spelling has to be moved,
      // not duplicated: an admin list named `workcards` created an empty
      // `data.workcards` while the seed used `data.workCards`, so the list showed
      // nothing and the real data was never seen.
      const RENAMES = { workcards: 'workCards' };
      const fix = doc => {
        doc.text = doc.text || {};
        doc.data = doc.data || {};
        doc.sections = doc.sections || {};
        for (const [from, to] of Object.entries(RENAMES)) {
          if (!(from in doc.data)) continue;
          const isEmpty = v => v === undefined || (Array.isArray(v) ? v.length === 0 : !v);
          // Only carry the old value across if it actually holds something. An
          // empty one is dropped instead, so the seed fills the real key below -
          // otherwise the empty stray would block it and the list stays blank.
          if (!isEmpty(doc.data[from]) && isEmpty(doc.data[to])) doc.data[to] = doc.data[from];
          delete doc.data[from];
          added++;
        }
        for (const k of Object.keys(seed.text || {})) {
          if (!(k in doc.text)) { doc.text[k] = seed.text[k]; added++; }
        }
        for (const k of Object.keys(seed.data || {})) {
          if (!(k in doc.data)) { doc.data[k] = seed.data[k]; added++; }
        }
        // A field added to an ITEM later (a skill's new image, say) never reaches
        // records that already exist - mergeMissingKeys only works at the top
        // level. Fill the gap from the seed's first item, but only for strings and
        // arrays: an absent string becomes '', an absent array becomes [], and
        // booleans/numbers are left alone so `visible: false` is never invented.
        for (const k of Object.keys(seed.data || {})) {
          const seedList = seed.data[k], docList = doc.data[k];
          if (!Array.isArray(seedList) || !Array.isArray(docList) || !seedList.length) continue;
          const shape = seedList[0];
          if (!shape || typeof shape !== 'object') continue;
          for (const item of docList) {
            if (!item || typeof item !== 'object') continue;
            for (const f of Object.keys(shape)) {
              if (f === 'visible' || f in item) continue;
              const blank = Array.isArray(shape[f]) ? [] : (typeof shape[f] === 'string' ? '' : undefined);
              if (blank !== undefined) { item[f] = blank; added++; }
            }
          }
        }
        for (const k of Object.keys(seed.sections || {})) {
          if (!(k in doc.sections)) { doc.sections[k] = seed.sections[k]; added++; }
        }
        return doc;
      };
      const draft = fix(JSON.parse(row.draft));
      const published = fix(JSON.parse(row.published));
      if (added) {
        // Keep the original timestamps: this is a migration, not an edit.
        saveDraft.run(JSON.stringify(draft), row.draft_updated_at || now());
        savePublished.run(JSON.stringify(published), row.published_at || now());
      }
      return added;
    },

    // ── users ──────────────────────────────────────────────────────────────
    findUser(username) {
      return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
    },
    findUserById(id) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
    },
    createUser(username, passHash) {
      db.prepare('INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)')
        .run(username, passHash, now());
    },
    countUsers() {
      return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    },
    setPassword(userId, passHash) {
      db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(passHash, userId);
    },

    // ── sessions ───────────────────────────────────────────────────────────
    createSession(token, userId, ttlMs) {
      db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .run(token, userId, now(), new Date(Date.now() + ttlMs).toISOString());
    },
    getSession(token) {
      const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
      if (!row) return null;
      if (new Date(row.expires_at).getTime() < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return null;
      }
      return row;
    },
    deleteSession(token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    },
    purgeExpiredSessions() {
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
    },

    // ── media ──────────────────────────────────────────────────────────────
    addMedia(rec) {
      db.prepare('INSERT INTO media (url, name, mime, size, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(rec.url, rec.name || '', rec.mime || '', rec.size || 0, now());
    },
    listMedia() {
      return db.prepare('SELECT * FROM media ORDER BY id DESC').all();
    },
    deleteMedia(url) {
      db.prepare('DELETE FROM media WHERE url = ?').run(url);
    }
  };
}

module.exports = { open, createStore };
