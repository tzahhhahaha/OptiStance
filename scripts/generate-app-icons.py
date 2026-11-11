#!/usr/bin/env python3
"""
Generate the OptiStance app icon set from the uploaded branding asset.

This script processes the master icon image into:
  - Android legacy icons:        mipmap-<density>/ic_launcher.png (+ _round)
  - Android adaptive foreground: mipmap-<density>/ic_launcher_foreground.png
  - Web & PWA icons:             public/icons/... & public/favicon-32.png (+ favicon.ico)
  - Color resources:             android/app/src/main/res/values/ic_launcher_background.xml
"""

import os
from collections import deque
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_PATH = os.path.join(ROOT, 'resources', 'app-icon-source.jpg')
if not os.path.exists(SOURCE_PATH):
    # Fallback to user uploaded path if not yet in resources
    SOURCE_PATH = r'C:\Users\Jeamuel Amado\.gemini\antigravity\brain\76e02f83-c97c-43e0-9bf8-fe431ff3af55\.user_uploaded\media_1792581441719_82606876.jpg'

def build_masters():
    print(f"Loading source from: {SOURCE_PATH}")
    # 1. Resize to a 1024x1024 square. The source is 1024x902 where elements
    # were vertically compressed by ~1.13x. Resizing to 1:1 square restores
    # the circular lotus/head geometry to its intended 1:1 circular proportions.
    raw_img = Image.open(SOURCE_PATH).resize((1024, 1024), Image.Resampling.LANCZOS).convert('RGBA')
    w, h = raw_img.size
    pixels = raw_img.load()

    # 2. Identify outer white corner pixels using flood-fill from 4 corners
    visited = set()
    q = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    for pt in q:
        visited.add(pt)

    while q:
        x, y = q.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                r, g, b, a = pixels[nx, ny]
                if r > 230 and g > 230 and b > 230:
                    visited.add((nx, ny))
                    q.append((nx, ny))

    # 3. Create full-bleed master: corner pixels filled with background gradient
    c0 = (136, 98, 201)  # Bottom-left violet
    c1 = (173, 126, 228)  # Top-right violet
    fullbleed = raw_img.copy()
    fb_pix = fullbleed.load()
    for x, y in visited:
        t = (x + (1023 - y)) / 2046.0
        r = int(c0[0] + (c1[0] - c0[0]) * t)
        g = int(c0[1] + (c1[1] - c0[1]) * t)
        b = int(c0[2] + (c1[2] - c0[2]) * t)
        fb_pix[x, y] = (r, g, b, 255)

    # 4. Create antialiased squircle master (rounded rectangle with radius ~140px)
    scale = 2
    w_hi, h_hi = 1024 * scale, 1024 * scale
    mask_hi = Image.new('L', (w_hi, h_hi), 0)
    draw_sq = ImageDraw.Draw(mask_hi)
    draw_sq.rounded_rectangle([0, 0, w_hi - 1, h_hi - 1], radius=int(140 * scale), fill=255)
    squircle_mask = mask_hi.resize((1024, 1024), Image.Resampling.LANCZOS)
    squircle = fullbleed.copy()
    squircle.putalpha(squircle_mask)

    # 5. Create antialiased circle master for round launcher icon
    circle_hi = Image.new('L', (w_hi, h_hi), 0)
    draw_c = ImageDraw.Draw(circle_hi)
    draw_c.ellipse([0, 0, w_hi - 1, h_hi - 1], fill=255)
    circle_mask = circle_hi.resize((1024, 1024), Image.Resampling.LANCZOS)
    circle = fullbleed.copy()
    circle.putalpha(circle_mask)

    # 6. Create adaptive foreground master (108dp canvas, emblem scaled to fit 72dp safe zone)
    # Scale factor 0.66 ensures zero clipping on circle / squircle OEM launcher masks
    fg_canvas = Image.new('RGBA', (1024, 1024))
    fg_pix = fg_canvas.load()
    for y in range(1024):
        for x in range(1024):
            t = (x + (1023 - y)) / 2046.0
            r = int(c0[0] + (c1[0] - c0[0]) * t)
            g = int(c0[1] + (c1[1] - c0[1]) * t)
            b = int(c0[2] + (c1[2] - c0[2]) * t)
            fg_pix[x, y] = (r, g, b, 255)

    scaled_size = int(1024 * 0.66)
    scaled_content = fullbleed.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
    offset = (1024 - scaled_size) // 2
    fg_canvas.paste(scaled_content, (offset, offset))

    # 7. Create maskable icon master (scaled to 78% for PWA 80% safe zone circle)
    maskable_canvas = fg_canvas.copy()
    m_scaled_size = int(1024 * 0.78)
    m_scaled = fullbleed.resize((m_scaled_size, m_scaled_size), Image.Resampling.LANCZOS)
    m_offset = (1024 - m_scaled_size) // 2
    maskable_canvas.paste(m_scaled, (m_offset, m_offset))

    return squircle, circle, fg_canvas, fullbleed, maskable_canvas

def main():
    squircle, circle, fg_master, fullbleed, maskable = build_masters()

    written = []

    def save_png(img, size, rel_path):
        target = os.path.join(ROOT, rel_path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(target, format='PNG', optimize=True)
        written.append(f"{rel_path} ({size}x{size})")

    # Android Densities
    android_legacy = [
        ('mdpi', 48),
        ('hdpi', 72),
        ('xhdpi', 96),
        ('xxhdpi', 144),
        ('xxxhdpi', 192),
    ]

    android_foreground = [
        ('mdpi', 108),
        ('hdpi', 162),
        ('xhdpi', 216),
        ('xxhdpi', 324),
        ('xxxhdpi', 432),
    ]

    for density, edge in android_legacy:
        base = f"android/app/src/main/res/mipmap-{density}"
        save_png(squircle, edge, f"{base}/ic_launcher.png")
        save_png(circle, edge, f"{base}/ic_launcher_round.png")

    for density, edge in android_foreground:
        base = f"android/app/src/main/res/mipmap-{density}"
        save_png(fg_master, edge, f"{base}/ic_launcher_foreground.png")

    # Web & PWA
    save_png(squircle, 192, "public/icons/icon-192.png")
    save_png(squircle, 512, "public/icons/icon-512.png")
    save_png(maskable, 512, "public/icons/icon-maskable-512.png")
    save_png(fullbleed, 180, "public/icons/apple-touch-icon-180.png")
    save_png(squircle, 32, "public/favicon-32.png")

    # Multi-resolution favicon.ico
    ico_target = os.path.join(ROOT, "public", "favicon.ico")
    ico_img = squircle.resize((48, 48), Image.Resampling.LANCZOS)
    ico_img.save(ico_target, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    written.append("public/favicon.ico (16, 32, 48)")

    # Update ic_launcher_background.xml
    bg_xml_path = os.path.join(ROOT, "android/app/src/main/res/values/ic_launcher_background.xml")
    if os.path.exists(bg_xml_path):
        bg_content = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#8c64c7</color>
</resources>
"""
        with open(bg_xml_path, "w", encoding="utf-8") as f:
            f.write(bg_content)
        written.append("android/app/src/main/res/values/ic_launcher_background.xml")

    print("\nSuccessfully generated all app icons:")
    for w in written:
        print(f"  [OK] {w}")

if __name__ == '__main__':
    main()
