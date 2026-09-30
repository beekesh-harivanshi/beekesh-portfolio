/* ─────────────────────────────────────────────────────────────────────────────
   admin.js — the dashboard.
   A schema-driven editor: every section, field and list is described in the
   SCHEMA block below, and the UI is generated from it. Adding a new editable
   thing means adding a line of schema, not a new screen.
   ───────────────────────────────────────────────────────────────────────────── */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ══ SCHEMA ═══════════════════════════════════════════════════════════════ */

// Friendly names + input types for the plain text fields.
const TEXT = {
  'site.logo':          { label: 'Logo / brand name', type: 'text' },
  'footer.copyright':   { label: 'Footer copyright line', type: 'text' },
  'label.about-me':     { label: 'Label', type: 'text' },
  'about.name':         { label: 'Your name line', type: 'text' },
  'about.statement':    { label: 'Big statement', type: 'textarea' },
  'about.bio':          { label: 'Bio paragraph', type: 'textarea' },
  'about.role':         { label: 'Role, beside the name', type: 'text' },
  'about.meta.label.1': { label: 'Label above “Delhi, India”', type: 'text' },
  'about.meta.label.2': { label: 'Label above “Freelance projects”', type: 'text' },
  'about.meta.label.3': { label: 'Label above “2+ Years”', type: 'text' },
  'tools.title':        { label: 'Tools heading', type: 'text' },
  'tools.sub':          { label: 'Tools intro line', type: 'text' },
  'about.meta.1':       { label: 'Fact 1', type: 'text' },
  'about.meta.2':       { label: 'Fact 2', type: 'text' },
  'about.meta.3':       { label: 'Fact 3', type: 'text' },
  'hero.photo':         { label: 'Your photo', type: 'image',
                          sub: 'Shown in the round frame beside About Me. Leave empty to show the grey placeholder.' },
  'hero.photoHint':     { label: 'Photo placeholder text', type: 'text',
                          sub: 'The small line shown inside the grey circle while no photo is set.' },
  'hero.title':         { label: 'Big heading', type: 'rich',
                          sub: 'Wrap the words you want in italics inside [square brackets].' },
  'hero.badge':         { label: 'Availability badge', type: 'text' },
  'hero.tag':           { label: 'Small tag under the name', type: 'text' },
  'label.selected-work':{ label: 'Label', type: 'text' },
  'label.motion-graphics': { label: 'Motion section label', type: 'text' },
  'label.services-skills': { label: 'Skills section label', type: 'text' },
  'label.software-tools':  { label: 'Tools section label', type: 'text' },
  'label.experience':   { label: 'Experience label', type: 'text' },
  'label.education':    { label: 'Education label', type: 'text' },
  'label.languages':    { label: 'Languages label', type: 'text' },
  'label.design-process': { label: 'Process label', type: 'text' },
  'label.say-hello':    { label: 'Contact label', type: 'text' },
  'motionSub':          { label: 'Intro paragraph', type: 'textarea' },
  'process.title':      { label: 'Heading', type: 'rich',
                          sub: 'Wrap the word you want highlighted in [square brackets].' },
  'process.sub':        { label: 'Intro line', type: 'textarea' },
  'contact.form.title': { label: 'Form heading', type: 'text' },
  'contact.form.sub':   { label: 'Form sub-line', type: 'text' }
};
// The four Selected Work cards are a list now (see LISTS.workcards), so there are
// no per-card text keys any more.
TEXT['cta.text']        = { label: 'The line — clear it to hide this band', type: 'textarea' };
TEXT['cta.button']      = { label: 'Button label', type: 'text' };
TEXT['contact.headline'] = { label: 'Headline', type: 'textarea' };
TEXT['contact.tagline']  = { label: 'Line under the headline', type: 'textarea' };
const textMeta = k => TEXT[k] || { label: k.replace(/[._]/g, ' '), type: 'text' };

// List editors. `title` shows on each collapsed row; `fields` drives the form.
// Where a nav link or a hero button sends the visitor. Only the five real page
// sections can be targeted - that is what navClick() knows how to scroll to.
const SECTION_TARGETS = ['section-hero', 'section-work', 'section-about', 'section-process', 'section-contact'];
const SECTION_TARGET_LABELS = {
  'section-hero': 'Hero / About Me',
  'section-work': 'Selected Work',
  'section-about': 'About (Motion, Skills, Tools…)',
  'section-process': 'Design Process',
  'section-contact': 'Contact'
};

const LISTS = {
  footerLinks: {
    label: 'Footer links', add: 'Add link', blank: () => ({ label: '', href: '' }),
    title: it => it.label || '(empty)',
    fields: [
      { k: 'label', label: 'Text on the link', type: 'text' },
      { k: 'href', label: 'Where it goes', type: 'text',
        sub: 'A full https:// address, a mailto:, or a tel:. A web address opens in a new tab; the other two open in place.' }
    ]
  },
  navLinks: {
    label: 'Nav links', add: 'Add nav link', blank: () => ({ label: '', target: 'section-work', cta: false }),
    title: it => it.label || '(empty)',
    fields: [
      { k: 'label', label: 'Text on the link', type: 'text' },
      { k: 'target', label: 'Goes to', type: 'select',
        options: SECTION_TARGETS, optionLabels: SECTION_TARGET_LABELS },
      { k: 'cta', label: 'Draw it as the dark pill button', type: 'bool' }
    ]
  },
  heroButtons: {
    label: 'Hero buttons', add: 'Add button', blank: () => ({ label: '', target: 'section-work', style: 'primary' }),
    title: it => it.label || '(empty)',
    fields: [
      { k: 'label', label: 'Text on the button', type: 'text' },
      { k: 'target', label: 'Goes to', type: 'select',
        options: SECTION_TARGETS, optionLabels: SECTION_TARGET_LABELS },
      { k: 'style', label: 'Look', type: 'select', options: ['primary', 'outline'],
        optionLabels: { primary: 'dark, filled', outline: 'light, outlined' } }
    ]
  },
  // NOTE: the key must match the data key the page and the seed use (`workCards`,
  // capital C). A list named `workcards` created its own empty array and the real
  // data was never seen.
  workCards: {
    label: 'Selected Work cards', add: 'Add card',
    // No gallery by default: defaulting to one meant a new card instantly showed
    // that gallery's picture, which read as a duplicate of an existing card.
    blank: () => ({ gallery: '', tone: 'g1', label: '', title: '', meta: '' }),
    title: it => it.title || '(empty)',
    fields: [
      { k: 'title', label: 'Card title (shown on the card)', type: 'text' },
      { k: 'label', label: 'Small label (on the image)', type: 'text' },
      { k: 'meta', label: 'Meta line (under the title)', type: 'text' },
      { k: 'gallery', label: 'Gallery that opens when this card is clicked', type: 'select',
        options: ['', 'logo', 'social', 'poster', 'identity', 'card'],
        optionLabels: { '': '— none yet —', logo: 'Logo Design', social: 'Social Media',
                        poster: 'Poster Design', identity: 'Brand Identity', card: 'Business Card' } },
      { k: 'tone', label: 'Fallback colour (only used while the gallery has no image)', type: 'select',
        options: ['g1', 'g2', 'g3', 'g4'],
        optionLabels: { g1: 'Green', g2: 'Warm grey', g3: 'Blue', g4: 'Amber' } }
    ]
  },
  stats: {
    label: 'Stats strip', add: 'Add stat', blank: () => ({ num: '', label: '' }),
    title: it => it.num || '(empty)',
    fields: [
      { k: 'num', label: 'Number', type: 'text' },
      { k: 'label', label: 'Caption', type: 'text' }
    ]
  },
  skills: {
    label: 'Services & Skills', add: 'Add skill',
    blank: () => ({ image: '', icon: '', iconImg: '', title: '', sub: '', desc: '', details: '', includes: '', panelItems: [] }),
    title: it => it.title || '(empty)',
    fields: [
      { k: 'title', label: 'Title', type: 'text', group: 'On the card' },
      { k: 'sub', label: 'Subtitle', type: 'text', group: 'On the card',
        sub: 'A short line under the title.' },
      { k: 'desc', label: 'Description', type: 'textarea', group: 'On the card' },
      { k: 'image', label: 'Thumbnail image', type: 'image', group: 'On the card',
        sub: 'The small square beside the title. Leave it empty and the fallback below is used instead.' },
      { k: 'icon', label: 'Fallback icon (emoji or letters)', type: 'text', group: 'On the card',
        sub: 'Used when there is no thumbnail.' },
      { k: 'iconImg', label: 'Fallback image', type: 'image', group: 'On the card',
        sub: 'Also used when there is no thumbnail.' },
      { k: 'details', label: 'More detail', type: 'textarea', group: 'Inside the panel',
        sub: 'The longer text in the panel that opens when the card is clicked. Falls back to the description if you leave it empty.' },
      { k: 'panelItems', label: 'Panel images', type: 'gallery', group: 'Inside the panel',
        sub: 'Shown as numbered blocks — the same blocks the Selected Work panel uses.' },
      { k: 'includes', label: 'What is included', type: 'textarea', group: 'Inside the panel',
        sub: 'One item per line. Each becomes a bullet.' }
    ]
  },
  tools: {
    label: 'Software & Tools', add: 'Add software', blank: () => ({ name: '', desc: '', icon: '', bg: '#333333', iconImg: '' }),
    title: it => it.name || '(empty)',
    fields: [
      { k: 'name', label: 'Name', type: 'text' },
      { k: 'desc', label: 'Description', type: 'text' },
      { k: 'icon', label: 'Fallback letters', type: 'text', sub: 'Shown only when there is no icon image.' },
      { k: 'bg', label: 'Fallback background', type: 'color' },
      { k: 'iconImg', label: 'Icon image', type: 'image' }
    ]
  },
  motion: {
    label: 'Motion Graphics', add: 'Add motion card', blank: () => ({ title: '', category: '', sub: '', thumb: '', videos: [], wide: false, tone: 'forest' }),
    title: it => it.title || '(empty)',
    fields: [
      { k: 'title', label: 'Title', type: 'text' },
      { k: 'category', label: 'Category (small line above)', type: 'text' },
      { k: 'sub', label: 'Description', type: 'textarea' },
      { k: 'thumb', label: 'Poster image', type: 'image' },
      { k: 'tone', label: 'Colour theme', type: 'select', options: ['forest', 'ink', 'blue', 'plum', 'amber'] },
      { k: 'videos', label: 'Videos', type: 'videos' }
    ]
  },
  education: {
    label: 'Education', add: 'Add qualification', blank: () => ({ category: '', title: '', sub: '' }),
    title: it => it.title || '(empty)',
    fields: [
      { k: 'category', label: 'Category', type: 'text' },
      { k: 'title', label: 'Qualification', type: 'text' },
      { k: 'sub', label: 'Detail line', type: 'text' }
    ]
  },
  languages: {
    label: 'Languages', add: 'Add language', blank: () => ({ name: '', flag: '', level: '' }),
    title: it => it.name || '(empty)',
    fields: [
      { k: 'name', label: 'Language', type: 'text' },
      { k: 'flag', label: 'Flag', type: 'text' },
      { k: 'level', label: 'Level', type: 'text' }
    ]
  },
  experience: {
    label: 'Experience', add: 'Add experience', blank: () => ({ platform: '', title: '', duration: '', desc: '' }),
    title: it => it.title || '(empty)',
    fields: [
      { k: 'platform', label: 'Platform / small label', type: 'text' },
      { k: 'title', label: 'Role', type: 'text' },
      { k: 'duration', label: 'Duration', type: 'text' },
      { k: 'desc', label: 'Description', type: 'textarea' }
    ]
  },
  process: {
    label: 'Process steps', add: 'Add step', blank: () => ({ num: '', title: '', desc: '' }),
    title: it => (it.num ? it.num + ' · ' : '') + (it.title || '(empty)'),
    fields: [
      { k: 'num', label: 'Number', type: 'text' },
      { k: 'title', label: 'Title', type: 'text' },
      { k: 'desc', label: 'Description', type: 'textarea' }
    ]
  },
  contact: {
    label: 'Contact methods', add: 'Add contact method', blank: () => ({ label: '', value: '', sub: '', icon: '', iconBg: 'grey', iconImg: '', actionType: 'none', actionValue: '' }),
    title: it => it.label || '(empty)',
    fields: [
      { k: 'label', label: 'Label', type: 'text' },
      { k: 'value', label: 'Value (shown large)', type: 'text' },
      { k: 'sub', label: 'Second line', type: 'text' },
      { k: 'iconImg', label: 'Icon image', type: 'image' },
      { k: 'icon', label: 'Fallback icon (emoji)', type: 'text', sub: 'Used when no icon image is set.' },
      { k: 'iconBg', label: 'Fallback colour', type: 'text' },
      { k: 'actionType', label: 'Clicking it should…', type: 'select',
        options: ['none', 'whatsapp', 'email', 'phone', 'link'],
        optionLabels: { none: 'do nothing (just show it)', whatsapp: 'open WhatsApp', email: 'open the mail app', phone: 'call the number (on a phone) or copy it (on a computer)', link: 'open a web page' } },
      { k: 'actionValue', label: 'Action target', type: 'text', sub: 'A number, an email, or a full URL.' }
    ]
  }
};

