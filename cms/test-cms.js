// ─────────────────────────────────────────────────────────────────────────────
// test-cms.js — end-to-end checks against a running server.
//
//   node cms/server.js          (in one terminal)
//   node cms/test-cms.js        (in another)
//
// The promise the whole system rests on: editing the draft must NEVER change
// what a visitor sees until Publish is pressed.
//
// Structure is checked by PARSING the served HTML and querying the DOM, never
// by substring search — "contenteditable" also appears in the page's CSS
// selectors and JS template literals, so a text search reports false alarms.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const { JSDOM } = require('jsdom');

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const USER = process.env.ADMIN_USER || 'admin';
const PASS = process.env.ADMIN_PASS || 'portfolio2026';

let pass = true;
const check = (label, cond, extra) => {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label + (extra !== undefined ? '   -> ' + extra : ''));
  if (!cond) pass = false;
};

// Parse without running scripts: this is exactly what the browser receives.
const parse = html => new JSDOM(html).window.document;
// Parse and run: this is the page as a visitor ends up experiencing it.
// The error list is attached to the document so callers can assert on it.
function parseLive(html) {
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: BASE + '/',
    beforeParse(w) {
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.confirm = () => true; w.alert = () => {};
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
      w.addEventListener('error', e => errors.push(e.message));
    }
  });
  return new Promise(r => setTimeout(() => {
    dom.window.document.__errors = errors;
    r(dom.window.document);
  }, 900));
}

let cookie = '';
// The user's own hide/show choices, captured before the suite touches anything,
// so the cleanup can put them back instead of clearing them.
let skillVisibleBaseline = null;
async function req(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual'
  });
  const setC = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (setC.length) {
    const c = setC[0].split(';')[0];
    cookie = c.endsWith('=') ? '' : c;
  }
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text, headers: res.headers };
}
const htmlOf = async path => (await req(path, { raw: true })).text();

