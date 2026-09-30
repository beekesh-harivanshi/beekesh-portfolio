import pathlib, re, sys

P = pathlib.Path(r"C:\Users\admin\Downloads\beekesh - portfolio\beekesh-portfolio.html")
h = P.read_text(encoding="utf-8")

def sub_once(old, new, label, flags=0, literal=False):
    global h
    if literal:
        n = h.count(old)
        if n != 1:
            sys.exit(f"PATCH7 FAILED ({label}): {n} literal matches")
        h = h.replace(old, new, 1)
    else:
        new_h, n = re.subn(old, lambda m: new, h, count=1, flags=flags)
        if n != 1:
            sys.exit(f"PATCH7 FAILED ({label}): {n} regex matches")
        h = new_h
    print(f"  ok  {label}")

# 1) Work-section CSS: preserve the same look, only make cards clickable + upload button stop-safe.
old_work_css = """/* ─── WORK SECTION ─────────────────────────────────────── */
.work-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.work-card{border-radius:var(--radius);overflow:hidden;background:#fff;border:1px solid #E0DDD8;transition:border-color .25s,transform .25s;position:relative}
.work-card:hover{border-color:#B8B5AE;transform:translateY(-3px)}
.work-thumb{aspect-ratio:16/10;display:flex;align-items:flex-end;padding:16px;position:relative;overflow:hidden}
.work-thumb-bg{position:absolute;inset:0;object-fit:cover;width:100%;height:100%}
.work-thumb-overlay{position:relative;z-index:1;width:100%;display:flex;align-items:flex-end;justify-content:space-between}
.work-thumb.g1{background:linear-gradient(135deg,#2D5A3D,#4A8B62)}
.work-thumb.g2{background:linear-gradient(135deg,#3A3530,#6B5E52)}
.work-thumb.g3{background:linear-gradient(135deg,#1A3A5C,#2D6A9F)}
.work-thumb.g4{background:linear-gradient(135deg,#5C3A1A,#9F6B2D)}
.work-thumb-label{background:rgba(0,0,0,.3);color:#fff;font-size:11px;padding:4px 10px;border-radius:100px;letter-spacing:.5px}
.work-upload-btn{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:11px;padding:4px 10px;border-radius:100px;cursor:pointer;position:relative;overflow:hidden}
.work-upload-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
.work-info{padding:16px 20px 20px}
.work-title{font-size:15px;font-weight:500;color:var(--ink);margin-bottom:4px}
.work-meta{font-size:13px;color:var(--ink3);font-weight:300}"""
new_work_css = """/* ─── WORK SECTION ─────────────────────────────────────── */
.work-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.work-card{border-radius:var(--radius);overflow:hidden;background:#fff;border:1px solid #E0DDD8;transition:border-color .25s,transform .25s,box-shadow .25s;position:relative;cursor:pointer}
.work-card:hover{border-color:#B8B5AE;transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.06)}
.work-thumb{aspect-ratio:16/10;display:flex;align-items:flex-end;padding:16px;position:relative;overflow:hidden}
.work-thumb-bg{position:absolute;inset:0;object-fit:cover;width:100%;height:100%}
.work-thumb-overlay{position:relative;z-index:1;width:100%;display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.work-thumb.g1{background:linear-gradient(135deg,#2D5A3D,#4A8B62)}
.work-thumb.g2{background:linear-gradient(135deg,#3A3530,#6B5E52)}
.work-thumb.g3{background:linear-gradient(135deg,#1A3A5C,#2D6A9F)}
.work-thumb.g4{background:linear-gradient(135deg,#5C3A1A,#9F6B2D)}
.work-thumb-label{background:rgba(0,0,0,.3);color:#fff;font-size:11px;padding:4px 10px;border-radius:100px;letter-spacing:.5px}
.work-upload-btn{appearance:none;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:11px;padding:4px 10px;border-radius:100px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
.work-upload-btn:hover{background:rgba(255,255,255,.26)}
.work-info{padding:16px 20px 20px}
.work-title{font-size:15px;font-weight:500;color:var(--ink);margin-bottom:4px}
.work-meta{font-size:13px;color:var(--ink3);font-weight:300}

/* Motion Graphics — replaces the old Design Showcase grid */
.motion-section{padding:60px 0;overflow:hidden}
.motion-inner{max-width:1100px;margin:0 auto;padding:0 48px}
.motion-sub{color:var(--ink2);font-weight:300;margin-bottom:24px;font-size:14px;max-width:680px;line-height:1.7}
.motion-editor-row{justify-content:flex-end;margin-bottom:18px}
.motion-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:14px}
.motion-card{background:#fff;border:1px solid #E6E1DA;border-radius:16px;overflow:hidden;position:relative;display:flex;flex-direction:column;transition:border-color .25s,transform .25s,box-shadow .25s}
.motion-card:hover{border-color:#C7C0B7;transform:translateY(-3px);box-shadow:0 12px 28px rgba(0,0,0,.06)}
.motion-card.featured{grid-column:span 2}
.motion-card.openable{cursor:pointer}
.motion-media{position:relative;aspect-ratio:16/9;overflow:hidden;background:#C8C1B8}
.motion-thumb-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.motion-ph{position:absolute;inset:0;padding:18px;display:flex;align-items:flex-end;justify-content:flex-start;color:#fff}
.motion-ph-copy{display:flex;flex-direction:column;gap:8px;max-width:70%}
.motion-ph-copy span{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;opacity:.82}
.motion-ph-copy strong{font-family:var(--serif);font-size:26px;line-height:1.06;font-weight:400;letter-spacing:-.6px}
.motion-card:not(.featured) .motion-ph-copy strong{font-size:20px}
.motion-grad-forest{background:linear-gradient(135deg,#24463a 0%,#567c6b 58%,#7aa18f 100%)}
.motion-grad-ink{background:linear-gradient(135deg,#2d2b29 0%,#5d5650 60%,#8c8278 100%)}
.motion-grad-blue{background:linear-gradient(135deg,#173a57 0%,#3f6f97 60%,#6f9bc0 100%)}
.motion-grad-plum{background:linear-gradient(135deg,#46314a 0%,#77557f 60%,#a67aad 100%)}
.motion-grad-amber{background:linear-gradient(135deg,#5f3f1d 0%,#9b6a32 58%,#d29b5f 100%)}
.motion-card .motion-play-btn{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:66px;height:66px;border:none;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 10px 26px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;pointer-events:none}
.motion-card:not(.featured) .motion-play-btn{width:56px;height:56px}
.motion-card .motion-play-btn::before{content:'';display:block;width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:16px solid var(--ink);margin-left:4px}
.motion-card.empty-video .motion-play-btn{opacity:.78}
.motion-card-controls{position:absolute;top:12px;right:12px;display:flex;gap:6px;flex-wrap:wrap;padding:6px;border-radius:999px;background:rgba(248,247,244,.96);backdrop-filter:blur(8px);z-index:3}
.motion-card-controls .editor-btn{padding:4px 10px;white-space:nowrap}
.motion-copy{padding:18px 20px 20px}
.motion-kicker{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.motion-card-title{font-family:var(--serif);font-size:24px;line-height:1.12;letter-spacing:-.6px;color:var(--ink);margin-bottom:6px}
.motion-card:not(.featured) .motion-card-title{font-size:19px}
.motion-card-sub{font-size:13px;line-height:1.65;color:var(--ink2);font-weight:300}
.motion-empty-state{border:1px dashed #D3CCC4;border-radius:16px;padding:44px 28px;text-align:center;color:var(--ink3);background:#FCFBF8}
.motion-empty-state strong{display:block;font-family:var(--serif);font-size:26px;color:var(--ink);margin-bottom:6px;font-weight:400}
.motion-lightbox{position:fixed;inset:0;z-index:3600;background:rgba(20,18,16,.74);backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:28px}
.motion-lightbox.open{display:flex}
.motion-lightbox-panel{width:min(100%,1040px);background:#F6F4EF;border-radius:20px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
.motion-lightbox-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}
.motion-lightbox-kicker{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
.motion-lightbox-title{font-family:var(--serif);font-size:34px;line-height:1.06;letter-spacing:-.8px;color:var(--ink);margin-bottom:8px;font-weight:400}
.motion-lightbox-sub{font-size:14px;line-height:1.7;color:var(--ink2);font-weight:300;max-width:720px}
.motion-player-wrap{aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#131211;border:1px solid rgba(0,0,0,.12)}
.motion-player-wrap video{width:100%;height:100%;display:block;background:#000}
.motion-player-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px;text-align:center;background:linear-gradient(135deg,#EEE8DE,#D9D0C4);color:var(--ink2)}
.motion-player-empty strong{display:block;font-family:var(--serif);font-size:28px;line-height:1.1;color:var(--ink);font-weight:400;margin-bottom:8px}
.motion-player-empty p{max-width:460px;font-size:14px;line-height:1.7}
.motion-player-empty .motion-play-btn{position:static;transform:none;margin-bottom:18px;pointer-events:none}
.motion-player-empty .motion-play-btn::before{content:'';display:block;width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:16px solid var(--ink);margin-left:4px}
.motion-player-empty .motion-play-btn{width:66px;height:66px;border:none;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 10px 26px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center}
"""
sub_once(old_work_css, new_work_css, 'work + motion CSS', literal=True)

