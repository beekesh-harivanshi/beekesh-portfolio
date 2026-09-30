// ─────────────────────────────────────────────────────────────────────────────
// render.js — turns the stored content document into the actual page.
//
// The design is NOT rebuilt here. The existing beekesh-portfolio.html stays the
// single source of the layout, and we only do two things to it:
//
//   1. inject a <script> that hands the content to the page, and
//   2. in PUBLIC mode, strip every trace of the editing UI.
//
// The page already knows how to render from data (restoreSavedData() adopts
// window.statsData / toolsData / motionData / …), so the CMS feeds exactly those
// same globals. That is why the design needs no rework.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// JSON is embedded inside a <script> block, so every "<" must be escaped or a
// "</script>" appearing inside user content would close the tag early.
const json = v => JSON.stringify(v === undefined ? null : v).replace(/</g, '\\u003c');

const PUBLIC_CSS = `
<style id="cms-public-guard">
  /* A visitor must never see, or reach, any editing affordance. The page's own
     JS also strips these, but CSS makes it true even before scripts run.
     NOTE: #progress-bar is deliberately NOT hidden — it is the scroll indicator
     visitors see at the top of the page, not edit chrome. */
  #toolbar, .editor-controls, .editor-modal, .work-add-row, .lw-edit-tools,
  .lw-remove, .gal-actions, .upload-hint, .img-upload-hint, .work-upload-btn,
  .msg-icon-row, #lw-toast { display: none !important; }

  /* The whole top of the page was laid out around the 54px fixed edit toolbar:
     the body was padded down to clear it, the nav stuck at top:54px to sit under
     it, and the progress bar sat at 54px. Once the toolbar is gone that offset
     becomes an empty band at the top where page content scrolls through in full
     view above the nav — which reads as the nav floating in the middle of the
     page. With no toolbar, everything moves back to the very top. */
  body { padding-top: 0 !important; }
  nav { top: 0 !important; }
  #progress-bar { top: 0 !important; }
</style>`;

const PREVIEW_BANNER = `
<div id="cms-preview-banner" style="position:fixed;left:0;right:0;bottom:0;z-index:99999;
     background:#1A1916;color:#fff;font:500 13px/1.4 system-ui,sans-serif;
     padding:10px 18px;display:flex;gap:14px;align-items:center;justify-content:center">
  <span style="opacity:.75">PREVIEW</span>
  <span>You are seeing the draft. Visitors still see the published version.</span>
  <a href="/admin" style="color:#7FC99A;font-weight:600;text-decoration:none">Back to admin</a>
</div>`;

// Remove every <div class="…token…"> block, counting nested tags so the correct
// closing tag is found (a plain regex would stop at the first inner </div>).
function removeDivsWithClass(html, token) {
  const openRe = new RegExp('<div\\b[^>]*class="[^"]*\\b' + token + '\\b[^"]*"[^>]*>', 'g');
  let out = '', cursor = 0, m;
  while ((m = openRe.exec(html))) {
    const start = m.index;
    if (start < cursor) continue;               // inside a block already removed
    const scan = /<div\b|<\/div>/g;
    scan.lastIndex = start;
    let depth = 0, t;
    while ((t = scan.exec(html))) {
      if (t[0] === '</div>') {
        depth--;
        if (depth === 0) {
          out += html.slice(cursor, start);
          cursor = t.index + 6;
          openRe.lastIndex = cursor;
          break;
        }
      } else depth++;
    }
  }
  return out + html.slice(cursor);
}

// Remove a whole element by id, counting nested tags so the right closing tag is
// found. A plain non-greedy regex stops at the FIRST inner </div>, which leaves
// the rest of the element's children orphaned in the page — the toolbar has
// nested divs, so that bug scattered its buttons across the body while the
// `#toolbar` element itself looked correctly removed.
function removeElementById(html, id) {
  const open = '<div id="' + id + '">';
  const start = html.indexOf(open);
  if (start < 0) return html;
  const scan = /<div\b|<\/div>/g;
  scan.lastIndex = start;
  let depth = 0, t;
  while ((t = scan.exec(html))) {
    if (t[0] === '</div>') {
      depth--;
      if (depth === 0) return html.slice(0, start) + html.slice(t.index + 6);
    } else depth++;
  }
  return html;
}

// Everything a visitor must never receive. These are the same things the page's
// own Download button strips; here they never even reach the browser.
const EDIT_CHROME = '#toolbar,.editor-controls,.editor-modal,.work-add-row,.lw-edit-tools,' +
  '.lw-remove,.gal-actions,.upload-hint,.img-upload-hint,.work-upload-btn,input[type=file]';

