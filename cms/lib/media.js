// ─────────────────────────────────────────────────────────────────────────────
// media.js — move base64 data URIs out of the content document and onto disk.
//
// Two rules this enforces:
//   • the database stores only a URL (/media/…), never base64;
//   • the seed document keeps the bytes, so the files can always be rebuilt.
//
// Files are named after a hash of their own content, so running this again is
// free and never creates duplicates.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EXT_OF = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp',
  'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/avif': '.avif',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov'
};

const DATA_URI = /^data:([^;,]+);base64,(.*)$/s;

function urlFor(dataUri, mediaDir) {
  const m = DATA_URI.exec(dataUri);
  if (!m) return dataUri;
  const buf = Buffer.from(m[2], 'base64');
  const name = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12) +
    (EXT_OF[m[1]] || '.bin');
  const file = path.join(mediaDir, name);
  // Only write when missing — this is what makes it safe to run on every boot,
  // and what restores the files if the media folder is ever emptied.
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
  return '/media/' + name;
}

// Walk any JSON shape, replacing every data URI with a /media/… URL.
function externalise(node, mediaDir, counter) {
  if (typeof node === 'string') return node.startsWith('data:') ? urlFor(node, mediaDir) : node;
  if (Array.isArray(node)) return node.map(n => externalise(n, mediaDir, counter));
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = externalise(node[k], mediaDir, counter);
    return out;
  }
  return node;
}

// Count the data URIs in a document without rewriting anything.
function countDataUris(node) {
  if (typeof node === 'string') return node.startsWith('data:') ? 1 : 0;
  if (Array.isArray(node)) return node.reduce((n, x) => n + countDataUris(x), 0);
  if (node && typeof node === 'object') {
    return Object.keys(node).reduce((n, k) => n + countDataUris(node[k]), 0);
  }
  return 0;
}

// ── what IS this file? ──────────────────────────────────────────────────────
// A browser does not always send a usable filename or MIME type. A photo dragged
// from a download, pasted from a clipboard, or simply renamed arrives as
// `application/octet-stream` with no extension — and a file stored as
// `.octet-stream` is served as `application/octet-stream`, which makes the
// browser DOWNLOAD it instead of showing it. The image silently never appears.
//
// So the leading bytes are the only trustworthy source. Every format we accept
// has a fixed signature.
function sniffType(buf) {
  if (!buf || buf.length < 16) return null;
  const at = (o, s) => buf.slice(o, o + s.length).toString('latin1') === s;

  if (buf[0] === 0x89 && at(1, 'PNG')) return { ext: '.png', mime: 'image/png' };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: '.jpg', mime: 'image/jpeg' };
  if (at(0, 'GIF8')) return { ext: '.gif', mime: 'image/gif' };
  if (at(0, 'RIFF') && at(8, 'WEBP')) return { ext: '.webp', mime: 'image/webp' };
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { ext: '.webm', mime: 'video/webm' };
  }
  if (at(4, 'ftyp')) {
    const brand = buf.slice(8, 12).toString('latin1');
    if (brand === 'avif' || brand === 'avis') return { ext: '.avif', mime: 'image/avif' };
    if (brand.startsWith('hei') || brand === 'mif1' || brand === 'msf1') {
      return { ext: '.heic', mime: 'image/heic' };
    }
    if (brand === 'qt  ') return { ext: '.mov', mime: 'video/quicktime' };
    return { ext: '.mp4', mime: 'video/mp4' };
  }
  return null;
}

// Read just enough of a file to identify it (used when serving media back).
function sniffFile(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(32);
    const n = fs.readSync(fd, head, 0, 32, 0);
    fs.closeSync(fd);
    return sniffType(head.slice(0, n));
  } catch {
    return null;
  }
}

module.exports = { externalise, countDataUris, urlFor, sniffType, sniffFile };