# 2) Responsive rules for the motion section.
sub_once("""  #section-hero{padding:48px 24px}
  .hero-grid{grid-template-columns:1fr;gap:40px}
  .hero-text{margin-top:44px}
  .hero-about .about-name{font-size:34px}
  .hero-about .about-statement{font-size:19px}
  .hero h1{font-size:40px}
  .hero-visual{display:none}
  .section{padding:56px 24px}
  .work-grid{grid-template-columns:1fr}
  .skills-grid{grid-template-columns:1fr 1fr}
  .process-steps{grid-template-columns:1fr 1fr;gap:32px}""",
         """  #section-hero{padding:48px 24px}
  .hero-grid{grid-template-columns:1fr;gap:40px}
  .hero-text{margin-top:44px}
  .hero-about .about-name{font-size:34px}
  .hero-about .about-statement{font-size:19px}
  .hero h1{font-size:40px}
  .hero-visual{display:none}
  .section{padding:56px 24px}
  .work-grid{grid-template-columns:1fr}
  .motion-inner{padding:0 24px}
  .motion-grid{grid-template-columns:1fr 1fr}
  .motion-card.featured{grid-column:1 / -1}
  .motion-lightbox{padding:18px}
  .motion-lightbox-panel{padding:22px}
  .motion-lightbox-title{font-size:28px}
  .skills-grid{grid-template-columns:1fr 1fr}
  .process-steps{grid-template-columns:1fr 1fr;gap:32px}""",
         'responsive 900 motion', literal=True)