// Galleries: the four project panels behind the Selected Work cards.
const GALLERY_KEYS = [
  { key: 'logo',     label: 'Logo Design' },
  { key: 'social',   label: 'Social Media' },
  { key: 'poster',   label: 'Poster Design' },
  { key: 'identity', label: 'Brand Identity' },
  { key: 'card',     label: 'Business Card (no card on the page)' }
];

// Listed top-to-bottom exactly as a visitor scrolls the page, and one entry per
// section — nothing is bundled, so every heading, list and gallery has its own
// panel. Clicking an entry opens that section alone.
const SECTIONS = [
  { id: 'nav',     label: 'Navigation bar',    hint: 'The bar at the very top',
    texts: ['site.logo'], lists: ['navLinks'] },
  { id: 'hero',    label: 'Hero / About Me',   hint: 'Name, statement, bio and your photo', page: 'hero',
    texts: ['hero.badge', 'hero.tag', 'hero.title', 'label.about-me', 'about.name', 'about.statement',
            'about.bio', 'about.role', 'about.meta.1', 'about.meta.2', 'about.meta.3',
            'about.meta.label.1', 'about.meta.label.2', 'about.meta.label.3',
            'hero.photo', 'hero.photoHint'],
    lists: ['heroButtons'] },
  { id: 'stats',   label: 'Stats strip',       hint: 'The dark band under the hero',
    texts: [], lists: ['stats'] },
  { id: 'work',    label: 'Selected Work',     hint: 'The four cards, and what opens when one is clicked', page: 'work',
    texts: ['label.selected-work'], lists: ['workCards'], galleries: true },
  { id: 'motion',  label: 'Motion Graphics',   hint: 'Video cards and their clips. Hide or move affects the whole About block', page: 'about',
    texts: ['label.motion-graphics', 'motionSub'], lists: ['motion'] },
  { id: 'skills',  label: 'Services & Skills', hint: 'The nine service cards',
    texts: ['label.services-skills'], lists: ['skills'] },
  { id: 'tools',   label: 'Software & Tools',  hint: 'Your software and their icons',
    texts: ['label.software-tools', 'tools.title', 'tools.sub'], lists: ['tools'] },
  { id: 'exp',     label: 'Experience',        hint: 'Work history',
    texts: ['label.experience'], lists: ['experience'] },
  { id: 'edu',     label: 'Education',         hint: 'Qualifications',
    texts: ['label.education'], lists: ['education'] },
  { id: 'lang',    label: 'Languages',         hint: 'Spoken languages',
    texts: ['label.languages'], lists: ['languages'] },
  { id: 'cta',     label: 'About CTA band',    hint: 'The “Have a project in mind?” line. Clear the text to hide the band',
    texts: ['cta.text', 'cta.button'], lists: [] },
  { id: 'process', label: 'Design Process',    hint: 'The four numbered steps', page: 'process',
    texts: ['label.design-process', 'process.title', 'process.sub'], lists: ['process'] },
  { id: 'contact', label: 'Contact',           hint: 'Your details and the message form', page: 'contact',
    texts: ['label.say-hello', 'contact.headline', 'contact.tagline',
            'contact.form.title', 'contact.form.sub'], lists: ['contact'] },
  { id: 'footer',  label: 'Footer',            hint: 'The line at the very bottom',
    texts: ['footer.copyright'], lists: ['footerLinks'] }
];

const BLOCK_TYPES = [
  { type: 'heading',   label: 'Heading',        blank: () => ({ type: 'heading', text: '' }) },
  { type: 'paragraph', label: 'Paragraph',      blank: () => ({ type: 'paragraph', text: '' }) },
  { type: 'image',     label: 'Image',          blank: () => ({ type: 'image', src: '', alt: '' }) },
  { type: 'video',     label: 'Video',          blank: () => ({ type: 'video', src: '' }) },
  { type: 'gallery',   label: 'Gallery',        blank: () => ({ type: 'gallery', items: [] }) },
  { type: 'cards',     label: 'Cards',          blank: () => ({ type: 'cards', items: [{ title: '', text: '', src: '' }] }) },
  { type: 'buttons',   label: 'Buttons',        blank: () => ({ type: 'buttons', items: [{ label: 'Click here', href: '#' }] }) },
  { type: 'contact',   label: 'Contact block',  blank: () => ({ type: 'contact', items: [{ label: '', value: '', href: '' }] }) },
  { type: 'custom',    label: 'Custom text',    blank: () => ({ type: 'custom', text: '' }) }
];

