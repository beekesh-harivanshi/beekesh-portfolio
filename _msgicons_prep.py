import base64, hashlib, pathlib
from PIL import Image

SRC = pathlib.Path(r"C:\Users\admin\Downloads\beekesh - portfolio")
OUT = SRC / "_msgicons"
OUT.mkdir(exist_ok=True)

# ── WhatsApp ───────────────────────────────────────────────────────────────
# The supplied file is the app-icon style tile: a green rounded square with a
# white glyph. The send button is already WhatsApp green (#25D366), so a green
# tile on it would show a seam. The glyph is pure white and the tile is a
# saturated green, and the min(r,g,b) histogram is cleanly bimodal
# (tile <= 63, glyph >= 240, almost nothing between) — so min-channel is an
# exact "how much white is in this pixel" key. Ramp it and the anti-aliased
# edges come out smooth instead of jagged.
wa = Image.open(SRC / "whatsapp icon.png").convert("RGBA")
a = wa.getchannel("A")
wa = wa.crop(a.point(lambda v: 255 if v >= 16 else 0).getbbox())

FLOOR, CEIL = 72.0, 235.0
px = wa.load()
for y in range(wa.height):
    for x in range(wa.width):
        r, g, b, al = px[x, y]
        m = min(r, g, b)
        k = 0.0 if m <= FLOOR else (1.0 if m >= CEIL else (m - FLOOR) / (CEIL - FLOOR))
        px[x, y] = (255, 255, 255, int(round(al * k)))

wa = wa.crop(wa.getchannel("A").point(lambda v: 255 if v >= 16 else 0).getbbox())
wa = wa.resize((48, 48), Image.LANCZOS)

# ── Email ──────────────────────────────────────────────────────────────────
# Already a transparent-background envelope (white body, blue outline), which
# reads well on the dark ink button. Just crop tight and keep the aspect.
em = Image.open(SRC / "email icon.png").convert("RGBA")
em = em.crop(em.getchannel("A").point(lambda v: 255 if v >= 16 else 0).getbbox())
em = em.resize((48, max(1, round(48 * em.height / em.width))), Image.LANCZOS)

for name, im in (("wa", wa), ("em", em)):
    p = OUT / (name + ".png")
    im.save(p, "PNG", optimize=True)
    raw = p.read_bytes()
    b64 = base64.b64encode(raw).decode()
    print("%s  %dx%d  %d bytes png  %d bytes base64  fp=%s"
          % (name, im.width, im.height, len(raw), len(b64),
             hashlib.sha256(raw).hexdigest()[:16]))
    (OUT / (name + ".b64")).write_text(b64, encoding="ascii")