sub_once("""@media(max-width:600px){
  #toolbar{gap:8px;padding:8px 14px}
  #toolbar>span{display:none}
  .skills-grid{grid-template-columns:1fr}
  .process-steps{grid-template-columns:1fr}
  .tools-grid{flex-direction:column}
  .tool-card{min-width:unset}
  .gallery-grid{grid-template-columns:1fr}
  .exp-grid{grid-template-columns:1fr}
  .msg-actions{flex-direction:column}
  .about-name{font-size:38px}
  .about-statement{font-size:20px}
  .nav-links li:not(:last-child){display:none}
}""",
         """@media(max-width:600px){
  #toolbar{gap:8px;padding:8px 14px}
  #toolbar>span{display:none}
  .skills-grid{grid-template-columns:1fr}
  .process-steps{grid-template-columns:1fr}
  .tools-grid{flex-direction:column}
  .tool-card{min-width:unset}
  .gallery-grid{grid-template-columns:1fr}
  .motion-grid{grid-template-columns:1fr}
  .motion-card.featured{grid-column:auto}
  .motion-copy{padding:16px 18px 18px}
  .motion-card-title{font-size:20px}
  .motion-section{padding:48px 0}
  .exp-grid{grid-template-columns:1fr}
  .msg-actions{flex-direction:column}
  .about-name{font-size:38px}
  .about-statement{font-size:20px}
  .nav-links li:not(:last-child){display:none}
}""",
         'responsive 600 motion', literal=True)

# 3) Selected Work cards keep the exact overview, but now open the detailed overlay.
old_work_markup = """<!-- ══ WORK SECTION ══════════════════════════════════════ -->
<div id="section-work" class="section">
  <div class="section-label">Selected work</div>
  <div class="work-grid">
    <div class="work-card reveal">
      <div class="work-thumb g1">
        <img class="work-thumb-bg" id="w1-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Logo Design</div>
          <label class="work-upload-btn">📷 Photo<input type="file" accept="image/*" onchange="loadImgById(this,'w1-img')"></label>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Brand Logo — Visual Identity</div>
        <div class="work-meta" contenteditable="true">Logo Design · Branding · 2024</div>
      </div>
    </div>
    <div class="work-card reveal reveal-delay-1">
      <div class="work-thumb g2">
        <img class="work-thumb-bg" id="w2-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Social Media</div>
          <label class="work-upload-btn">📷 Photo<input type="file" accept="image/*" onchange="loadImgById(this,'w2-img')"></label>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Social Media Design Campaign</div>
        <div class="work-meta" contenteditable="true">Social Media · Posts · 2024</div>
      </div>
    </div>
    <div class="work-card reveal reveal-delay-2">
      <div class="work-thumb g3">
        <img class="work-thumb-bg" id="w3-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Poster Design</div>
          <label class="work-upload-btn">📷 Photo<input type="file" accept="image/*" onchange="loadImgById(this,'w3-img')"></label>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Event Poster — Typography</div>
        <div class="work-meta" contenteditable="true">Poster · Typography · 2023</div>
      </div>
    </div>
    <div class="work-card reveal reveal-delay-3">
      <div class="work-thumb g4">
        <img class="work-thumb-bg" id="w4-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Brand Identity</div>
          <label class="work-upload-btn">📷 Photo<input type="file" accept="image/*" onchange="loadImgById(this,'w4-img')"></label>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Full Brand Identity Package</div>
        <div class="work-meta" contenteditable="true">Branding · Identity · 2023</div>
      </div>
    </div>
  </div>
</div>"""
new_work_markup = """<!-- ══ WORK SECTION ══════════════════════════════════════ -->
<div id="section-work" class="section">
  <div class="section-label">Selected work</div>
  <div class="work-grid">
    <div class="work-card reveal" data-work="logo" onclick="openWork('logo', event)">
      <div class="work-thumb g1">
        <img class="work-thumb-bg" id="w1-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Logo Design</div>
          <button class="work-upload-btn" onclick="startSelectedWorkThumbEdit('logo', event)">📷 Photo</button>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Brand Logo — Visual Identity</div>
        <div class="work-meta" contenteditable="true">Logo Design · Branding · 2024</div>
      </div>
    </div>
    <div class="work-card reveal reveal-delay-1" data-work="social" onclick="openWork('social', event)">
      <div class="work-thumb g2">
        <img class="work-thumb-bg" id="w2-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Social Media</div>
          <button class="work-upload-btn" onclick="startSelectedWorkThumbEdit('social', event)">📷 Photo</button>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Social Media Design Campaign</div>
        <div class="work-meta" contenteditable="true">Social Media · Posts · 2024</div>
      </div>
    </div>
    <div class="work-card reveal reveal-delay-2" data-work="poster" onclick="openWork('poster', event)">
      <div class="work-thumb g3">
        <img class="work-thumb-bg" id="w3-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Poster Design</div>
          <button class="work-upload-btn" onclick="startSelectedWorkThumbEdit('poster', event)">📷 Photo</button>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Event Poster — Typography</div>
        <div class="work-meta" contenteditable="true">Poster · Typography · 2023</div>
      </div>
    </div>
    <div class="work-card reveal reveal-delay-3" data-work="identity" onclick="openWork('identity', event)">
      <div class="work-thumb g4">
        <img class="work-thumb-bg" id="w4-img" src="" alt="" style="display:none">
        <div class="work-thumb-overlay">
          <div class="work-thumb-label" contenteditable="true">Brand Identity</div>
          <button class="work-upload-btn" onclick="startSelectedWorkThumbEdit('identity', event)">📷 Photo</button>
        </div>
      </div>
      <div class="work-info">
        <div class="work-title" contenteditable="true">Full Brand Identity Package</div>
        <div class="work-meta" contenteditable="true">Branding · Identity · 2023</div>
      </div>
    </div>
  </div>
</div>"""
sub_once(old_work_markup, new_work_markup, 'Selected Work cards become overlay launchers', literal=True)

