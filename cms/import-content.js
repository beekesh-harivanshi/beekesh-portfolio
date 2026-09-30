// ─────────────────────────────────────────────────────────────────────────────
// import-content.js — build cms/seed.json from the existing website.
//
//   node cms/import-content.js
//
// Reads the real content straight out of beekesh-portfolio.html (every list and
// every data-cms text value) so the CMS starts life holding exactly what the
// site shows today. Nothing is invented or re-typed by hand.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { countDataUris } = require('./lib/media');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'beekesh-portfolio.html');
const OUT = path.join(__dirname, 'seed.json');
const MEDIA_DIR = path.join(__dirname, 'media');

const SECTION_ORDER = ['hero', 'work', 'about', 'process', 'contact'];

// NOTE: the seed keeps its images as data URIs on purpose.
//
// The database only ever stores /media/… URLs, but the seed is the one file that
// still holds the bytes. The server externalises them on every boot, so if the
// media folder is ever lost the files are rebuilt from here with the same
// content-hashed names — and every existing URL in the database starts working
// again. Storing URLs in the seed too would make a lost media folder permanent.

const dom = new JSDOM(fs.readFileSync(TEMPLATE, 'utf8'), {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  beforeParse(w) {
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.confirm = () => true; w.alert = () => {};
    w.requestAnimationFrame = cb => setTimeout(cb, 0);
  }
});

setTimeout(() => {
  const w = dom.window;
  const d = w.document;
  const ev = code => w.eval(code);

  const list = name => {
    const v = ev(name);
    return Array.isArray(v) ? JSON.parse(JSON.stringify(v)) : [];
  };

  // Every element carrying a data-cms key, in document order.
  const text = {};
  d.querySelectorAll('[data-cms]').forEach(el => {
    const key = el.getAttribute('data-cms');
    if (!key || key in text) return;
    // Collapse the whitespace the markup uses for indentation.
    text[key] = el.textContent.replace(/\s+/g, ' ').trim();
  });

  // Images driven by the admin (data-cms-img) are stored in the same key map,
  // so one field type and one runtime path cover text and pictures alike.
  d.querySelectorAll('[data-cms-img]').forEach(el => {
    const key = el.getAttribute('data-cms-img');
    if (!key || key in text) return;
    const src = el.getAttribute('src') || '';
    text[key] = src.startsWith('data:') ? src : '';
  });

  const sections = {};
  SECTION_ORDER.forEach((id, i) => {
    sections[id] = { visible: true, order: i + 1 };
  });

  const seed = {
    version: 1,
    generatedAt: new Date().toISOString(),
    text,
    data: {
      stats: list('statsData'),
      tools: list('toolsData'),
      motion: list('motionData'),
      education: list('educationData'),
      languages: list('languagesData'),
      contact: list('contactData'),
      experience: list('experienceData'),
      process: list('processData'),
      skills: list('skillsData'),
      workCards: list('workCardsData'),
      navLinks: list('navLinksData'),
      heroButtons: list('heroButtonsData'),
      footerLinks: list('footerLinksData'),
      galleries: JSON.parse(JSON.stringify(ev('galleries') || {})),
      motionSub: ev('motionSubText') || ''
    },
    sections,
    custom: []
  };

  fs.writeFileSync(OUT, JSON.stringify(seed, null, 2), 'utf8');

  const counts = Object.entries(seed.data).map(([k, v]) =>
    `    ${k.padEnd(12)} ${Array.isArray(v) ? v.length + ' items' : typeof v === 'object' ? Object.keys(v).length + ' galleries' : 'text'}`);
  console.log('\n  cms/seed.json written from the live page\n');
  console.log('    text keys    ' + Object.keys(text).length);
  console.log(counts.join('\n'));
  console.log('    embedded art ' + countDataUris(seed) +
    ' data URIs kept in the seed (the server writes them to cms/media/ on boot)');
  console.log('    sections     ' + Object.keys(sections).join(', ') + '\n');
  process.exit(0);
}, 1200);