/* ══ STATE ════════════════════════════════════════════════════════════════ */
let state = {
  authed: false, username: null,
  content: null,          // the draft document being edited
  unpublished: false,
  dirty: false,
  meta: {},
  active: 'hero'
};

/* ══ API ══════════════════════════════════════════════════════════════════ */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin'
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && path !== '/api/login') { state.authed = false; renderLogin(); throw new Error('login'); }
  if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
  return data;
}

/* ══ SMALL UI HELPERS ═════════════════════════════════════════════════════ */
let toastTimer;
function toast(msg, isErr) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2400);
}

function confirmDialog(title, text, okLabel, tone) {
  return new Promise(resolve => {
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    const ok = $('#confirm-ok');
    ok.textContent = okLabel || 'Delete';
    // Red only for things that destroy something. Publishing is not destructive.
    ok.className = 'btn ' + (tone === 'primary' ? 'primary' : 'danger');
    $('#confirm-modal').classList.add('open');
    const done = val => {
      $('#confirm-modal').classList.remove('open');
      ok.onclick = null; $('#confirm-cancel').onclick = null;
      resolve(val);
    };
    ok.onclick = () => done(true);
    $('#confirm-cancel').onclick = () => done(false);
  });
}

function pickFile(accept) {
  return new Promise(resolve => {
    const input = $('#file-input');
    input.accept = accept || 'image/*';
    input.value = '';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

// Media is uploaded to the server and only its URL is kept — never base64.
async function upload(file) {
  const data = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const out = await api('/api/upload', { method: 'POST', body: { name: file.name, data } });

  // Say something when the file cannot be shown, instead of letting it disappear
  // silently. A HEIC photo (what an iPhone produces) is a valid image but most
  // browsers refuse to render it, so it looks exactly like a broken upload.
  const mime = String(out.mime || '');
  if (mime === 'image/heic' || mime === 'image/heif') {
    toast('This is a HEIC photo (from an iPhone) — most browsers cannot show it. Please upload a JPG or PNG.', true);
  } else if (!/^image\//.test(mime) && !/^video\//.test(mime)) {
    toast('That file type cannot be shown in a browser: ' + mime, true);
  }
  return out.url;
}

// Any image that fails to load gets a plain explanation instead of a broken icon.
function flagBrokenImages() {
  document.querySelectorAll('#main .thumb img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (img.dataset.checked === src) return;
    img.dataset.checked = src;
    const fail = () => {
      const box = img.closest('.thumb');
      if (!box || box.classList.contains('broken')) return;
      box.classList.add('broken');
      box.innerHTML = '<span class="broken-msg">This file will not display.<br>Upload it again as a JPG or PNG.</span>';
    };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0) fail();
  });
}

function markDirty() {
  state.dirty = true;
  paintStatus();
}

function paintStatus() {
  const el = $('#status');
  if (!el) return;
  let cls, text;
  if (state.dirty) { cls = 'dirty'; text = 'Unsaved changes'; }
  else if (state.unpublished) { cls = 'saved'; text = 'Saved — not published yet'; }
  else { cls = 'published'; text = 'Published'; }
  el.className = 'status ' + cls;
  el.innerHTML = '<span class="dot"></span>' + esc(text);
}

/* ══ LOGIN ════════════════════════════════════════════════════════════════ */
function renderLogin(message) {
  app.innerHTML = `
    <div class="login-wrap">
      <div class="login-shell">

        <aside class="login-brand">
          <div class="login-glow" aria-hidden="true"></div>
          <div class="login-brand-top">
            <span class="login-mark"></span>
            <span class="login-word">Beekesh</span>
          </div>
          <div class="login-brand-copy">
            <h2>Content studio</h2>
            <p>Edit the words, the pictures and the order they appear in. Nothing reaches
               the live site until you press Publish.</p>
          </div>
          <ul class="login-brand-points">
            <li><span>1</span> Edit the draft</li>
            <li><span>2</span> Check the preview</li>
            <li><span>3</span> Publish</li>
          </ul>
        </aside>

        <main class="login-side">
          <form class="login-card" id="login-form">
            <h1>Sign in</h1>
            <p>Use your admin username and password.</p>
            ${message ? `<div class="login-error">${esc(message)}</div>` : ''}
            <label for="u">Username</label>
            <input id="u" name="username" autocomplete="username" autofocus>
            <label for="p">Password</label>
            <input id="p" name="password" type="password" autocomplete="current-password">
            <button class="btn primary" style="width:100%;padding:12px" type="submit">Sign in</button>
          </form>
        </main>

      </div>
    </div>`;
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = $('#u').value, password = $('#p').value;
    try {
      await api('/api/login', { method: 'POST', body: { username, password } });
      await boot();
    } catch (err) {
      renderLogin(err.message === 'login' ? 'Please sign in.' : err.message);
    }
  });
}

/* ══ DASHBOARD SHELL ══════════════════════════════════════════════════════ */
function renderShell() {
  app.innerHTML = `
    <div class="shell">
      <div class="topbar">
        <div class="brand">Portfolio Admin<small>${esc(state.username || '')}</small></div>
        <div class="spacer"></div>
        <span class="status" id="status"></span>
        <button class="btn" id="btn-preview">Preview</button>
        <button class="btn" id="btn-save">Save</button>
        <button class="btn publish" id="btn-publish">Publish</button>
        <button class="btn ghost" id="btn-discard">Discard changes</button>
        <button class="btn ghost" id="btn-menu">⋯</button>
      </div>
      <div class="body">
        <div class="side" id="side"></div>
        <div class="main" id="main"></div>
      </div>
    </div>`;

  $('#btn-save').onclick = () => save(true);
  $('#btn-publish').onclick = () => publish();
  $('#btn-discard').onclick = () => discard();
  $('#btn-preview').onclick = () => preview();
  $('#btn-menu').onclick = () => accountMenu();

  paintStatus();
  renderSide();
  renderMain();
}

function renderSide() {
  const c = state.content;
  const rows = SECTIONS.map(s => {
    // Only entries that own a real page section carry the hide / move controls.
    const meta = s.page ? (c.sections[s.page] || { visible: true }) : null;
    const hidden = meta && meta.visible === false;
    const counts = s.lists.reduce((n, k) => n + ((c.data[k] || []).length), 0);
    return `<button class="nav-item${state.active === s.id ? ' active' : ''}${hidden ? ' hidden' : ''}" data-go="${s.id}">
        <span class="n">${esc(s.label)}</span>
        ${counts ? `<span class="badge">${counts}</span>` : ''}
      </button>`;
  }).join('');

  const custom = (c.custom || []);
  const customRows = custom.map((s, i) => `
      <button class="nav-item${state.active === 'c:' + s.id ? ' active' : ''}${s.visible === false ? ' hidden' : ''}" data-go="c:${esc(s.id)}">
        <span class="n">${esc(s.title || s.label || 'Section ' + (i + 1))}</span>
      </button>`).join('');

  $('#side').innerHTML = `
    <h2>Website sections</h2>
    ${rows}
    <h2>Your own sections</h2>
    ${customRows || '<div class="empty" style="padding:14px 8px">None yet</div>'}
    <div style="padding:10px 4px 0">
      <button class="btn sm" id="btn-add-section" style="width:100%">+ Add New Section</button>
    </div>
    <h2>Files</h2>
    <button class="nav-item${state.active === 'media' ? ' active' : ''}" data-go="media">
      <span class="n">Media library</span>
    </button>`;

  $('#side').querySelectorAll('[data-go]').forEach(b => {
    b.onclick = () => { state.active = b.getAttribute('data-go'); renderSide(); renderMain(); };
  });
  $('#btn-add-section').onclick = () => addSectionDialog();
}

function renderMain() {
  const id = state.active;
  if (id === 'media') return renderMediaPage();
  if (id.startsWith('c:')) return renderCustomSection(id.slice(2));
  const s = SECTIONS.find(x => x.id === id) || SECTIONS[1];
  const c = state.content;

  const meta = s.page ? (c.sections[s.page] || (c.sections[s.page] = { visible: true, order: 1 })) : null;

  const header = `
    <div class="main-head">
      <div>
        <h1>${esc(s.label)}</h1>
        <p>${s.hint ? esc(s.hint) + ' · ' : ''}Changes here go to the draft. They reach the live website only when you press Publish.</p>
      </div>
      <div class="spacer"></div>
      ${meta ? `
        <label class="btn" style="display:inline-flex;gap:8px;align-items:center">
          <input type="checkbox" id="sec-visible" ${meta.visible === false ? '' : 'checked'} style="margin:0">
          Show this section
        </label>
        <button class="btn" id="sec-up">Move up</button>
        <button class="btn" id="sec-down">Move down</button>` : ''}
    </div>`;

  const texts = s.texts.length ? `
    <div class="card">
      <h3>Text</h3>
      <p class="hint">Every word here appears on the website exactly as typed.</p>
      ${s.texts.map(k => textField(k)).join('')}
    </div>` : '';

  const lists = s.lists.map(k => listCard(k)).join('');
  const galleries = s.galleries ? galleryCards() : '';

  $('#main').innerHTML = header + texts + lists + galleries +
    `<div style="height:40px"></div>`;

  if (meta) {
    $('#sec-visible').onchange = e => {
      meta.visible = e.target.checked;
      markDirty(); renderSide();
    };
    $('#sec-up').onclick = () => moveSection(s.page, -1);
    $('#sec-down').onclick = () => moveSection(s.page, +1);
  }
  wireMain();
}