# 4) Replace old Design Showcase with Motion Graphics.
old_gallery_block = """  <!-- Design Gallery -->
  <div class="gallery-section">
    <div class="gallery-inner">
      <div class="section-label">Design Showcase</div>
      <p style="color:var(--ink2);font-weight:300;margin-bottom:28px;font-size:14px">Click to visit work</p>
      <div class="gallery-grid">
        <div class="gal-item tall reveal" id="gal1-wrap" data-gal="logo" onclick="openWork('logo', event)">
          <img id="gal1-img" src="" alt="Logo / Branding" style="display:none;width:100%;height:100%;object-fit:cover">
          <div class="gal-placeholder" id="gal1-ph" style="display:none"><span class="gal-placeholder-icon">🎨</span><span class="gal-placeholder-text">Logo / Branding</span></div>
          <div class="gal-overlay"><span class="gal-label" contenteditable="true">Logo Design</span></div>
          <div class="gal-actions" onclick="event.stopPropagation()">
            <button class="gal-act-btn" onclick="startGalEdit('logo')" title="Change the card image">✏️ Edit</button>
            <button class="gal-act-btn del" onclick="removeGalImage('logo')" title="Remove the card image">✕ Remove</button>
            <button class="gal-act-btn done" id="gal1-done-btn" onclick="doneGalEdit('logo')" style="display:none" title="Save changes">✓ Done</button>
          </div>
          <div class="gal-visit-badge">Click to visit work →</div>
        </div>
        <div class="gal-item reveal reveal-delay-1" id="gal2-wrap" data-gal="poster" onclick="openWork('poster', event)">
          <img id="gal2-img" src="" alt="Poster / Banner" style="display:none;width:100%;height:100%;object-fit:cover">
          <div class="gal-placeholder" id="gal2-ph" style="background:linear-gradient(135deg,#C8C3BB,#B0ABA2)"><span class="gal-placeholder-icon">🖼️</span><span class="gal-placeholder-text">Poster / Banner</span></div>
          <div class="gal-overlay"><span class="gal-label" contenteditable="true">Poster Design</span></div>
          <div class="gal-actions" onclick="event.stopPropagation()">
            <button class="gal-act-btn" onclick="startGalEdit('poster')" title="Change the card image">✏️ Edit</button>
            <button class="gal-act-btn del" onclick="removeGalImage('poster')" title="Remove the card image">✕ Remove</button>
            <button class="gal-act-btn done" id="gal2-done-btn" onclick="doneGalEdit('poster')" style="display:none" title="Save changes">✓ Done</button>
          </div>
          <div class="gal-visit-badge">Click to visit work →</div>
        </div>
        <div class="gal-item reveal reveal-delay-2" id="gal3-wrap" data-gal="social" onclick="openWork('social', event)">
          <img id="gal3-img" src="" alt="Social Media" style="display:none;width:100%;height:100%;object-fit:cover">
          <div class="gal-placeholder" id="gal3-ph" style="background:linear-gradient(135deg,#D5CFC7,#BEB8B0)"><span class="gal-placeholder-icon">📱</span><span class="gal-placeholder-text">Social Media</span></div>
          <div class="gal-overlay"><span class="gal-label" contenteditable="true">Social Media Design</span></div>
          <div class="gal-actions" onclick="event.stopPropagation()">
            <button class="gal-act-btn" onclick="startGalEdit('social')" title="Change the card image">✏️ Edit</button>
            <button class="gal-act-btn del" onclick="removeGalImage('social')" title="Remove the card image">✕ Remove</button>
            <button class="gal-act-btn done" id="gal3-done-btn" onclick="doneGalEdit('social')" style="display:none" title="Save changes">✓ Done</button>
          </div>
          <div class="gal-visit-badge">Click to visit work →</div>
        </div>
        <div class="gal-item reveal reveal-delay-1" id="gal4-wrap" data-gal="identity" onclick="openWork('identity', event)">
          <img id="gal4-img" src="" alt="Brand Identity" style="display:none;width:100%;height:100%;object-fit:cover">
          <div class="gal-placeholder" id="gal4-ph" style="background:linear-gradient(135deg,#CAC5BE,#B5B0A8)"><span class="gal-placeholder-icon">💼</span><span class="gal-placeholder-text">Brand Identity</span></div>
          <div class="gal-overlay"><span class="gal-label" contenteditable="true">Brand Identity</span></div>
          <div class="gal-actions" onclick="event.stopPropagation()">
            <button class="gal-act-btn" onclick="startGalEdit('identity')" title="Change the card image">✏️ Edit</button>
            <button class="gal-act-btn del" onclick="removeGalImage('identity')" title="Remove the card image">✕ Remove</button>
            <button class="gal-act-btn done" id="gal4-done-btn" onclick="doneGalEdit('identity')" style="display:none" title="Save changes">✓ Done</button>
          </div>
          <div class="gal-visit-badge">Click to visit work →</div>
        </div>
        <div class="gal-item reveal reveal-delay-2" id="gal5-wrap" data-gal="card" onclick="openWork('card', event)">
          <img id="gal5-img" src="" alt="Business Card" style="display:none;width:100%;height:100%;object-fit:cover">
          <div class="gal-placeholder" id="gal5-ph" style="background:linear-gradient(135deg,#D0C9C1,#BAB4AC)"><span class="gal-placeholder-icon">🃏</span><span class="gal-placeholder-text">Business Card</span></div>
          <div class="gal-overlay"><span class="gal-label" contenteditable="true">Business Card</span></div>
          <div class="gal-actions" onclick="event.stopPropagation()">
            <button class="gal-act-btn" onclick="startGalEdit('card')" title="Change the card image">✏️ Edit</button>
            <button class="gal-act-btn del" onclick="removeGalImage('card')" title="Remove the card image">✕ Remove</button>
            <button class="gal-act-btn done" id="gal5-done-btn" onclick="doneGalEdit('card')" style="display:none" title="Save changes">✓ Done</button>
          </div>
          <div class="gal-visit-badge">Click to visit work →</div>
        </div>
      </div>
    </div>
  </div>
"""
new_gallery_block = """  <!-- Motion Graphics -->
  <div class="motion-section">
    <div class="motion-inner">
      <div class="section-label">Motion Graphics</div>
      <p class="motion-sub">Logo reveals, product promos, social reels and typography-driven motion — editable inside the website, with modal playback and self-contained export support.</p>
      <div class="editor-controls visible motion-editor-row">
        <button class="editor-btn add" onclick="addMotionCard()">+ Add Video Card</button>
      </div>
      <div class="motion-grid" id="motion-grid"></div>
    </div>
  </div>
"""
sub_once(old_gallery_block, new_gallery_block, 'Design Showcase -> Motion Graphics', literal=True)

