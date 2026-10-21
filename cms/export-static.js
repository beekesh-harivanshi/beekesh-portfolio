'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { render } = require('./lib/render');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'beekesh-portfolio.html');
const DB_PATH = path.join(__dirname, 'data', 'cms.db');
const SEED = path.join(__dirname, 'seed.json');

let content = null;
if (fs.existsSync(DB_PATH)) {
  try {
    const db = new DatabaseSync(DB_PATH);
    const row = db.prepare('SELECT published FROM docs WHERE id = 1').get();
    if (row && row.published) content = JSON.parse(row.published);
  } catch (e) {
    console.warn('Could not read SQLite directly:', e.message);
  }
}

if (!content && fs.existsSync(SEED)) {
  content = JSON.parse(fs.readFileSync(SEED, 'utf8'));
}

if (!content) {
  console.error('Error: No content available to render.');
  process.exit(1);
}

const template = fs.readFileSync(TEMPLATE, 'utf8');
const html = render(template, content, 'public');
fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('✓ Successfully generated index.html');