function moveSection(id, dir) {
  const c = state.content;
  // Only the real page sections can be reordered - the rest live inside one.
  const ids = [...new Set(SECTIONS.filter(s => s.page).map(s => s.page))];
  const ordered = ids.slice().sort((a, b) => ((c.sections[a] || {}).order || 0) - ((c.sections[b] || {}).order || 0));
  const i = ordered.indexOf(id);
  const j = i + dir;
  if (j < 0 || j >= ordered.length) return;
  ordered.splice(j, 0, ordered.splice(i, 1)[0]);
  ordered.forEach((sid, n) => { c.sections[sid].order = n + 1; });
  markDirty(); renderMain();
}

/* ══ FIELDS ═══════════════════════════════════════════════════════════════ */
function textField(key) {
  const m = textMeta(key);
  const val = (state.content.text || {})[key] ?? '';
  const set = v => { (state.content.text || (state.content.text = {}))[key] = v; markDirty(); };
  const id = 't-' + key.replace(/[^a-z0-9]/gi, '-');

  if (m.type === 'image') {
    return `<div class="field"><label>${esc(m.label)}</label>
      <div class="media">
        <div class="thumb">${val ? `<img src="${esc(val)}" alt="">` : 'no image'}</div>
        <div>
          <div class="acts">
            <button class="btn sm" data-act="text-img" data-arg="${esc(key)}">${val ? 'Replace' : 'Upload'}</button>
            <button class="btn sm" data-act="text-img-pick" data-arg="${esc(key)}">Choose</button>
            ${val ? `<button class="btn sm danger" data-act="text-img-clear" data-arg="${esc(key)}">Remove</button>` : ''}
          </div>
          ${val ? `<div class="path">${esc(val)}</div>` : ''}
        </div>
      </div>
      ${m.sub ? `<div class="sub">${esc(m.sub)}</div>` : ''}</div>`;
  }
  if (m.type === 'textarea') {
    return `<div class="field"><label for="${id}">${esc(m.label)}</label>
      <textarea id="${id}" data-key="${esc(key)}">${esc(val)}</textarea>
      ${m.sub ? `<div class="sub">${esc(m.sub)}</div>` : ''}</div>`;
  }
  return `<div class="field"><label for="${id}">${esc(m.label)}</label>
    <input id="${id}" type="text" data-key="${esc(key)}" value="${esc(val)}">
    ${m.sub ? `<div class="sub">${esc(m.sub)}</div>` : ''}</div>`;
}

// Live-bind every text input in the main pane.
function wireMain() {
  $('#main').querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    el.addEventListener('input', () => {
      (state.content.text || (state.content.text = {}))[key] = el.value;
      markDirty();
    });
  });
  $('#main').querySelectorAll('[data-path]').forEach(el => {
    const path = el.getAttribute('data-path');
    const kind = el.getAttribute('data-kind');
    const handler = () => {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      setPath(path, kind === 'number' ? Number(v) : v);
      markDirty();
    };
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', handler);
  });
  $('#main').querySelectorAll('[data-act]').forEach(b => {
    b.onclick = () => handleAction(b.getAttribute('data-act'), b.getAttribute('data-arg'));
  });
}

// path syntax: data.tools.2.name  |  custom.<id>.blocks.0.text
function getPath(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state.content);
}
function setPath(path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((o, k) => (o == null ? o : o[k]), state.content);
  if (parent) parent[last] = value;
}