# 5) Add Motion hidden inputs + modal after the existing work overlay.
old_overlay_tail = """</div>

<!-- ══ JAVASCRIPT ════════════════════════════════════════ -->"""
new_overlay_tail = """</div>

<input type="file" accept="image/*" id="motion-thumb-input" style="display:none" onchange="onMotionThumbPicked(this)">
<input type="file" accept="video/*" id="motion-video-input" style="display:none" onchange="onMotionVideoPicked(this)">
<div class="motion-lightbox" id="motion-lightbox" onclick="if(event.target===this)closeMotionLightbox()">
  <div class="motion-lightbox-panel">
    <div class="motion-lightbox-head">
      <div style="flex:1;min-width:260px">
        <div class="motion-lightbox-kicker" id="motion-lightbox-kicker">Motion Graphics</div>
        <h2 class="motion-lightbox-title" id="motion-lightbox-title">Motion Piece</h2>
        <p class="motion-lightbox-sub" id="motion-lightbox-sub"></p>
      </div>
      <button class="logo-work-close" onclick="closeMotionLightbox()" title="Close">✕</button>
    </div>
    <div class="motion-player-wrap" id="motion-player-wrap"></div>
  </div>
</div>

<!-- ══ JAVASCRIPT ════════════════════════════════════════ -->"""
sub_once(old_overlay_tail, new_overlay_tail, 'motion lightbox markup', literal=True)

# 6) Motion data block after contactData.
old_contact_tail = """let contactData = [
  {label: 'Phone (Display only)', icon: '📞', iconBg: 'grey', value: '7292077850', sub: '8447042757', actionType: 'none', actionValue: ''},
  {label: 'WhatsApp', icon: '💬', iconBg: 'green', value: 'Chat on WhatsApp', sub: 'Click to open — message pre-filled', actionType: 'whatsapp', actionValue: '917292077850', whatsappMsg: 'Hi Beekesh, I visited your portfolio and would like to discuss a design project with you.'},
  {label: 'Email', icon: '✉️', iconBg: 'red', value: 'beekeshstar@gmail.com', sub: 'Subject pre-filled: Design Project Inquiry', actionType: 'email', actionValue: 'beekeshstar@gmail.com', emailSubject: 'Design Project Inquiry from Portfolio'},
  {label: 'LinkedIn', icon: '💼', iconBg: 'blue', value: 'Beekesh S.', sub: 'linkedin.com/in/beekesh-s-680967384', actionType: 'link', actionValue: 'https://www.linkedin.com/in/beekesh-s-680967384'},
  {label: 'Fiverr', icon: 'Fi', iconBg: 'teal', value: 'Hire me on Fiverr', sub: 'fiverr.com/s/WE5rZ0X', actionType: 'link', actionValue: 'https://www.fiverr.com/s/WE5rZ0X', iconStyle: 'font-size:16px;font-weight:700;color:#1dbf73;background:#e0f9ee'}
];"""
new_contact_tail = old_contact_tail + """

const MOTION_DEFAULTS = /*EMBED_START*/[
  {title: 'Launch-Ready Logo Reveal', category: 'Logo Animation', sub: 'Featured panel · upload your reel or showreel cut here', thumb: null, video: null, tone: 'forest'},
  {title: 'Product Motion Teaser', category: 'Product Motion', sub: 'Short promo edits for products, apps and launches', thumb: null, video: null, tone: 'ink'},
  {title: 'Social Reel Pack', category: 'Social Media Motion', sub: 'Story-sized campaign clips and scroll-first motion', thumb: null, video: null, tone: 'blue'},
  {title: 'Animated Type Study', category: 'Typography Animation', sub: 'Kinetic type, lyric motion and title sequences', thumb: null, video: null, tone: 'plum'},
  {title: 'Cinematic Brand Opener', category: 'Cinematic Motion Graphics', sub: 'Mood-led openings, transitions and high-polish edits', thumb: null, video: null, tone: 'amber'}
]/*EMBED_END*/;
let motionData = Array.isArray(MOTION_DEFAULTS) ? JSON.parse(JSON.stringify(MOTION_DEFAULTS)) : [];
let motionTarget = null;
let currentMotionIndex = -1;"""
sub_once(old_contact_tail, new_contact_tail, 'motion data store', literal=True)

# 7) toggleEditMode rerenders the new section.
sub_once("""  // Re-render all sections to show/hide edit buttons
  renderTools();
  renderEducation();
  renderLanguages();
  renderContacts();""",
         """  // Re-render all sections to show/hide edit buttons
  renderTools();
  renderMotion();
  renderEducation();
  renderLanguages();
  renderContacts();""",
         'toggleEditMode renders motion', literal=True)

