#!/usr/bin/env python3
"""Generate the 1200x630 social share card (assets/share-card.png)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
W, H = 1200, 630
TEAL_TOP = (19, 71, 70)      # #134746
TEAL_BOT = (28, 97, 96)      # #1C6160
PEACH = (240, 161, 122)      # #F0A17A
MIST = (233, 241, 238)

# --- background: vertical teal gradient -------------------------------------
img = Image.new("RGB", (W, H), TEAL_TOP)
top = Image.new("RGB", (W, H), TEAL_TOP)
bot = Image.new("RGB", (W, H), TEAL_BOT)
mask = Image.new("L", (W, H))
mask.putdata([int(255 * (y / H)) for y in range(H) for _ in range(W)])
img = Image.composite(bot, top, mask)

# --- soft peach glow, lower-right --------------------------------------------
glow = Image.new("RGB", (W, H), TEAL_BOT)
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 380, H - 300, W + 220, H + 300], fill=PEACH)
glow = glow.filter(ImageFilter.GaussianBlur(160))
img = Image.blend(img, glow, 0.14)

draw = ImageDraw.Draw(img)

# --- subtle "+" micro-pattern ------------------------------------------------
plus = (255, 255, 255)
for y in range(60, H, 58):
    for x in range(60, W, 58):
        draw.line([(x - 6, y), (x + 6, y)], fill=plus, width=2)
        draw.line([(x, y - 6), (x, y + 6)], fill=plus, width=2)
# fade the pattern by blending a flat copy back over it
flat = Image.composite(bot, top, mask)
img = Image.blend(img, flat, 0.90)
draw = ImageDraw.Draw(img)

# --- right: product image in a rounded "mist" card ---------------------------
CARD = 430
cx0, cy0 = W - CARD - 70, (H - CARD) // 2
card = Image.new("RGBA", (CARD, CARD), MIST + (255,))
rmask = Image.new("L", (CARD, CARD), 0)
ImageDraw.Draw(rmask).rounded_rectangle([0, 0, CARD, CARD], radius=34, fill=255)
prod = Image.open("assets/elite-ii-hero-screen.webp").convert("RGBA")
pad = 26
fit = CARD - pad * 2
prod.thumbnail((fit, fit), Image.LANCZOS)
# the studio shot is already teal — round its corners so it sits cleanly
inner = Image.new("RGBA", (fit, fit), (0, 0, 0, 0))
px = (fit - prod.width) // 2
py = (fit - prod.height) // 2
inner.paste(prod, (px, py))
imask = Image.new("L", (fit, fit), 0)
ImageDraw.Draw(imask).rounded_rectangle([0, 0, fit, fit], radius=20, fill=255)
card.paste(inner, (pad, pad), Image.composite(imask, Image.new("L", (fit, fit), 0), inner.split()[3]))
# drop shadow for the card
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([cx0 + 6, cy0 + 14, cx0 + CARD + 6, cy0 + CARD + 14], radius=34, fill=(0, 0, 0, 90))
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
img.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), shadow.split()[3].point(lambda a: int(a * 0.6)))
img.paste(card, (cx0, cy0), Image.composite(rmask, Image.new("L", (CARD, CARD), 0), card.split()[3]))
draw = ImageDraw.Draw(img)

# --- white triquetra mark (recoloured from the teal app icon) ----------------
mk = Image.open("apple-touch-icon.png").convert("L")
alpha = mk.point(lambda p: min(255, int((255 - p) * 3)))          # teal→opaque, white→clear
white = Image.new("RGBA", mk.size, (255, 255, 255, 255))
white.putalpha(alpha)
white = white.resize((96, 96), Image.LANCZOS)
LX = 84
img.paste(white, (LX, 96), white)

# --- text --------------------------------------------------------------------
def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)

serif = "/System/Library/Fonts/Supplemental/Baskerville.ttc"
sans = "/System/Library/Fonts/Helvetica.ttc"
f_eyebrow = font(sans, 26, index=1)   # bold
f_title = font(serif, 88, index=0)
f_sub = font(sans, 30)

def spaced(s, n=4):
    return (" " * 0 + ("").join(s)).upper()

# eyebrow (letter-spaced peach)
eyebrow = "GRENCO MEDICAL"
ex = LX + 128
draw.text((ex, 112), " ".join(list("")), font=f_eyebrow)  # noop
# manual letter spacing
cx = ex
for ch in eyebrow:
    draw.text((cx, 118), ch, font=f_eyebrow, fill=PEACH)
    cx += draw.textlength(ch, font=f_eyebrow) + 6

# title (two lines, serif, white)
draw.text((LX, 250), "Brand &", font=f_title, fill=(255, 255, 255))
draw.text((LX, 348), "Product Assets", font=f_title, fill=(255, 255, 255))

# peach accent dash
draw.rounded_rectangle([LX + 3, 476, LX + 71, 482], radius=3, fill=PEACH)

# subtitle
draw.text((LX, 502), "Official Grenco Medical Elite II photography,", font=f_sub, fill=(214, 226, 223))
draw.text((LX, 542), "logos, packaging, videos & documents", font=f_sub, fill=(214, 226, 223))

img.save("assets/share-card.png", "PNG")
# also a jpg fallback (smaller, universally supported)
img.convert("RGB").save("assets/share-card.jpg", "JPEG", quality=88)
print("wrote assets/share-card.png", img.size, os.path.getsize("assets/share-card.png"), "bytes")