/* ══ LIST EDITOR ══════════════════════════════════════════════════════════ */
function listCard(key) {
  const def = LISTS[key];
  const items = state.content.data[key] || (state.content.data[key] = []);
  const open = openItems[key] || {};

  const rows = items.map((it, i) => {
    const isOpen = !!open[i];
    return `
    <div class="item${it.visible === false ? ' hidden' : ''}">
      <div class="item-head">
        <span class="pos">${i + 1}</span>
        <span class="title">${esc(def.title(it))}</span>
        <div class="item-acts">
          <button class="icon-btn" data-act="list-toggle" data-arg="${key}:${i}" title="${isOpen ? 'Collapse' : 'Expand'}">${isOpen ? '▾' : '▸'}</button>
          <button class="icon-btn" data-act="list-up" data-arg="${key}:${i}" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
          <button class="icon-btn" data-act="list-down" data-arg="${key}:${i}" ${i === items.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
          <button class="icon-btn" data-act="list-hide" data-arg="${key}:${i}" title="${it.visible === false ? 'Show' : 'Hide'}">${it.visible === false ? '🚫' : '👁'}</button>
          <button class="icon-btn" data-act="list-dup" data-arg="${key}:${i}" title="Duplicate">⧉</button>
          <button class="icon-btn danger" data-act="list-del" data-arg="${key}:${i}" title="Delete">✕</button>
        </div>
      </div>
      ${isOpen ? `<div class="item-body">${def.fields.map((f, fi) => {
        // A small heading whenever the group changes, so fields that belong to the
        // card are never mixed in with the ones that belong to the panel.
        const prev = def.fields[fi - 1];
        const head = f.group && (!prev || prev.group !== f.group)
          ? `<div class="field-group">${esc(f.group)}</div>` : '';
        return head + itemField(key, i, f);
      }).join('')}</div>` : ''}
    </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-head">
        <h3>${esc(def.label)}</h3>
        <span class="badge" style="font-size:12px;color:var(--ink3)">${items.length} item${items.length === 1 ? '' : 's'}</span>
        <div class="spacer"></div>
        <button class="btn sm" data-act="list-add" data-arg="${key}">+ ${esc(def.add)}</button>
      </div>
      ${items.length ? rows : '<div class="empty">Nothing here yet.</div>'}
    </div>`;
}

const openItems = {};

function itemField(listKey, i, f) {
  const base = `data.${listKey}.${i}.${f.k}`;
  const val = (state.content.data[listKey][i] || {})[f.k];
  const id = `${listKey}-${i}-${f.k}`;
  const sub = f.sub ? `<div class="sub">${esc(f.sub)}</div>` : '';

  if (f.type === 'textarea') {
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>
      <textarea id="${id}" data-path="${base}">${esc(val || '')}</textarea>${sub}</div>`;
  }
  if (f.type === 'select') {
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>
      <select id="${id}" data-path="${base}">
        ${f.options.map(o => `<option value="${esc(o)}"${val === o ? ' selected' : ''}>${esc((f.optionLabels && f.optionLabels[o]) || o)}</option>`).join('')}
      </select>${sub}</div>`;
  }
  if (f.type === 'bool') {
    return `<div class="field"><label style="display:flex;gap:9px;align-items:center;text-transform:none;font-size:14px;color:var(--ink)">
      <input type="checkbox" data-path="${base}" data-kind="bool" ${val ? 'checked' : ''} style="margin:0"> ${esc(f.label)}</label>${sub}</div>`;
  }
  if (f.type === 'color') {
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>
      <input id="${id}" type="text" data-path="${base}" value="${esc(val || '')}">${sub}</div>`;
  }
  if (f.type === 'image') {
    return `<div class="field"><label>${esc(f.label)}</label>
      <div class="media">
        <div class="thumb">${val ? `<img src="${esc(val)}" alt="">` : 'no image'}</div>
        <div>
          <div class="acts">
            <button class="btn sm" data-act="img-up" data-arg="${base}">${val ? 'Replace' : 'Upload'}</button>
            <button class="btn sm" data-act="img-pick" data-arg="${base}">Choose</button>
            ${val ? `<button class="btn sm danger" data-act="img-clear" data-arg="${base}">Remove</button>` : ''}
          </div>
          ${val ? `<div class="path">${esc(val)}</div>` : ''}
        </div>
      </div>${sub}</div>`;
  }
  if (f.type === 'gallery') {
    const rows = Array.isArray(val) ? val : [];
    return `<div class="field"><label>${esc(f.label)}</label>
      <div class="sub-list">
        ${rows.map((it, j) => `
          <div class="sub-item">
            <span class="sub-thumb">${it && it.src ? `<img src="${esc(it.src)}" alt="">` : '—'}</span>
            <input type="text" data-path="${base}.${j}.cap" value="${esc((it && it.cap) || '')}" placeholder="Caption (optional)">
            <span class="sub-acts">
              <button class="btn sm" data-act="sub-img" data-arg="${listKey}:${i}:${j}">${it && it.src ? 'Replace' : 'Upload'}</button>
              <button class="icon-btn" data-act="sub-up" data-arg="${listKey}:${i}:${j}" ${j === 0 ? 'disabled' : ''} title="Move up">↑</button>
              <button class="icon-btn" data-act="sub-down" data-arg="${listKey}:${i}:${j}" ${j === rows.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
              <button class="icon-btn danger" data-act="sub-del" data-arg="${listKey}:${i}:${j}" title="Delete">✕</button>
            </span>
          </div>`).join('') || '<div class="empty" style="padding:12px">No images yet.</div>'}
      </div>
      <div style="margin-top:10px">
        <button class="btn sm" data-act="sub-add" data-arg="${listKey}:${i}">+ Add image</button>
      </div>${sub}</div>`;
  }
  if (f.type === 'videos') {
    const vids = Array.isArray(val) ? val : [];
    return `<div class="field"><label>${esc(f.label)} (${vids.length})</label>
      ${vids.map((v, n) => `
        <div class="media" style="margin-bottom:9px">
          <div class="thumb wide">${v.src ? `<video src="${esc(v.src)}" muted></video>` : 'no video'}</div>
          <div>
            <div class="path">${esc(v.name || v.src || '')}</div>
            <div class="acts" style="margin-top:7px">
              <button class="btn sm danger" data-act="vid-del" data-arg="${base}:${n}">Remove</button>
            </div>
          </div>
        </div>`).join('')}
      <button class="btn sm" data-act="vid-add" data-arg="${base}">+ Add video</button>
      <button class="btn sm" data-act="vid-pick" data-arg="${base}">Choose video</button>${sub}</div>`;
  }
  return `<div class="field"><label for="${id}">${esc(f.label)}</label>
    <input id="${id}" type="text" data-path="${base}" value="${esc(val || '')}">${sub}</div>`;
}

/* ══ GALLERIES ════════════════════════════════════════════════════════════ */
function galleryCards() {
  const g = state.content.data.galleries || (state.content.data.galleries = {});
  return GALLERY_KEYS.map(({ key, label }) => {
    const gal = g[key] || (g[key] = { eyebrow: '', title: '', sub: '', thumb: '', items: [] });
    const items = gal.items || (gal.items = []);
    const base = 'data.galleries.' + key;

    const galOpen = openItems['gal:' + key] || {};
    const rows = items.map((it, i) => {
      const isOpen = !!galOpen[i];
      return `
      <div class="item">
        <div class="item-head">
          <span class="pos">${i + 1}</span>
          ${it.src ? `<span class="mini-thumb"><img src="${esc(it.src)}" alt=""></span>` : ''}
          <span class="title">${esc((it.cap || '').slice(0, 70) || '(no caption)')}</span>
          <div class="item-acts">
            <button class="icon-btn" data-act="gal-toggle" data-arg="${key}:${i}" title="${isOpen ? 'Collapse' : 'Expand'}">${isOpen ? '\u25be' : '\u25b8'}</button>
            <button class="icon-btn" data-act="gal-up" data-arg="${key}:${i}" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
            <button class="icon-btn" data-act="gal-down" data-arg="${key}:${i}" ${i === items.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
            <button class="icon-btn danger" data-act="gal-del" data-arg="${key}:${i}" title="Delete">✕</button>
          </div>
        </div>
        ${isOpen ? '<div class="item-body">' : ''}
          <div class="field"><label>Image</label>
            <div class="media">
              <div class="thumb wide">${it.src ? `<img src="${esc(it.src)}" alt="">` : 'no image'}</div>
              <div class="acts">
                <button class="btn sm" data-act="gal-img" data-arg="${key}:${i}">${it.src ? 'Replace' : 'Upload'}</button>
              </div>
            </div>
          </div>
          <div class="field"><label>Caption — shown under this image in the panel</label>
            <textarea rows="2" data-path="${base}.items.${i}.cap">${esc(it.cap || '')}</textarea></div>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="card">
      <div class="card-head">
        <h3>${esc(label)}</h3>
        <span class="badge" style="font-size:12px;color:var(--ink3)">${items.length} item${items.length === 1 ? '' : 's'}</span>
        <div class="spacer"></div>
        <button class="btn sm" data-act="gal-add" data-arg="${key}">+ Add image</button>
      </div>
      <p class="hint"><strong>This text appears inside the panel</strong> that opens when the
        “${esc(label)}” card is clicked. It does not change the card itself — the card's own title,
        label and meta line are under <em>Selected Work cards</em> above.</p>
      <div class="grid2">
        <div class="field"><label>Small label (inside the panel)</label>
          <input type="text" data-path="${base}.eyebrow" value="${esc(gal.eyebrow || '')}"></div>
        <div class="field"><label>Heading (inside the panel)</label>
          <input type="text" data-path="${base}.title" value="${esc(gal.title || '')}"></div>
      </div>
      <div class="field"><label>Intro text (inside the panel)</label>
        <textarea data-path="${base}.sub">${esc(gal.sub || '')}</textarea></div>
      <div class="field"><label>Card thumbnail (optional)</label>
        <div class="media">
          <div class="thumb wide">${gal.thumb ? `<img src="${esc(gal.thumb)}" alt="">` : 'auto'}</div>
          <div class="acts">
            <button class="btn sm" data-act="gal-thumb" data-arg="${key}">${gal.thumb ? 'Replace' : 'Upload'}</button>
            ${gal.thumb ? `<button class="btn sm danger" data-act="gal-thumb-clear" data-arg="${key}">Remove</button>` : ''}
          </div>
        </div>
        <div class="sub">Leave empty and the card uses the first image you add.</div>
      </div>
      ${items.length ? rows : '<div class="empty">No images yet.</div>'}
    </div>`;
  }).join('');
}

/* ══ CUSTOM SECTIONS ══════════════════════════════════════════════════════ */
function addSectionDialog() {
  const list = BLOCK_TYPES.map(b => `<button class="btn" data-pick="${b.type}" style="text-align:left">${esc(b.label)}</button>`).join('');
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:520px">
      <h3>Add a new section</h3>
      <p>Pick what the section should hold. You can add more blocks to it afterwards.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;max-height:320px;overflow:auto">${list}</div>
      <div class="modal-acts" style="margin-top:22px"><button class="btn" data-cancel>Cancel</button></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-cancel]').onclick = () => modal.remove();
  modal.querySelectorAll('[data-pick]').forEach(b => {
    b.onclick = () => {
      const type = b.getAttribute('data-pick');
      const def = BLOCK_TYPES.find(t => t.type === type);
      const id = 's' + Date.now().toString(36);
      const custom = state.content.custom || (state.content.custom = []);
      custom.push({
        id, label: def.label, title: '', visible: true,
        order: custom.length + 1, background: '',
        blocks: [def.blank()]
      });
      modal.remove();
      state.active = 'c:' + id;
      markDirty(); renderSide(); renderMain();
      toast('Section added — press Save, then Publish');
    };
  });
}

function renderCustomSection(id) {
  const s = (state.content.custom || []).find(x => x.id === id);
  if (!s) { state.active = 'hero'; return renderMain(); }
  const base = `custom.${(state.content.custom || []).indexOf(s)}`;

  const blocks = (s.blocks || []).map((b, i) => `
    <div class="item">
      <div class="item-head">
        <span class="pos">${i + 1}</span>
        <span class="title">${esc((BLOCK_TYPES.find(t => t.type === b.type) || {}).label || b.type)}</span>
        <div class="item-acts">
          <button class="icon-btn" data-act="blk-up" data-arg="${id}:${i}" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
          <button class="icon-btn" data-act="blk-down" data-arg="${id}:${i}" ${i === (s.blocks.length - 1) ? 'disabled' : ''} title="Move down">↓</button>
          <button class="icon-btn danger" data-act="blk-del" data-arg="${id}:${i}" title="Delete">✕</button>
        </div>
      </div>
      <div class="item-body">${blockFields(base, i, b)}</div>
    </div>`).join('');

  $('#main').innerHTML = `
    <div class="main-head">
      <div>
        <h1>${esc(s.title || s.label || 'Section')}</h1>
        <p>This section was created from the dashboard. It sits at the bottom of the page.</p>
      </div>
      <div class="spacer"></div>
      <label class="btn" style="display:inline-flex;gap:8px;align-items:center">
        <input type="checkbox" data-path="${base}.visible" data-kind="bool" ${s.visible === false ? '' : 'checked'} style="margin:0">
        Show this section
      </label>
      <button class="btn" data-act="sec-up" data-arg="${id}">Move up</button>
      <button class="btn" data-act="sec-down" data-arg="${id}">Move down</button>
      <button class="btn danger" data-act="sec-del" data-arg="${id}">Delete section</button>
    </div>
    <div class="card">
      <h3>Section</h3>
      <div class="grid2">
        <div class="field"><label>Menu name (for your reference)</label>
          <input type="text" data-path="${base}.label" value="${esc(s.label || '')}"></div>
        <div class="field"><label>Heading (optional)</label>
          <input type="text" data-path="${base}.title" value="${esc(s.title || '')}"></div>
      </div>
      <div class="field"><label>Background colour (optional)</label>
        <input type="text" data-path="${base}.background" value="${esc(s.background || '')}" placeholder="e.g. #3a3a3a or leave empty">
        <div class="sub">Leave empty for the normal page background.</div></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Content blocks</h3><div class="spacer"></div>
        <button class="btn sm" data-act="blk-add" data-arg="${id}">+ Add block</button></div>
      ${blocks || '<div class="empty">No blocks yet.</div>'}
    </div>
    <div style="height:40px"></div>`;
  wireMain();
}

function blockFields(base, i, b) {
  const p = `${base}.blocks.${i}`;
  if (b.type === 'heading') return `<div class="field"><label>Heading text</label><input type="text" data-path="${p}.text" value="${esc(b.text || '')}"></div>`;
  if (b.type === 'paragraph') return `<div class="field"><label>Paragraph</label><textarea data-path="${p}.text" style="min-height:120px">${esc(b.text || '')}</textarea></div>`;
  if (b.type === 'custom') return `<div class="field"><label>Text (line breaks are kept)</label><textarea data-path="${p}.text" style="min-height:140px">${esc(b.text || '')}</textarea></div>`;
  if (b.type === 'image') return `
      <div class="field"><label>Image</label>
        <div class="media">
          <div class="thumb wide">${b.src ? `<img src="${esc(b.src)}" alt="">` : 'no image'}</div>
          <div class="acts">
            <button class="btn sm" data-act="img-up" data-arg="${p}.src">${b.src ? 'Replace' : 'Upload'}</button>
            ${b.src ? `<button class="btn sm danger" data-act="img-clear" data-arg="${p}.src">Remove</button>` : ''}
          </div>
        </div>
      </div>
      <div class="field"><label>Alt text</label><input type="text" data-path="${p}.alt" value="${esc(b.alt || '')}"></div>`;
  if (b.type === 'video') return `
      <div class="field"><label>Video</label>
        <div class="media">
          <div class="thumb wide">${b.src ? `<video src="${esc(b.src)}" muted></video>` : 'no video'}</div>
          <div class="acts">
            <button class="btn sm" data-act="vid-up" data-arg="${p}.src">${b.src ? 'Replace' : 'Upload'}</button>
            ${b.src ? `<button class="btn sm danger" data-act="img-clear" data-arg="${p}.src">Remove</button>` : ''}
          </div>
        </div>
        <div class="sub">MP4 or WebM. Large files are stored as a file on the server, not in the page.</div>
      </div>`;
  if (b.type === 'gallery') return `
      <div class="field"><label>Gallery images</label>
        ${(b.items || []).map((it, n) => `
          <div class="media" style="margin-bottom:9px">
            <div class="thumb wide">${it.src ? `<img src="${esc(it.src)}" alt="">` : 'no image'}</div>
            <div class="acts">
              <button class="btn sm" data-act="gimg-up" data-arg="${p}.items.${n}.src">${it.src ? 'Replace' : 'Upload'}</button>
              <button class="btn sm danger" data-act="arr-del" data-arg="${p}.items:${n}">Remove</button>
            </div>
          </div>`).join('')}
        <button class="btn sm" data-act="arr-add" data-arg="${p}.items:gallery">+ Add image</button>
      </div>`;
  if (b.type === 'cards') return `
      <div class="field"><label>Cards</label>
        ${(b.items || []).map((it, n) => `
          <div class="item" style="margin-bottom:9px"><div class="item-body">
            <div class="field"><label>Title</label><input type="text" data-path="${p}.items.${n}.title" value="${esc(it.title || '')}"></div>
            <div class="field"><label>Text</label><textarea data-path="${p}.items.${n}.text">${esc(it.text || '')}</textarea></div>
            <div class="media">
              <div class="thumb wide">${it.src ? `<img src="${esc(it.src)}" alt="">` : 'no image'}</div>
              <div class="acts">
                <button class="btn sm" data-act="img-up" data-arg="${p}.items.${n}.src">${it.src ? 'Replace' : 'Upload image'}</button>
                <button class="btn sm danger" data-act="arr-del" data-arg="${p}.items:${n}">Remove card</button>
              </div>
            </div>
          </div></div>`).join('')}
        <button class="btn sm" data-act="arr-add" data-arg="${p}.items:cards">+ Add card</button>
      </div>`;
  if (b.type === 'buttons') return `
      <div class="field"><label>Buttons</label>
        ${(b.items || []).map((it, n) => `
          <div class="grid2" style="margin-bottom:9px;align-items:end">
            <div class="field" style="margin:0"><label>Label</label><input type="text" data-path="${p}.items.${n}.label" value="${esc(it.label || '')}"></div>
            <div class="field" style="margin:0"><label>Link</label><input type="text" data-path="${p}.items.${n}.href" value="${esc(it.href || '')}"></div>
            <div><button class="btn sm danger" data-act="arr-del" data-arg="${p}.items:${n}">Remove</button></div>
          </div>`).join('')}
        <button class="btn sm" data-act="arr-add" data-arg="${p}.items:button">+ Add button</button>
      </div>`;
  if (b.type === 'contact') return `
      <div class="field"><label>Contact rows</label>
        ${(b.items || []).map((it, n) => `
          <div class="grid3" style="margin-bottom:9px;align-items:end">
            <div class="field" style="margin:0"><label>Label</label><input type="text" data-path="${p}.items.${n}.label" value="${esc(it.label || '')}"></div>
            <div class="field" style="margin:0"><label>Value</label><input type="text" data-path="${p}.items.${n}.value" value="${esc(it.value || '')}"></div>
            <div class="field" style="margin:0"><label>Link</label><input type="text" data-path="${p}.items.${n}.href" value="${esc(it.href || '')}"></div>
            <div><button class="btn sm danger" data-act="arr-del" data-arg="${p}.items:${n}">Remove</button></div>
          </div>`).join('')}
        <button class="btn sm" data-act="arr-add" data-arg="${p}.items:contact">+ Add row</button>
      </div>`;
  return '';
}

/* ══ ACTIONS ══════════════════════════════════════════════════════════════ */
async function handleAction(act, arg) {
  const c = state.content;
  // Three parts when the target is an image inside a list item:
  // `skills:2:0` is list `skills`, item 2, image 0.
  const [a, b, c3] = String(arg || '').split(':');

  switch (act) {
    /* ── list items ── */
    case 'list-add': {
      const def = LISTS[a];
      (c.data[a] || (c.data[a] = [])).push(def.blank());
      openItems[a] = { [(c.data[a].length - 1)]: true };
      markDirty(); renderSide(); renderMain(); break;
    }
    case 'list-toggle': {
      const arr = openItems[a] || (openItems[a] = {});
      arr[b] = !arr[b]; renderMain(); break;
    }
    case 'list-up': case 'list-down': {
      const arr = c.data[a], i = Number(b), j = i + (act === 'list-up' ? -1 : 1);
      if (j < 0 || j >= arr.length) break;
      arr.splice(j, 0, arr.splice(i, 1)[0]);
      markDirty(); renderSide(); renderMain(); break;
    }
    case 'list-hide': {
      const it = c.data[a][Number(b)];
      it.visible = it.visible === false;
      markDirty(); renderSide(); renderMain(); break;
    }
    case 'list-dup': {
      const arr = c.data[a], i = Number(b);
      arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i])));
      markDirty(); renderSide(); renderMain(); break;
    }
    case 'list-del': {
      const arr = c.data[a], i = Number(b);
      const ok = await confirmDialog('Delete this item?',
        `“${LISTS[a].title(arr[i])}” will be removed from the draft. Nothing goes live until you publish.`,
        'Delete item');
      if (!ok) break;
      arr.splice(i, 1);
      markDirty(); renderSide(); renderMain(); break;
    }

    /* ── images / videos ── */
    case 'text-img': {
      const f = await pickFile('image/*');
      if (!f) break;
      try {
        (state.content.text || (state.content.text = {}))[a] = await upload(f);
        markDirty(); renderMain(); toast('Image uploaded');
      } catch (e) { toast(e.message, true); }
      break;
    }
    case 'text-img-pick': {
      const url = await pickFromLibrary();
      if (!url) break;
      (state.content.text || (state.content.text = {}))[a] = url;
      markDirty(); renderMain(); toast('Image chosen');
      break;
    }
    case 'img-pick': {
      const url = await pickFromLibrary();
      if (!url) break;
      setPath(arg, url);
      markDirty(); renderMain(); toast('Image chosen');
      break;
    }
    case 'text-img-clear': {
      (state.content.text || (state.content.text = {}))[a] = '';
      markDirty(); renderMain(); break;
    }
    case 'img-up': case 'gimg-up': {
      const f = await pickFile('image/*');
      if (!f) break;
      try { setPath(arg, await upload(f)); markDirty(); renderMain(); toast('Image uploaded'); }
      catch (e) { toast(e.message, true); }
      break;
    }
    case 'img-clear': {
      setPath(arg, ''); markDirty(); renderMain(); break;
    }
    case 'vid-up': {
      const f = await pickFile('video/*');
      if (!f) break;
      try { setPath(arg, await upload(f)); markDirty(); renderMain(); toast('Video uploaded'); }
      catch (e) { toast(e.message, true); }
      break;
    }
    case 'vid-add': {
      const f = await pickFile('video/*');
      if (!f) break;
      try {
        const url = await upload(f);
        const arr = getPath(arg) || [];
        arr.push({ src: url, name: f.name });
        setPath(arg, arr); markDirty(); renderMain(); toast('Video added');
      } catch (e) { toast(e.message, true); }
      break;
    }
    case 'vid-pick': {
      const url = await pickFromLibrary('video');
      if (!url) break;
      const arr = getPath(arg) || [];
      arr.push({ src: url, name: url.split('/').pop() });
      setPath(arg, arr); markDirty(); renderMain(); toast('Video added from the library');
      break;
    }
    case 'vid-del': {
      const [path, i] = [arg.slice(0, arg.lastIndexOf(':')), Number(arg.slice(arg.lastIndexOf(':') + 1))];
      const arr = getPath(path) || [];
      arr.splice(i, 1); setPath(path, arr); markDirty(); renderMain(); break;
    }

    /* ── galleries ── */
    case 'gal-add': {
      const gal = c.data.galleries[a];
      const f = await pickFile('image/*');
      if (!f) break;
      try {
        gal.items.push({ src: await upload(f), cap: '' });
        // Open the row we just created. Without this it renders collapsed and the
        // image + caption editor is invisible, so adding an image looks like a no-op.
        openItems['gal:' + a] = { [gal.items.length - 1]: true };
        markDirty(); renderMain();
      }
      catch (e) { toast(e.message, true); }
      break;
    }
    case 'gal-img': {
      const [key, i] = [a, Number(b)];
      const f = await pickFile('image/*');
      if (!f) break;
      try { c.data.galleries[key].items[i].src = await upload(f); markDirty(); renderMain(); }
      catch (e) { toast(e.message, true); }
      break;
    }
    case 'gal-thumb': {
      const f = await pickFile('image/*');
      if (!f) break;
      try { c.data.galleries[a].thumb = await upload(f); markDirty(); renderMain(); }
      catch (e) { toast(e.message, true); }
      break;
    }
    case 'gal-thumb-clear': c.data.galleries[a].thumb = ''; markDirty(); renderMain(); break;
    case 'sub-add': {
      const it = (c.data[a] || [])[Number(b)];
      if (!it) break;
      const f = await pickFile('image/*');
      if (!f) break;
      try {
        const url = await upload(f);
        if (!Array.isArray(it.panelItems)) it.panelItems = [];
        it.panelItems.push({ src: url, cap: '' });
        markDirty(); renderMain(); toast('Image added');
      } catch (e) { toast(e.message, true); }
      break;
    }
    case 'sub-img': {
      const it = (c.data[a] || [])[Number(b)];
      const j = Number(c3);
      if (!it || !Array.isArray(it.panelItems) || !it.panelItems[j]) break;
      const f = await pickFile('image/*');
      if (!f) break;
      try {
        it.panelItems[j].src = await upload(f);
        markDirty(); renderMain(); toast('Image replaced');
      } catch (e) { toast(e.message, true); }
      break;
    }
    case 'sub-del': {
      const it = (c.data[a] || [])[Number(b)];
      const j = Number(c3);
      if (!it || !Array.isArray(it.panelItems)) break;
      const ok = await confirmDialog('Remove this image?', 'It comes out of the panel. The file stays in the media library.', 'Remove image');
      if (!ok) break;
      it.panelItems.splice(j, 1);
      markDirty(); renderMain(); break;
    }
    case 'sub-up': case 'sub-down': {
      const it = (c.data[a] || [])[Number(b)];
      const j = Number(c3) + (act === 'sub-up' ? -1 : 1);
      if (!it || !Array.isArray(it.panelItems)) break;
      if (j < 0 || j >= it.panelItems.length) break;
      it.panelItems.splice(j, 0, it.panelItems.splice(Number(c3), 1)[0]);
      markDirty(); renderMain(); break;
    }
    case 'gal-toggle': {
      const open = openItems['gal:' + a] || (openItems['gal:' + a] = {});
      open[Number(b)] = !open[Number(b)];
      renderMain(); break;
    }
    case 'gal-up': case 'gal-down': {
      const arr = c.data.galleries[a].items, i = Number(b), j = i + (act === 'gal-up' ? -1 : 1);
      if (j < 0 || j >= arr.length) break;
      arr.splice(j, 0, arr.splice(i, 1)[0]); markDirty(); renderMain(); break;
    }
    case 'gal-del': {
      const arr = c.data.galleries[a].items, i = Number(b);
      const ok = await confirmDialog('Delete this image?', 'It will be removed from the draft gallery.', 'Delete image');
      if (!ok) break;
      arr.splice(i, 1); markDirty(); renderMain(); break;
    }

    /* ── generic arrays inside custom blocks ── */
    case 'arr-add': {
      const path = arg.slice(0, arg.lastIndexOf(':'));
      const kind = arg.slice(arg.lastIndexOf(':') + 1);
      const arr = getPath(path) || [];
      if (kind === 'gallery') {
        const f = await pickFile('image/*');
        if (!f) break;
        try { arr.push({ src: await upload(f), alt: '' }); } catch (e) { toast(e.message, true); break; }
      } else if (kind === 'cards') arr.push({ title: '', text: '', src: '' });
      else if (kind === 'button') arr.push({ label: 'Click here', href: '#' });
      else arr.push({ label: '', value: '', href: '' });
      setPath(path, arr); markDirty(); renderMain(); break;
    }
    case 'arr-del': {
      const path = arg.slice(0, arg.lastIndexOf(':'));
      const i = Number(arg.slice(arg.lastIndexOf(':') + 1));
      const arr = getPath(path) || [];
      arr.splice(i, 1); setPath(path, arr); markDirty(); renderMain(); break;
    }

    /* ── custom section blocks ── */
    case 'blk-add': {
      const s = (c.custom || []).find(x => x.id === a);
      const modal = document.createElement('div');
      modal.className = 'modal open';
      modal.innerHTML = `<div class="modal-card" style="max-width:460px"><h3>Add a block</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
          ${BLOCK_TYPES.map(t => `<button class="btn" data-pick="${t.type}">${esc(t.label)}</button>`).join('')}
        </div>
        <div class="modal-acts" style="margin-top:20px"><button class="btn" data-cancel>Cancel</button></div></div>`;
      document.body.appendChild(modal);
      modal.querySelector('[data-cancel]').onclick = () => modal.remove();
      modal.querySelectorAll('[data-pick]').forEach(btn => {
        btn.onclick = () => {
          const t = BLOCK_TYPES.find(x => x.type === btn.getAttribute('data-pick'));
          s.blocks.push(t.blank()); modal.remove(); markDirty(); renderMain();
        };
      });
      break;
    }
    case 'blk-up': case 'blk-down': {
      const s = (c.custom || []).find(x => x.id === a);
      const i = Number(b), j = i + (act === 'blk-up' ? -1 : 1);
      if (j < 0 || j >= s.blocks.length) break;
      s.blocks.splice(j, 0, s.blocks.splice(i, 1)[0]); markDirty(); renderMain(); break;
    }
    case 'blk-del': {
      const s = (c.custom || []).find(x => x.id === a);
      const ok = await confirmDialog('Delete this block?', 'The block will be removed from the draft.', 'Delete block');
      if (!ok) break;
      s.blocks.splice(Number(b), 1); markDirty(); renderMain(); break;
    }

    /* ── custom sections themselves ── */
    case 'sec-up': case 'sec-down': {
      const list = (c.custom || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
      const i = list.findIndex(x => x.id === a), j = i + (act === 'sec-up' ? -1 : 1);
      if (j < 0 || j >= list.length) break;
      list.splice(j, 0, list.splice(i, 1)[0]);
      list.forEach((s, n) => { s.order = n + 1; });
      markDirty(); renderSide(); renderMain(); break;
    }
    case 'sec-del': {
      const ok = await confirmDialog('Delete this whole section?',
        'Every block inside it will be removed from the draft. This cannot be undone once you publish.', 'Delete section');
      if (!ok) break;
      c.custom = (c.custom || []).filter(x => x.id !== a);
      state.active = 'hero'; markDirty(); renderSide(); renderMain(); break;
    }
  }
}

/* ══ MEDIA LIBRARY ════════════════════════════════════════════════════════ */
// Every upload is kept as a file on the server. Without a way to browse them, a
// reference lost from the content can never be recovered — the user has to
// re-upload a photo that is already sitting on the disk.
let mediaCache = null;

async function loadMedia(force) {
  if (mediaCache && !force) return mediaCache;
  const out = await api('/api/media');
  mediaCache = out.items || [];
  return mediaCache;
}

// Which files are actually referenced by the current draft.
function usedMediaUrls() {
  const set = new Set();
  const walk = n => {
    if (typeof n === 'string') { if (n.indexOf('/media/') === 0) set.add(n); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === 'object') return Object.keys(n).forEach(k => walk(n[k]));
  };
  walk(state.content);
  return set;
}

const fmtSize = b => {
  const n = Number(b) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
};

const isImage = mime => /^image\//.test(String(mime || ''));

// Opens the picker and resolves with the chosen URL, or null if cancelled.
// `kind` of 'video' or 'image' narrows the list.
async function pickFromLibrary(kind) {
  const all = await loadMedia(true);
  const items = kind === 'video' ? all.filter(m => /^video\//.test(String(m.mime)))
    : kind === 'image' ? all.filter(m => isImage(m.mime))
    : all;
  const used = usedMediaUrls();
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.innerHTML = `
      <div class="modal-card" style="max-width:780px">
        <h3>Choose from your uploads</h3>
        <p>${items.length} file${items.length === 1 ? '' : 's'} on the server. Ones already used on the site are marked.</p>
        <div class="lib-grid">
          ${items.length ? items.map(m => `
            <button class="lib-item" data-pick="${esc(m.url)}" title="${esc(m.name || m.url)}">
              <span class="lib-thumb">${isImage(m.mime)
                ? `<img src="${esc(m.url)}" alt="">`
                : esc(String(m.mime || '').replace('video/', '').toUpperCase() || 'FILE')}</span>
              <span class="lib-meta">${esc(fmtSize(m.size))}${used.has(m.url) ? ' · <b>in use</b>' : ''}</span>
            </button>`).join('') : '<div class="empty">Nothing uploaded yet.</div>'}
        </div>
        <div class="modal-acts" style="margin-top:18px">
          <button class="btn" data-cancel>Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = url => { modal.remove(); resolve(url); };
    modal.querySelector('[data-cancel]').onclick = () => close(null);
    modal.querySelectorAll('[data-pick]').forEach(b => {
      b.onclick = () => close(b.getAttribute('data-pick'));
    });
  });
}

// The full library page: browse, see what is unused, delete.
async function renderMediaPage() {
  const host = $('#main');
  host.innerHTML = `<div class="main-head"><div>
      <h1>Media library</h1>
      <p>Every image and video uploaded through the dashboard. Files are stored on the server; the database keeps only their address.</p>
    </div></div><div class="card"><div class="empty">Loading…</div></div>`;

  let items;
  try { items = await loadMedia(true); }
  catch (e) { host.querySelector('.card').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }

  const used = usedMediaUrls();
  const unused = items.filter(m => !used.has(m.url));
  const onlyUnused = mediaFilter === 'unused';
  const shown = onlyUnused ? unused : items;

  const totalBytes = items.reduce((n, m) => n + (Number(m.size) || 0), 0);

  host.innerHTML = `
    <div class="main-head">
      <div>
        <h1>Media library</h1>
        <p>Every image and video uploaded through the dashboard. Files are stored on the server; the database keeps only their address.</p>
      </div>
      <div class="spacer"></div>
      <button class="btn" id="lib-filter">${onlyUnused ? 'Show all' : 'Show unused only'}</button>
    </div>
    <div class="card">
      <div class="card-head">
        <h3>${shown.length} file${shown.length === 1 ? '' : 's'}</h3>
        <span class="badge" style="font-size:12px;color:var(--ink3)">
          ${items.length} total · ${fmtSize(totalBytes)}${unused.length ? ' · ' + unused.length + ' unused' : ''}
        </span>
        <div class="spacer"></div>
      </div>
      <p class="hint">“In use” means the current draft still points at this file. Deleting an unused file is safe; deleting one in use will leave a gap until you replace it.</p>
      ${shown.length ? `<div class="lib-grid lib-grid-page">
        ${shown.map(m => `
          <div class="lib-item static">
            <span class="lib-thumb">${isImage(m.mime)
              ? `<img src="${esc(m.url)}" alt="">`
              : esc(String(m.mime || '').replace('video/', '').toUpperCase() || 'FILE')}</span>
            <span class="lib-meta">${used.has(m.url) ? '<b>in use</b> · ' : ''}${esc(fmtSize(m.size))}</span>
            <span class="lib-acts">
              <button class="btn sm danger" data-del="${esc(m.url)}">Delete</button>
            </span>
          </div>`).join('')}
      </div>` : '<div class="empty">Nothing here.</div>'}
    </div>
    <div style="height:40px"></div>`;

  const fb = $('#lib-filter');
  if (fb) fb.onclick = () => { mediaFilter = onlyUnused ? 'all' : 'unused'; renderMediaPage(); };
  host.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = async () => {
      const url = b.getAttribute('data-del');
      const inUse = used.has(url);
      const ok = await confirmDialog('Delete this file?',
        inUse
          ? 'This file is still used on the site. The image will disappear until you upload a replacement.'
          : 'It is not used anywhere, so nothing on the site will change.',
        'Delete file');
      if (!ok) return;
      try {
        await api('/api/media/delete', { method: 'POST', body: { url } });
        mediaCache = null;
        renderMediaPage();
        toast('File deleted');
      } catch (e) { toast(e.message, true); }
    };
  });
}