# 8) Render function for Motion Graphics.
old_render_anchor = """function renderTools() {
  const grid = document.getElementById('tools-grid');
  grid.innerHTML = toolsData.map((tool, i) => `
    <div class="tool-card reveal visible">"""
# insert after renderTools() block, before renderEducation()
render_tools_end = """function renderEducation() {"""
motion_render_block = """
function motionToneClass(tone) {
  return ({forest:'motion-grad-forest', ink:'motion-grad-ink', blue:'motion-grad-blue', plum:'motion-grad-plum', amber:'motion-grad-amber'})[tone] || 'motion-grad-forest';
}

function safeMotionCard(card) {
  card = card || {};
  return {
    title: card.title || 'Untitled Motion Piece',
    category: card.category || 'Motion Graphics',
    sub: card.sub || 'Upload a video and thumbnail',
    thumb: card.thumb || null,
    video: card.video || null,
    tone: card.tone || 'forest'
  };
}

function renderMotion() {
  if (!Array.isArray(motionData)) motionData = [];
  motionData = motionData.map(safeMotionCard);
  const grid = document.getElementById('motion-grid');
  if (!grid) return;
  if (!motionData.length) {
    grid.innerHTML = '<div class="motion-empty-state"><strong>Motion section is empty</strong>Add a video card in Edit Mode to start building your motion graphics showcase.</div>';
    return;
  }
  grid.innerHTML = motionData.map((card, i) => {
    const featured = i === 0;
    const hasVideo = !!card.video;
    const contenteditable = editMode ? 'true' : 'false';
    return `
      <div class="motion-card reveal visible ${featured ? 'featured ' : ''}${hasVideo ? 'openable' : 'empty-video'}" ${hasVideo || editMode ? `onclick="openMotionLightbox(${i}, event)"` : ''}>
        <div class="motion-media">
          ${card.thumb
            ? `<img class="motion-thumb-img" src="${card.thumb}" alt="${escapeHtml(card.title)} thumbnail">`
            : `<div class="motion-ph ${motionToneClass(card.tone)}"><div class="motion-ph-copy"><span>${escapeHtml(card.category)}</span><strong>${escapeHtml(card.title)}</strong></div></div>`}
          <div class="motion-play-btn"></div>
          ${editMode ? `
            <div class="editor-controls visible motion-card-controls" onclick="event.stopPropagation()">
              <button class="editor-btn" onclick="uploadMotionVideo(${i}, event)">🎞 Video</button>
              <button class="editor-btn" onclick="uploadMotionThumb(${i}, event)">🖼 Thumb</button>
              <button class="editor-btn delete" onclick="removeMotionCard(${i}, event)">Remove</button>
            </div>
          ` : ''}
        </div>
        <div class="motion-copy">
          <div class="motion-kicker" contenteditable="${contenteditable}" oninput="syncMotionField(${i}, 'category', this)">${escapeHtml(card.category)}</div>
          <div class="motion-card-title" contenteditable="${contenteditable}" oninput="syncMotionField(${i}, 'title', this)">${escapeHtml(card.title)}</div>
          <div class="motion-card-sub" contenteditable="${contenteditable}" oninput="syncMotionField(${i}, 'sub', this)">${escapeHtml(card.sub)}</div>
        </div>
      </div>`;
  }).join('');
}

"""
sub_once(render_tools_end, motion_render_block + render_tools_end, 'renderMotion function', literal=True)