(async () => {
  console.log('--- 1. the site is up and the admin is locked ---');
  const homeHtml = await htmlOf('/');
  check('public page loads', homeHtml.indexOf('<!DOCTYPE html>') === 0);

  const doc = parse(homeHtml);
  check('served markup has no editor toolbar', doc.querySelectorAll('#toolbar').length === 0);
  // Removing an element with nested divs must not orphan its children. Testing
  // only for `#toolbar` passed while the toolbar's buttons were still sitting in
  // the body, so check for the contents too, not just the container.
  check('no orphaned toolbar controls left in the page',
    doc.querySelectorAll('.accent-btn, .edit-mode-btn').length === 0,
    doc.querySelectorAll('.accent-btn, .edit-mode-btn').length);
  check('no stray Download button in the page',
    ![...doc.querySelectorAll('button, a')].some(el => /download/i.test(el.textContent)),
    [...doc.querySelectorAll('button, a')].filter(el => /download/i.test(el.textContent)).map(el => el.textContent.trim()).join(' | '));
  check('body has no stray bare buttons',
    [...doc.body.children].every(el => el.tagName !== 'BUTTON'),
    [...doc.body.children].filter(el => el.tagName === 'BUTTON').length + ' direct button child(ren)');
  check('served markup has no editable elements',
    doc.querySelectorAll('[contenteditable]').length === 0,
    doc.querySelectorAll('[contenteditable]').length);
  check('served markup has no edit control rows',
    doc.querySelectorAll('.editor-controls').length === 0,
    doc.querySelectorAll('.editor-controls').length);
  check('served markup has no file inputs',
    doc.querySelectorAll('input[type=file]').length === 0);
  check('the visitor-facing motion UI is still in the markup',
    doc.querySelectorAll('#motion-clip-bar').length === 1);
  // Things that must SURVIVE: they belong to the visitor, not to the editor.
  check('the scroll progress bar is still there',
    doc.querySelectorAll('#progress-bar').length === 1);
  check('the work gallery overlay is still there',
    doc.querySelectorAll('#work-overlay').length === 1);
  check('the video lightbox is still there',
    doc.querySelectorAll('#motion-lightbox').length === 1);
  check('the editor modals are gone', doc.querySelectorAll('.editor-modal').length === 0,
    doc.querySelectorAll('.editor-modal').length);
  check('the real content is present', doc.body.textContent.indexOf('Beekesh') > -1);

  // The page's whole top was laid out around a 54px fixed edit toolbar: the body
  // was padded down to clear it, the nav stuck at top:54px to sit under it, and
  // the progress bar sat at 54px. Removing the toolbar without undoing that
  // offset leaves an empty band where content scrolls through in full view above
  // the nav, which reads as the nav floating in the middle of the page.
  const guard = (doc.querySelector('#cms-public-guard') || {}).textContent || '';
  check('the visitor view reclaims the toolbar offset',
    /body\s*\{[^}]*padding-top:\s*0\s*!important/.test(guard),
    (guard.match(/body\s*\{[^}]*\}/) || [''])[0].trim());
  check('the nav sticks to the very top for visitors',
    /nav\s*\{[^}]*top:\s*0\s*!important/.test(guard),
    (guard.match(/nav\s*\{[^}]*\}/) || [''])[0].trim());
  check('the progress bar sits at the very top too',
    /#progress-bar\s*\{[^}]*top:\s*0\s*!important/.test(guard),
    (guard.match(/#progress-bar\s*\{[^}]*\}/) || [''])[0].trim());

  // Reordering sections must never strand the <hr class="divider"> separators.
  // This can only be seen AFTER the page's JS has run — the served markup is
  // always in natural order, it is applyCmsSections() that moves things.
  const ordered = await parseLive(await htmlOf('/'));
  const order = [...ordered.body.children]
    .filter(el => el.id && el.id.indexOf('section-') === 0)
    .map(el => el.id);
  check('the sections are still in their natural order after the runtime runs',
    order.join(',') === 'section-hero,section-work,section-about,section-process,section-contact',
    order.join(', '));
  const firstSection = ordered.querySelector('#section-hero');
  const beforeHero = [...ordered.body.children].slice(0, [...ordered.body.children].indexOf(firstSection));
  check('no divider was stranded above the first section',
    beforeHero.filter(el => el.tagName === 'HR').length === 0,
    beforeHero.filter(el => el.tagName === 'HR').length + ' stray divider(s)');
  check('the dividers are still between the sections',
    ordered.querySelectorAll('hr.divider').length >= 3,
    ordered.querySelectorAll('hr.divider').length);

  // ── the page must not throw when the visitor view has no toolbar ───────────
  // navClick read `document.getElementById('toolbar').offsetHeight`. The toolbar
  // is removed for visitors, so that was a null dereference which aborted the
  // handler BEFORE it scrolled — every nav link and both hero buttons silently
  // did nothing. A general "no JS errors" check catches this whole class of bug.
  check('the public page runs without JS errors',
    ordered.__errors.length === 0, ordered.__errors.join(' | ') || 'none');
  const navSurvives = (() => {
    try { ordered.defaultView.eval("navClick(null, 'section-contact')"); return true; }
    catch (e) { return e.message; }
  })();
  check('navClick survives a missing toolbar', navSurvives === true, String(navSurvives));
  const heroSurvives = (() => {
    try { ordered.defaultView.eval("setAccent(document.querySelector('.accent-btn') || {classList:{add(){}},dataset:{}})"); return true; }
    catch (e) { return e.message; }
  })();
  check('setAccent survives a missing toolbar', heroSurvives === true, String(heroSurvives));

  // Work cards: a 16:9 image in a 16:10 box was cropped by object-fit:cover.
  check('work card thumbnails are 16:9',
    /\.work-thumb\{aspect-ratio:16\/9;/.test(homeHtml),
    (homeHtml.match(/\.work-thumb\{[^}]*\}/) || [''])[0].slice(0, 70));

  const noAuth = await req('/api/content');
  check('content API refuses a stranger', noAuth.status === 401, noAuth.status);
  const previewNoAuth = await req('/preview', { raw: true });
  check('preview redirects a stranger to the login', previewNoAuth.status === 302, previewNoAuth.status);

  console.log('--- 1b. the sign-in page ---');
  // The login is rendered by the dashboard's own JS, so the markup is checked in
  // the served asset rather than in the HTML shell.
  const loginJs = await (await fetch(BASE + '/admin/assets/admin.js')).text();
  const loginCss = await (await fetch(BASE + '/admin/assets/admin.css')).text();
  check('the form keeps its id and both fields',
    /id="login-form"/.test(loginJs) && /id="u"/.test(loginJs) && /id="p"/.test(loginJs));
  check('the error slot is still there', /login-error/.test(loginJs));
  check('it has a brand panel beside the form',
    /class="login-brand"/.test(loginJs) && /class="login-side"/.test(loginJs));
  check('the brand panel carries the site mark', /class="login-mark"/.test(loginJs));
  check('it explains the draft-publish model',
    /Publish/.test(loginJs) && /preview/i.test(loginJs));
  check('the styles give it a split layout',
    /\.login-shell\{[^}]*grid-template-columns:1\.05fr 1fr/.test(loginCss));
  check('the panel is dark and the form is not',
    /\.login-brand\{[^}]*background:#16150F/.test(loginCss) &&
    /\.login-side\{/.test(loginCss));
  check('it has a slow continuous motion',
    /@keyframes loginGlow/.test(loginCss) && /animation:loginGlow/.test(loginCss));
  check('it stacks on a narrow screen',
    /@media\(max-width:780px\)\{[\s\S]{0,120}\.login-shell\{grid-template-columns:1fr/.test(loginCss));

  console.log('--- 2. login ---');
  const bad = await req('/api/login', { method: 'POST', body: { username: USER, password: 'wrong-password' } });
  check('a wrong password is rejected', bad.status === 401, bad.status);
  const login = await req('/api/login', { method: 'POST', body: { username: USER, password: PASS } });
  check('the right password is accepted', login.status === 200 && login.json.ok === true, login.status);
  check('a session cookie was set', cookie.startsWith('cms_session='), cookie.slice(0, 22) + '…');
  const session = await req('/api/session');
  check('the session reports us as signed in', session.json.authed === true);
  check('the session knows the username', session.json.username === USER, session.json.username);

  console.log('--- 3. content is readable and complete ---');
  const draft = (await req('/api/content')).json.draft;
  check('draft loads', !!draft);
  check('draft has text keys', Object.keys(draft.text).length >= 30, Object.keys(draft.text).length);
  check('draft has the tools list', Array.isArray(draft.data.tools) && draft.data.tools.length === 8);
  check('draft has the galleries', Object.keys(draft.data.galleries).length === 5);
  check('no base64 is stored in the database', JSON.stringify(draft).indexOf('data:image') === -1);
  check('images are stored as URLs',
    String(draft.data.tools[0].iconImg || '').startsWith('/media/'), draft.data.tools[0].iconImg);

  console.log('--- 4. EDIT THE DRAFT — the live site must NOT change ---');
  const original = draft.text['about.name'];
  draft.text['about.name'] = original + ' [DRAFT TEST]';
  const save = await req('/api/save', { method: 'POST', body: { draft } });
  check('draft saved', save.status === 200 && save.json.ok === true, save.status);
  check('the server now reports unpublished changes', save.json.unpublished === true);

  const live1 = await htmlOf('/');
  check('the LIVE site does not show the edit', live1.indexOf('[DRAFT TEST]') === -1);
  check('the live site still has the original text',
    parse(live1).body.textContent.indexOf(original) > -1, original.slice(0, 30));

  const prev = await htmlOf('/preview');
  check('the PREVIEW shows the edited text', parse(prev).body.textContent.indexOf('[DRAFT TEST]') > -1);
  check('the preview carries a warning banner', prev.indexOf('cms-preview-banner') > -1);
  check('the preview has no editable elements',
    parse(prev).querySelectorAll('[contenteditable]').length === 0);
  check('the preview has no toolbar', parse(prev).querySelectorAll('#toolbar').length === 0);

  console.log('--- 5. media uploads land on disk, not in the database ---');
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
  const up = await req('/api/upload', {
    method: 'POST',
    body: { name: 'probe.png', data: 'data:image/png;base64,' + bytes.toString('base64') }
  });
  check('upload accepted', up.status === 200 && !!up.json.url, up.status);
  check('upload returned a media URL', String(up.json.url).startsWith('/media/'), up.json.url);
  check('upload reported the real size', up.json.size === bytes.length, up.json.size);
  const fetched = await req(up.json.url, { raw: true });
  check('the uploaded file is served back', fetched.status === 200, fetched.status);
  check('the upload is recorded in the media library',
    (await req('/api/media')).json.items.some(i => i.url === up.json.url));
  check('the stored document still holds no base64',
    JSON.stringify((await req('/api/content')).json.draft).indexOf('data:image') === -1);

  // The library is what makes a lost reference recoverable: without it a photo
  // already on disk can only be brought back by uploading it again.
  const lib = await req('/api/media');
  check('the library lists each file with its size and type',
    lib.json.items.length > 0 && lib.json.items.every(m => m.url && 'size' in m && 'mime' in m),
    lib.json.items.length + ' files');
  const del = await req('/api/media/delete', { method: 'POST', body: { url: up.json.url } });
  check('a file can be deleted from the library', del.status === 200, del.status);
  check('and it disappears from the list',
    (await req('/api/media')).json.items.every(m => m.url !== up.json.url));
  check('the deleted file no longer resolves',
    (await fetch(BASE + up.json.url)).status === 404);

  // A browser does not always send a usable filename or MIME type — a photo
  // dragged from a download or pasted from a clipboard arrives as
  // "application/octet-stream" with no extension. Stored as ".octet-stream" it is
  // served as a download, so the browser never renders it and the image silently
  // never appears. The bytes have to decide.
  const webp = Buffer.concat([
    Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'),
    Buffer.from('VP8 '), Buffer.alloc(16)
  ]);
  const disguised = await req('/api/upload', {
    method: 'POST',
    body: { name: 'photo', data: 'data:application/octet-stream;base64,' + webp.toString('base64') }
  });
  check('an extension-less upload is identified from its bytes',
    String(disguised.json.url).endsWith('.webp'), disguised.json.url);
  check('and its stored MIME type is corrected',
    disguised.json.mime === 'image/webp', disguised.json.mime);
  const servedBack = await fetch(BASE + disguised.json.url);
  check('it is served as an image, not a download',
    servedBack.headers.get('content-type') === 'image/webp',
    servedBack.headers.get('content-type'));

  // Older uploads saved with a useless extension must still work: the bytes are
  // read back on the way out too.
  const misnamed = await req('/api/upload', {
    method: 'POST',
    body: { name: 'old.webp', data: 'data:application/octet-stream;base64,' + webp.toString('base64') }
  });
  check('a re-uploaded file is also typed correctly',
    (await fetch(BASE + misnamed.json.url)).headers.get('content-type') === 'image/webp');

  console.log('--- 6. PUBLISH ---');
  const pub = await req('/api/publish', { method: 'POST' });
  check('publish succeeded', pub.status === 200 && pub.json.ok === true, pub.status);
  check('nothing is left unpublished', pub.json.unpublished === false);

  const live2 = await htmlOf('/');
  check('the LIVE site now shows the edit', parse(live2).body.textContent.indexOf('[DRAFT TEST]') > -1);
  check('the live site is still not editable',
    parse(live2).querySelectorAll('[contenteditable]').length === 0);
  check('the live site still has no toolbar', parse(live2).querySelectorAll('#toolbar').length === 0);

  console.log('--- 7. discard restores the published version ---');
  const c2 = (await req('/api/content')).json.draft;
  c2.text['about.name'] = 'THROWAWAY EDIT';
  await req('/api/save', { method: 'POST', body: { draft: c2 } });
  check('the throwaway edit did not reach the live site',
    (await htmlOf('/')).indexOf('THROWAWAY') === -1);
  const dis = await req('/api/discard', { method: 'POST' });
  check('discard succeeded', dis.status === 200);
  check('the draft went back to the published text',
    dis.json.draft.text['about.name'].indexOf('THROWAWAY') === -1,
    dis.json.draft.text['about.name'].slice(0, 40));

  console.log('--- 8. section visibility + custom sections ---');
  const c3 = (await req('/api/content')).json.draft;
  c3.sections.process.visible = false;
  c3.custom = [{
    id: 'sTest', label: 'Test section', title: 'A brand new section', visible: true, order: 1,
    blocks: [
      { type: 'paragraph', text: 'Made from the dashboard.' },
      { type: 'buttons', items: [{ label: 'Get in touch', href: '#section-contact' }] }
    ]
  }];
  await req('/api/save', { method: 'POST', body: { draft: c3 } });

  // Rendering happens in the page's own JS, so these must be checked on a page
  // that has actually run — not on the raw markup.
  const prevDoc = await parseLive(await htmlOf('/preview'));
  check('the new section renders in the preview',
    prevDoc.querySelectorAll('#cms-custom .cms-section').length === 1,
    prevDoc.querySelectorAll('#cms-custom .cms-section').length);
  check('its heading renders', prevDoc.body.textContent.indexOf('A brand new section') > -1);
  check('its paragraph renders', prevDoc.body.textContent.indexOf('Made from the dashboard.') > -1);
  check('its button renders as a link',
    [...prevDoc.querySelectorAll('.cms-btn')].some(a => a.textContent === 'Get in touch'));
  check('the hidden section is hidden in the preview',
    (() => { const el = prevDoc.querySelector('#section-process'); return el && el.style.display === 'none'; })(),
    (prevDoc.querySelector('#section-process') || {}).style && prevDoc.querySelector('#section-process').style.display);

  const liveBeforeDoc = await parseLive(await htmlOf('/'));
  check('none of that is on the live site yet',
    liveBeforeDoc.body.textContent.indexOf('A brand new section') === -1);
  check('the section is still visible on the live site',
    (() => { const el = liveBeforeDoc.querySelector('#section-process'); return el && el.style.display !== 'none'; })());

  await req('/api/publish', { method: 'POST' });
  const liveDoc = await parseLive(await htmlOf('/'));
  check('after publishing, the new section is live',
    liveDoc.querySelectorAll('#cms-custom .cms-section').length === 1);
  check('the hidden section is now hidden on the live site',
    (() => { const el = liveDoc.querySelector('#section-process'); return el && el.style.display === 'none'; })());

  console.log('--- 9. the page a visitor actually gets ---');
  const finalDoc = await parseLive(await htmlOf('/'));
  check('after scripts run there is still nothing editable',
    finalDoc.querySelectorAll('[contenteditable]').length === 0,
    finalDoc.querySelectorAll('[contenteditable]').length);
  check('after scripts run there is still no toolbar',
    finalDoc.querySelectorAll('#toolbar').length === 0);
  check('after scripts run no edit rows survive',
    finalDoc.querySelectorAll('.editor-controls').length === 0);
  check('the editing engine is switched off',
    finalDoc.defaultView.eval("typeof toggleEditMode === 'function' && toggleEditMode() === false"));
  check('the visitor-facing motion UI survived',
    finalDoc.querySelectorAll('#motion-clip-bar').length === 1);
  check('the content still rendered', finalDoc.body.textContent.indexOf('Beekesh') > -1);
  check('the new section survived the runtime', finalDoc.body.textContent.indexOf('A brand new section') > -1);
  check('experience still renders', finalDoc.querySelectorAll('#exp-grid .exp-card').length === 2,
    finalDoc.querySelectorAll('#exp-grid .exp-card').length);
  check('process steps still render', finalDoc.querySelectorAll('#process-steps .process-step').length === 4,
    finalDoc.querySelectorAll('#process-steps .process-step').length);

  console.log('--- 10. the Services & Skills cards are a real editable list ---');
  const c6 = (await req('/api/content')).json.draft;
  // Check the RENDERED cards, never the page text: the injected
  // window.skillsData JSON lives in a <script> inside <body>, so body.textContent
  // contains every skill — including the hidden one. A text search here would
  // fail on correct behaviour.
  const skillTitles = doc => [...doc.querySelectorAll('#skills-grid .skill-card-title')]
    .map(e => e.textContent.trim());

  // The baseline comes from the site itself. Asserting a hard-coded nine would
  // break the moment the user hides one of their own skills.
  const liveBefore = skillTitles(await parseLive(await htmlOf('/')));

  check('the draft carries a skills list',
    Array.isArray(c6.data.skills) && c6.data.skills.length > 0,
    Array.isArray(c6.data.skills) ? c6.data.skills.length : 'missing');
  check('each skill has the fields the admin edits',
    ['image', 'icon', 'iconImg', 'title', 'sub', 'desc'].every(k => k in c6.data.skills[0]),
    Object.keys(c6.data.skills[0]).join(', '));

  // Hide one that is currently VISIBLE, so the assertion holds whatever the user
  // has already hidden for themselves.
  skillVisibleBaseline = c6.data.skills.map(s => ({ title: s.title, visible: s.visible }));
  const hiddenTitle = ((c6.data.skills.find(s => s.visible !== false)) || {}).title;
  c6.data.skills.forEach(s => { if (s.title === hiddenTitle) s.visible = false; });
  c6.data.skills.push({ image: '', icon: '\u2605', iconImg: '', title: 'CMS Test Skill', sub: '', desc: 'Added by the test suite.' });
  await req('/api/save', { method: 'POST', body: { draft: c6 } });

  const prevTitles = skillTitles(await parseLive(await htmlOf('/preview')));
  check('the added skill renders on the page', prevTitles.includes('CMS Test Skill'), prevTitles.join(', '));
  check('the hidden skill is not rendered', !prevTitles.includes(hiddenTitle), prevTitles.join(', '));
  check('one added and one hidden cancels out',
    prevTitles.length === liveBefore.length, prevTitles.length + ' vs ' + liveBefore.length);

  const liveTitles = skillTitles(await parseLive(await htmlOf('/')));
  check('the live site is untouched until you publish',
    liveTitles.join('|') === liveBefore.join('|'), liveTitles.join(', '));

  await req('/api/publish', { method: 'POST' });
  const skAfter = skillTitles(await parseLive(await htmlOf('/')));
  check('after publishing the change is live',
    skAfter.includes('CMS Test Skill') && !skAfter.includes(hiddenTitle), skAfter.join(', '));

  console.log('--- 10a. hiding a hero button reaches the page ---');
  // The boot script names every injected window.*Data by hand. Miss one and the
  // section silently falls back to the page's own defaults, so hiding or deleting
  // an item has no effect on the preview or the live site.
  const c6b = (await req('/api/content')).json.draft;
  const heroBefore = (c6b.data.heroButtons || []).length;
  check('the draft carries hero buttons', heroBefore > 0, heroBefore);
  c6b.data.heroButtons.forEach((b, i) => { b.visible = i !== 0; });
  await req('/api/save', { method: 'POST', body: { draft: c6b } });
  const heroPrev = await parseLive(await htmlOf('/preview'));
  check('the preview injects the hero button list',
    /window\.heroButtonsData\s*=/.test(await htmlOf('/preview')));
  check('a hidden hero button is not rendered',
    heroPrev.querySelectorAll('#hero-btns button').length === heroBefore - 1,
    heroPrev.querySelectorAll('#hero-btns button').length + ' of ' + heroBefore);
  check('the preview injects the nav link list',
    /window\.navLinksData\s*=/.test(await htmlOf('/preview')));
  check('the nav still renders from it',
    heroPrev.querySelectorAll('#nav-links a').length > 0,
    heroPrev.querySelectorAll('#nav-links a').length);
  c6b.data.heroButtons.forEach(b => { delete b.visible; });
  await req('/api/save', { method: 'POST', body: { draft: c6b } });

  console.log('--- 10b. the Selected Work cards are a real list too ---');
  const c7 = (await req('/api/content')).json.draft;
  check('the draft carries the work cards',
    Array.isArray(c7.data.workCards) && c7.data.workCards.length === 4,
    Array.isArray(c7.data.workCards) ? c7.data.workCards.length : 'missing');
  check('each card names the gallery it opens',
    c7.data.workCards.every(c => c.gallery), c7.data.workCards.map(c => c.gallery).join(', '));

  const workTitles = doc => [...doc.querySelectorAll('#work-grid .work-title')].map(e => e.textContent.trim());
  c7.data.workCards.push({
    gallery: 'poster', tone: 'g1', label: 'Test label',
    title: 'CMS Test Card', meta: 'Added by the test'
  });
  await req('/api/save', { method: 'POST', body: { draft: c7 } });

  const wPrev = await parseLive(await htmlOf('/preview'));
  check('the added card renders on the page',
    workTitles(wPrev).includes('CMS Test Card'), workTitles(wPrev).join(', '));
  check('the grid grew to five cards',
    wPrev.querySelectorAll('#work-grid .work-card').length === 5,
    wPrev.querySelectorAll('#work-grid .work-card').length);

  const wLive = workTitles(await parseLive(await htmlOf('/')));
  check('the live site still shows the original four',
    wLive.length === 4 && !wLive.includes('CMS Test Card'), wLive.join(', '));

  await req('/api/publish', { method: 'POST' });
  const wAfter = workTitles(await parseLive(await htmlOf('/')));
  check('after publishing the new card is live',
    wAfter.includes('CMS Test Card'), wAfter.join(', '));

  console.log('--- 11. the About Me photo and the hero heading ---');
  const heroContent = (await req('/api/content')).json.draft;
  check('the draft carries a hero photo key', 'hero.photo' in heroContent.text, JSON.stringify(heroContent.text['hero.photo']));
  check('the draft carries the hero heading key', 'hero.title' in heroContent.text, heroContent.text['hero.title']);

  // Upload a real image and place it exactly as the dashboard does.
  const photoBytes = Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000002000000020806000000f478d4fa0000000d4944415478da63fcffff3f0300050001' +
    'a5f645400000000049454e44ae426082', 'hex');
  const photoUp = await req('/api/upload', {
    method: 'POST',
    body: { name: 'hero.png', data: 'data:image/png;base64,' + photoBytes.toString('base64') }
  });
  check('the photo uploaded', photoUp.status === 200 && String(photoUp.json.url).startsWith('/media/'), photoUp.json.url);

  heroContent.text['hero.photo'] = photoUp.json.url;
  heroContent.text['hero.title'] = 'Visual ideas [made real.]';
  await req('/api/save', { method: 'POST', body: { draft: heroContent } });

  const beforePub = await parseLive(await htmlOf('/'));
  check('the photo is NOT on the live site before publishing',
    beforePub.querySelector('#hero-photo').getAttribute('src') !== photoUp.json.url);

  await req('/api/publish', { method: 'POST' });
  const heroDoc = await parseLive(await htmlOf('/'));
  const heroImg = heroDoc.querySelector('#hero-photo');
  const heroPh = heroDoc.querySelector('#hero-placeholder');
  check('the photo now renders on the live site',
    heroImg.getAttribute('src') === photoUp.json.url, heroImg.getAttribute('src'));
  check('the image is actually displayed', heroImg.style.display === 'block', heroImg.style.display);
  check('the grey placeholder is hidden', heroPh.style.display === 'none', heroPh.style.display);
  check('the hero heading renders with its italic accent',
    heroDoc.querySelector('h1.hero .cms-em') !== null &&
    heroDoc.querySelector('h1.hero').textContent.indexOf('made real.') > -1,
    heroDoc.querySelector('h1.hero').textContent.trim());
  check('the placeholder is not clickable for visitors',
    !(heroPh.getAttribute('onclick') || '').includes('hero-file-input'));

  // Removing the photo must put the placeholder back.
  const c4 = (await req('/api/content')).json.draft;
  c4.text['hero.photo'] = '';
  await req('/api/save', { method: 'POST', body: { draft: c4 } });
  await req('/api/publish', { method: 'POST' });
  const noPhoto = await parseLive(await htmlOf('/'));
  check('removing the photo brings the placeholder back',
    noPhoto.querySelector('#hero-placeholder').style.display === 'flex',
    noPhoto.querySelector('#hero-placeholder').style.display);

  console.log('--- 12. every media URL on the public page resolves ---');
  const publicHtml = await htmlOf('/');
  const mediaUrls = [...new Set([...publicHtml.matchAll(/\/media\/[A-Za-z0-9._-]+/g)].map(m => m[0]))];
  check('the page references media files', mediaUrls.length > 0, mediaUrls.length);
  let broken = [];
  for (const u of mediaUrls) {
    const r = await fetch(BASE + u);
    const buf = await r.arrayBuffer();
    if (r.status !== 200 || buf.byteLength < 100) broken.push(u + ' -> ' + r.status);
  }
  check('none of them are broken', broken.length === 0, broken.slice(0, 3).join(', ') || 'all reachable');

  console.log('--- 13. the suite puts the site back the way it found it ---');
  const c5 = (await req('/api/content')).json.draft;
  c5.custom = (c5.custom || []).filter(s => s.id !== 'sTest');
  c5.sections.process.visible = true;
  // Put the skills list back: drop the test card and un-hide the one we hid.
  c5.data.skills = (c5.data.skills || []).filter(s => s.title !== 'CMS Test Skill');
  // Put the hide/show flags back as they were - clearing them would UNHIDE a
  // skill the user had deliberately hidden.
  c5.data.skills.forEach(s => {
    const base = (skillVisibleBaseline || []).find(b => b.title === s.title);
    if (!base || base.visible === undefined) delete s.visible; else s.visible = base.visible;
  });
  // ...and the Selected Work cards.
  c5.data.workCards = (c5.data.workCards || []).filter(c => c.title !== 'CMS Test Card');
  c5.data.workCards.forEach(c => { delete c.visible; });
  // Section 4 appends this marker and section 6 publishes it, so a second run
  // would otherwise start from an already-edited site and fail its own checks.
  // Strip EVERY occurrence: a run that failed before its cleanup leaves more
  // than one behind, and a `$`-anchored replace would only peel one off per run.
  c5.text['about.name'] = String(c5.text['about.name'] || '').replace(/ \[DRAFT TEST\]/g, '');
  await req('/api/save', { method: 'POST', body: { draft: c5 } });
  await req('/api/publish', { method: 'POST' });
  const restored = await parseLive(await htmlOf('/'));
  check('the test section is gone again',
    restored.querySelectorAll('#cms-custom .cms-section').length === 0);
  check('the skills list is back to how it started',
    (() => {
      const t = [...restored.querySelectorAll('#skills-grid .skill-card-title')].map(e => e.textContent.trim());
      return t.length === liveBefore.length && t.join('|') === liveBefore.join('|');
    })(),
    restored.querySelectorAll('#skills-grid .skill-card').length + ' cards, baseline ' + liveBefore.length);
  check('the work cards are back to the original four',
    (() => {
      const t = [...restored.querySelectorAll('#work-grid .work-title')].map(e => e.textContent.trim());
      return t.length === 4 && !t.includes('CMS Test Card');
    })(),
    restored.querySelectorAll('#work-grid .work-card').length + ' cards');
  check('the test marker is gone from the live site',
    restored.body.textContent.indexOf('[DRAFT TEST]') === -1);
  check('the process section is visible again',
    (() => { const el = restored.querySelector('#section-process'); return el && el.style.display !== 'none'; })());
  check('nothing is left unpublished', (await req('/api/session')).json.unpublished === false);

  console.log('--- 14. logout ---');
  await req('/api/logout', { method: 'POST' });
  check('after logout the API is locked again', (await req('/api/content')).status === 401);

  console.log('\n' + (pass ? 'RESULT: ALL CHECKS PASSED' : 'RESULT: FAILURES PRESENT'));
  process.exitCode = pass ? 0 : 1;
})().catch(e => {
  console.error('THREW: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
  process.exitCode = 1;
});