let mediaFilter = 'all';

/* ══ SAVE / PUBLISH / PREVIEW ═════════════════════════════════════════════ */
async function save(quiet) {
  try {
    const out = await api('/api/save', { method: 'POST', body: { draft: state.content } });
    state.dirty = false;
    state.unpublished = out.unpublished;
    state.meta = out.meta;
    paintStatus();
    if (!quiet) toast('Saved to the draft');
    else toast('Saved');
    return true;
  } catch (e) {
    toast(e.message, true);
    return false;
  }
}

async function publish() {
  if (state.dirty && !(await save(true))) return;
  const ok = await confirmDialog('Publish these changes?',
    'The live website will switch to what you see in the draft. Visitors see it immediately.',
    'Publish now', 'primary');
  if (!ok) return;
  try {
    const out = await api('/api/publish', { method: 'POST' });
    state.unpublished = out.unpublished;
    state.meta = out.meta;
    paintStatus();
    toast('Published — the live website is updated');
  } catch (e) { toast(e.message, true); }
}

async function preview() {
  // The preview renders the draft, so make sure the draft is current first.
  if (state.dirty && !(await save(true))) return;
  window.open('/preview', '_blank');
}

async function discard() {
  const ok = await confirmDialog('Discard all unsaved edits?',
    'The draft will be replaced with the version that is currently live. Your published website is not touched.',
    'Discard edits');
  if (!ok) return;
  try {
    const out = await api('/api/discard', { method: 'POST' });
    state.content = out.draft;
    state.dirty = false; state.unpublished = false; state.meta = out.meta;
    paintStatus(); renderSide(); renderMain();
    toast('Draft reset to the published version');
  } catch (e) { toast(e.message, true); }
}