# 9) Selected Work card helpers and Motion behavior after the shared work overlay code.
insert_after = """document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('work-overlay');
    if (ov && ov.classList.contains('open')) closeWork();
  }
});


function navClick(e, sectionId) {"""
replacement_after = """document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('work-overlay');
    const mv = document.getElementById('motion-lightbox');
    if (ov && ov.classList.contains('open')) { closeWork(); return; }
    if (mv && mv.classList.contains('open')) { closeMotionLightbox(); }
  }
});

const SELECTED_WORK_CARDS = { logo: 'w1', social: 'w2', poster: 'w3', identity: 'w4' };

function refreshSelectedWorkCard(key) {
  if (!galleries || !galleries[key] || !SELECTED_WORK_CARDS[key]) return;
  const id = SELECTED_WORK_CARDS[key];
  const img = document.getElementById(id + '-img');
  if (!img) return;
  const src = cardImageSrc(galleries[key]);
  if (src) {
    img.src = src;
    img.style.display = 'block';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
}

function refreshSelectedWorkCards() {
  Object.keys(SELECTED_WORK_CARDS).forEach(refreshSelectedWorkCard);
}

function startSelectedWorkThumbEdit(key, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  fileTarget = { type: 'thumb', key: key, showDone: false };
  const f = document.getElementById('work-file-input');
  if (f) { f.value = ''; f.click(); }
}

function syncMotionField(index, field, el) {
  if (!motionData[index]) return;
  const t = (el && el.innerText !== undefined && el.innerText !== null) ? el.innerText : (el ? el.textContent : '');
  motionData[index][field] = (t || '').replace(/\n+$/, '');
}

function addMotionCard() {
  const tones = ['forest', 'ink', 'blue', 'plum', 'amber'];
  if (!Array.isArray(motionData)) motionData = [];
  motionData.push({
    title: 'New Motion Piece',
    category: 'Motion Graphics',
    sub: 'Upload a video and thumbnail',
    thumb: null,
    video: null,
    tone: tones[motionData.length % tones.length]
  });
  renderMotion();
  requestAnimationFrame(() => {
    const last = document.querySelector('#motion-grid .motion-card:last-child .motion-card-title');
    if (last) last.focus();
  });
}

function uploadMotionThumb(index, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  motionTarget = { type: 'thumb', index: index };
  const f = document.getElementById('motion-thumb-input');
  if (f) { f.value = ''; f.click(); }
}

function uploadMotionVideo(index, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  motionTarget = { type: 'video', index: index };
  const f = document.getElementById('motion-video-input');
  if (f) { f.value = ''; f.click(); }
}

function onMotionThumbPicked(input) {
  const file = input.files[0];
  const t = motionTarget;
  input.value = '';
  if (!file || !t || t.type !== 'thumb' || !motionData[t.index]) return;
  const reader = new FileReader();
  reader.onload = e => {
    motionData[t.index].thumb = e.target.result;
    motionTarget = null;
    renderMotion();
    showToast('✓ Motion thumbnail updated');
  };
  reader.readAsDataURL(file);
}

function onMotionVideoPicked(input) {
  const file = input.files[0];
  const t = motionTarget;
  input.value = '';
  if (!file || !t || t.type !== 'video' || !motionData[t.index]) return;
  const reader = new FileReader();
  reader.onload = e => {
    motionData[t.index].video = e.target.result;
    motionTarget = null;
    renderMotion();
    showToast('✓ Motion video updated');
  };
  reader.readAsDataURL(file);
}

function removeMotionCard(index, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!confirm('Remove this motion graphics card?')) return;
  motionData.splice(index, 1);
  renderMotion();
  closeMotionLightbox();
  showToast('Motion card removed');
}

function openMotionLightbox(index, e) {
  if (e) {
    if (e.target.closest && e.target.closest('.editor-controls')) return;
    if (e.target.isContentEditable) return;
  }
  if (!motionData[index]) return;
  currentMotionIndex = index;
  const card = safeMotionCard(motionData[index]);
  document.getElementById('motion-lightbox-kicker').textContent = card.category || 'Motion Graphics';
  document.getElementById('motion-lightbox-title').textContent = card.title || 'Motion Piece';
  document.getElementById('motion-lightbox-sub').textContent = card.sub || '';
  const wrap = document.getElementById('motion-player-wrap');
  if (card.video) {
    wrap.innerHTML = '<video controls playsinline autoplay ' + (card.thumb ? 'poster="' + card.thumb + '" ' : '') + 'src="' + card.video + '"></video>';
  } else {
    wrap.innerHTML = '<div class="motion-player-empty"><div class="motion-play-btn"></div><strong>No video added yet</strong><p>Use Edit Mode to upload a video file for this card. The thumbnail, title and subtitle can all be edited right on the card.</p></div>';
  }
  document.getElementById('motion-lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMotionLightbox() {
  const box = document.getElementById('motion-lightbox');
  if (box) box.classList.remove('open');
  const wrap = document.getElementById('motion-player-wrap');
  if (wrap) wrap.innerHTML = '';
  document.body.style.overflow = '';
  currentMotionIndex = -1;
}


function navClick(e, sectionId) {"""
sub_once(insert_after, replacement_after, 'selected-work + motion JS helpers', literal=True)

# 10) Work overlay helpers now sync the Selected Work cards too, and ignore the work upload button.
sub_once("""function refreshAllCards() { Object.keys(GALLERY_CARDS).forEach(refreshCard); }""",
         """function refreshAllCards() {
  Object.keys(GALLERY_CARDS).forEach(refreshCard);
  refreshSelectedWorkCards();
}""",
         'refreshAllCards also refreshes Selected Work', literal=True)

sub_once("""function onWorkFilePicked(input) {
  const file = input.files[0];
  const t = fileTarget;
  input.value = '';
  if (!file || !t) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    if (t.type === 'thumb') {
      galleries[t.key].thumb = data;
      refreshCard(t.key);
      showCardDone(t.key, true);
    } else {
      galleries[t.key].items.push({ src: data, cap: '' });
      renderWorkList();
      workEditMode = true;
      applyWorkEdit();
      const caps = document.querySelectorAll('#work-list .lw-cap');
      const last = caps[caps.length - 1];
      if (last) last.focus();
    }
    fileTarget = null;
  };
  reader.readAsDataURL(file);
}""",
         """function onWorkFilePicked(input) {
  const file = input.files[0];
  const t = fileTarget;
  input.value = '';
  if (!file || !t) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    if (t.type === 'thumb') {
      galleries[t.key].thumb = data;
      refreshCard(t.key);
      refreshSelectedWorkCard(t.key);
      if (t.showDone === false) showToast('✓ Card image updated');
      else showCardDone(t.key, true);
    } else {
      galleries[t.key].items.push({ src: data, cap: '' });
      renderWorkList();
      refreshSelectedWorkCard(t.key);
      workEditMode = true;
      applyWorkEdit();
      const caps = document.querySelectorAll('#work-list .lw-cap');
      const last = caps[caps.length - 1];
      if (last) last.focus();
    }
    fileTarget = null;
  };
  reader.readAsDataURL(file);
}""",
         'onWorkFilePicked updates Selected Work cards', literal=True)

sub_once("""function openWork(key, e) {
  if (e) {
    if (e.target.closest && e.target.closest('.gal-actions')) return;
    if (e.target.isContentEditable) return;
  }""",
         """function openWork(key, e) {
  if (e) {
    if (e.target.closest && (e.target.closest('.gal-actions') || e.target.closest('.work-upload-btn') || e.target.closest('.editor-controls'))) return;
    if (e.target.isContentEditable) return;
  }""",
         'openWork ignores Selected Work upload button', literal=True)

