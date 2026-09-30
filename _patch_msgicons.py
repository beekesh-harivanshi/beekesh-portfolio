import pathlib, re, sys

HTML = pathlib.Path(r"C:\Users\admin\Downloads\beekesh - portfolio\beekesh-portfolio.html")
OUT = pathlib.Path(r"C:\Users\admin\Downloads\beekesh - portfolio\_msgicons")

WA = (OUT / "wa.b64").read_text(encoding="ascii").strip()
EM = (OUT / "em.b64").read_text(encoding="ascii").strip()

h = HTML.read_text(encoding="utf-8")
orig_len = len(h)


def sub_once(pattern, repl, label, flags=0):
    global h
    rx = re.compile(pattern, flags) if flags else re.compile(pattern)
    new, n = rx.subn(lambda m: repl, h, count=1)
    if n != 1:
        sys.exit("PATCH FAILED (%s): %d matches" % (label, n))
    h = new
    print("  ok  %s" % label)


# 1 ── CSS: the upload row is gone, so its rule goes too. The glyph is now always
#      an <img>, so the emoji font-size on the box is dead weight.
sub_once(re.escape(".msg-btn-icon{display:inline-flex;align-items:center;justify-content:center;"
                   "width:18px;height:18px;margin-right:7px;vertical-align:middle;font-size:14px}"),
         ".msg-btn-icon{display:inline-flex;align-items:center;justify-content:center;"
         "width:18px;height:18px;margin-right:7px;vertical-align:middle}",
         "msg-btn-icon css")

sub_once(r"\.msg-icon-row\{[^}]*\}\n", "", "drop msg-icon-row css")

# 2 ── Markup: bake the real icons in and delete the whole upload row.
new_actions = (
    '      <div class="msg-actions">\n'
    '        <button class="msg-btn wa" onclick="sendWhatsApp()"><span class="msg-btn-icon">'
    '<img src="data:image/png;base64,%s" alt="WhatsApp"></span>Send on WhatsApp</button>\n'
    '        <button class="msg-btn em" onclick="sendEmail()"><span class="msg-btn-icon">'
    '<img src="data:image/png;base64,%s" alt="Email"></span>Send via Email</button>\n'
    '      </div>\n'
    '      <p id="msg-error"' % (WA, EM)
)
sub_once(r'<div class="msg-actions">.*?</div>\s*\n\s*<p id="msg-err',
         new_actions,
         "bake icons, drop upload row",
         re.S)

# 3 ── JS: the upload/reset/render trio has no UI left to drive it.
sub_once(r'// [^\n]*icons on the "Send a message" buttons.*?\n\n(?=// [^\n]*\n// MODAL HELPERS)',
         "", "drop msg icon js", re.S)

# 4 ── The hidden file input it used.
sub_once(r'<input type="file" accept="image/\*" id="msg-icon-input"[^>]*>\n', "", "drop file input")

# 5 ── Export: no state left to inject, so drop it from the strip list and the
#      injected globals (the icons are plain <img> markup now, which the clone keeps).
sub_once(re.escape(",#msg-icon-input"), "", "strip list")
sub_once(re.escape("window.msgIcons = ${JSON.stringify(msgIcons)};\n"), "", "export injection")
sub_once(re.escape("  if (window.msgIcons && typeof window.msgIcons === 'object') {\n"
                   "    msgIcons = { wa: window.msgIcons.wa || '', em: window.msgIcons.em || '' };\n"
                   "  }\n"), "", "restore adoption")
sub_once(re.escape("  renderMsgIcons();\n"), "", "DOMContentLoaded call")

HTML.write_text(h, encoding="utf-8")
print("\nwritten: %d -> %d bytes (%+d)" % (orig_len, len(h), len(h) - orig_len))