function accountMenu() {
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Account</h3>
      <p>Signed in as <strong>${esc(state.username || '')}</strong>.</p>
      <div class="field"><label>Current password</label><input type="password" id="pw-cur"></div>
      <div class="field"><label>New password (min 8 characters)</label><input type="password" id="pw-new"></div>
      <div class="modal-acts" style="margin-top:8px">
        <button class="btn" id="pw-cancel">Cancel</button>
        <button class="btn primary" id="pw-save">Change password</button>
        <button class="btn danger" id="do-logout">Sign out</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#pw-cancel').onclick = () => modal.remove();
  modal.querySelector('#do-logout').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    location.reload();
  };
  modal.querySelector('#pw-save').onclick = async () => {
    try {
      await api('/api/password', { method: 'POST', body: { current: $('#pw-cur').value, next: $('#pw-new').value } });
      modal.remove(); toast('Password changed');
    } catch (e) { toast(e.message, true); }
  };
}

/* ══ BOOT ═════════════════════════════════════════════════════════════════ */
async function boot() {
  const s = await api('/api/session');
  state.authed = s.authed;
  state.username = s.username;
  state.unpublished = s.unpublished;
  state.meta = s.meta;
  if (!s.authed) return renderLogin();

  const c = await api('/api/content');
  state.content = c.draft;
  state.unpublished = c.unpublished;
  state.meta = c.meta;
  state.dirty = false;
  // Make sure every expected branch exists, even on an older saved document.
  state.content.text = state.content.text || {};
  state.content.data = state.content.data || {};
  state.content.sections = state.content.sections || {};
  state.content.custom = state.content.custom || [];
  SECTIONS.forEach(s2 => {
    if (s2.page && !state.content.sections[s2.page]) {
      state.content.sections[s2.page] = { visible: true, order: 1 };
    }
  });
  renderShell();
}

// Warn before losing edits.
window.addEventListener('beforeunload', e => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
});

boot().catch(err => {
  console.error(err);
  renderLogin('Could not reach the server. Is it running?');
});