// The markup a visitor must not even be able to read in "view source".
// #work-overlay and #motion-lightbox are NOT in this list — they are visitor
// features (the work gallery panel and the video player).
function stripEditMarkup(html) {
  let out = html;
  out = removeDivsWithClass(out, 'editor-controls');
  out = removeDivsWithClass(out, 'editor-modal');
  out = removeDivsWithClass(out, 'work-add-row');
  out = removeDivsWithClass(out, 'lw-edit-tools');
  out = removeDivsWithClass(out, 'gal-actions');
  out = out.replace(/<input[^>]*type="file"[^>]*>\s*/g, '');
  return out;
}

// Runs inside the page, before the page's own DOMContentLoaded handler.
// Public mode additionally makes the edit path unreachable, not merely hidden.
function bootScript(content, mode) {
  const d = content.data || {};
  return `<script id="cms-boot">
(function(){
  var MODE = ${json(mode)};
  window.__CMS_MODE__ = MODE;
  // ── the globals the page already consumes ──────────────────────────────
  window.__WORK_GALLERIES__ = ${json(d.galleries)};
  window.statsData      = ${json(d.stats)};
  window.toolsData      = ${json(d.tools)};
  window.motionData     = ${json(d.motion)};
  window.motionSubText  = ${json(d.motionSub)};
  window.educationData  = ${json(d.education)};
  window.languagesData  = ${json(d.languages)};
  window.contactData    = ${json(d.contact)};
  // ── lists that used to be hardcoded in the markup ──────────────────────
  window.experienceData = ${json(d.experience)};
  window.processData    = ${json(d.process)};
  window.skillsData     = ${json(d.skills)};
  window.workCardsData  = ${json(d.workCards)};
  window.navLinksData   = ${json(d.navLinks)};
  window.heroButtonsData = ${json(d.heroButtons)};
  window.footerLinksData = ${json(d.footerLinks)};
  // ── plain text, keyed by data-cms attribute ────────────────────────────
  window.__CMS_TEXT__     = ${json(content.text || {})};
  window.__CMS_SECTIONS__ = ${json(content.sections || {})};
  window.__CMS_CUSTOM__   = ${json(content.custom || [])};

  if (MODE === 'public') {
    // The editing engine must be dead, not just invisible.
    var kill = function(){
      document.querySelectorAll('[contenteditable]').forEach(function(el){
        el.removeAttribute('contenteditable');
      });
      document.querySelectorAll(${json(EDIT_CHROME)}).forEach(function(el){ el.remove(); });
    };
    window.toggleEditMode = function(){ return false; };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', kill);
    } else { kill(); }
    // Belt and braces: if anything re-adds an editable attribute later, drop it.
    try {
      new MutationObserver(kill).observe(document.documentElement, {
        subtree: true, attributes: true, attributeFilter: ['contenteditable']
      });
    } catch (e) {}
  }
})();
<\/script>`;
}

function render(template, content, mode) {
  let html = template;
  const isVisitorView = mode === 'public' || mode === 'preview';

  // 1. The visitor view must not even contain the editing UI in its markup.
  if (isVisitorView) {
    html = removeElementById(html, 'toolbar');
    html = stripEditMarkup(html);
  }

  // 2. Strip the hardcoded editable attributes, but ONLY in the markup region —
  //    the same string also appears in CSS selectors and JS template literals,
  //    and rewriting those would corrupt the page.
  if (isVisitorView) {
    const styleEnd = html.indexOf('</style>');
    const scriptStart = html.indexOf('<script>');
    if (styleEnd > -1 && scriptStart > styleEnd) {
      const head = html.slice(0, styleEnd);
      const body = html.slice(styleEnd, scriptStart)
        .replace(/\s+contenteditable="(?:true|false)"/g, '');
      html = head + body + html.slice(scriptStart);
    }
  }

  // 3. Inject the content + mode before the page's own bootstrap runs.
  const boot = bootScript(content, mode);
  if (html.includes('</body>')) {
    html = html.replace('</body>', boot + '\n</body>');
  } else {
    html += boot;
  }

  // 4. Make sure the editing UI can never appear, even before scripts run.
  if (isVisitorView) {
    html = html.replace('</head>', PUBLIC_CSS + '\n</head>');
  }
  if (mode === 'preview') {
    html = html.replace('</body>', PREVIEW_BANNER + '\n</body>');
  }
  return html;
}

module.exports = { render };