sub_once("""function removeWorkItem(i) {
  if (!currentGallery) return;
  if (!confirm('Remove this work image?')) return;
  galleries[currentGallery].items.splice(i, 1);
  renderWorkList();
  refreshCard(currentGallery);
  applyWorkEdit();
  showToast('Work image removed');
}""",
         """function removeWorkItem(i) {
  if (!currentGallery) return;
  if (!confirm('Remove this work image?')) return;
  galleries[currentGallery].items.splice(i, 1);
  renderWorkList();
  refreshCard(currentGallery);
  refreshSelectedWorkCard(currentGallery);
  applyWorkEdit();
  showToast('Work image removed');
}""",
         'removeWorkItem updates Selected Work cards', literal=True)

# 11) Export / restore now know about motionData and the Selected Work cards.
sub_once("""function restoreSavedData() {
  if (Array.isArray(window.statsData) && window.statsData.length) statsData = window.statsData;
  if (Array.isArray(window.toolsData) && window.toolsData.length) toolsData = window.toolsData;
  if (Array.isArray(window.educationData) && window.educationData.length) educationData = window.educationData;
  if (Array.isArray(window.languagesData) && window.languagesData.length) languagesData = window.languagesData;
  if (Array.isArray(window.contactData) && window.contactData.length) contactData = window.contactData;
}""",
         """function restoreSavedData() {
  if (Array.isArray(window.statsData) && window.statsData.length) statsData = window.statsData;
  if (Array.isArray(window.toolsData) && window.toolsData.length) toolsData = window.toolsData;
  if (Array.isArray(window.motionData)) motionData = window.motionData;
  if (Array.isArray(window.educationData) && window.educationData.length) educationData = window.educationData;
  if (Array.isArray(window.languagesData) && window.languagesData.length) languagesData = window.languagesData;
  if (Array.isArray(window.contactData) && window.contactData.length) contactData = window.contactData;
}""",
         'restoreSavedData includes motionData', literal=True)

sub_once("""window.addEventListener('DOMContentLoaded', () => {
  restoreSavedData();
  loadGalleries();
  refreshAllCards();
  renderStats();
  renderTools();
  renderEducation();
  renderLanguages();
  renderContacts();""",
         """window.addEventListener('DOMContentLoaded', () => {
  restoreSavedData();
  loadGalleries();
  refreshAllCards();
  renderStats();
  renderTools();
  renderMotion();
  renderEducation();
  renderLanguages();
  renderContacts();""",
         'DOMContentLoaded renders motion', literal=True)

sub_once("""  clone.querySelectorAll('.upload-hint,.img-upload-hint,.work-upload-btn,.gal-upload-input,.gal-actions,.lw-edit-tools,.lw-remove,.work-add-row,#lw-toast,#work-file-input').forEach(el => el.remove());
  clone.querySelectorAll('.gal-visit-badge').forEach(el => el.style.opacity = '1');
  // Drop work items that never got an image, and switch off cards with no work yet
  clone.querySelectorAll('#work-list .lw-item').forEach(el => { if (!el.querySelector('img')) el.remove(); });
  clone.querySelectorAll('.gal-item[data-gal]').forEach(el => {
    const g = galleries[el.getAttribute('data-gal')];
    if (!g || !g.items.length) {
      el.removeAttribute('onclick');
      el.style.cursor = 'default';
      const b = el.querySelector('.gal-visit-badge');
      if (b) b.remove();
    }
  });""",
         """  clone.querySelectorAll('.upload-hint,.img-upload-hint,.work-upload-btn,.gal-upload-input,.gal-actions,.lw-edit-tools,.lw-remove,.work-add-row,#lw-toast,#work-file-input,#motion-player-wrap video').forEach(el => el.remove());
  const mv = clone.querySelector('#motion-lightbox');
  if (mv) mv.classList.remove('open');
  const mp = clone.querySelector('#motion-player-wrap');
  if (mp) mp.innerHTML = '';
  clone.querySelectorAll('.gal-visit-badge').forEach(el => el.style.opacity = '1');
  // Drop work items that never got an image, and switch off Selected Work cards with no detailed gallery yet
  clone.querySelectorAll('#work-list .lw-item').forEach(el => { if (!el.querySelector('img')) el.remove(); });
  clone.querySelectorAll('.work-card[data-work]').forEach(el => {
    const g = galleries[el.getAttribute('data-work')];
    if (!g || !g.items.length) {
      el.removeAttribute('onclick');
      el.style.cursor = 'default';
    }
  });""",
         'download cleanup for Selected Work + motion', literal=True)

sub_once("""window.statsData = ${JSON.stringify(statsData)};
window.toolsData = ${JSON.stringify(toolsData)};
window.educationData = ${JSON.stringify(educationData)};
window.languagesData = ${JSON.stringify(languagesData)};
window.contactData = ${JSON.stringify(contactData)};
window.__WORK_GALLERIES__ = ${JSON.stringify(galleries)};""",
         """window.statsData = ${JSON.stringify(statsData)};
window.toolsData = ${JSON.stringify(toolsData)};
window.motionData = ${JSON.stringify(motionData)};
window.educationData = ${JSON.stringify(educationData)};
window.languagesData = ${JSON.stringify(languagesData)};
window.contactData = ${JSON.stringify(contactData)};
window.__WORK_GALLERIES__ = ${JSON.stringify(galleries)};""",
         'download injects motionData', literal=True)

P.write_text(h, encoding='utf-8')
print(f"\nPATCH7 DONE  {len(h.encode('utf-8')) // 1024} KB")
