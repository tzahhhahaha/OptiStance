#!/usr/bin/env python3
"""
Generate the OptiStance app icon set matching the gradient "O" brand mark.

Design: diagonal indigo -> purple -> rose gradient (`from-indigo-500 via-purple-500
to-rose-500`) with a centered white circular core, matching Header.tsx,
NavigationDrawer.tsx, and AuthScreen.tsx.

Outputs:
  - Master assets:               resources/{fullbleed,squircle,circle,adaptive_foreground}_master.png
  - Android legacy icons:        mipmap-<density>/ic_launcher.png (+ _round)
  - Android adaptive foreground: mipmap-<density>/ic_launcher_foreground.png
  - Android background color:    android/app/src/main/res/values/ic_launcher_background.xml
  - iOS app icon:                ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
  - Web & PWA icons:             public/icons/... & public/favicon-32.png (+ favicon.ico)
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Tailwind palette stops matching `bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500`
INDIGO_500 = (99, 102, 241)
PURPLE_500 = (168, 85, 247)
ROSE_500 = (244, 63, 94)

# Header.tsx uses w-9 h-9 (36px) with a w-3.5 h-3.5 (14px) core => 14/36 ≈ 0.39
CORE_DOT_RATIO = 14.0 / 36.0
MASTER_SIZE = 1024


def _lerp(a: int, b: int, t: float) -> int:
    return int(round(a + (b - a) * t))


def _gradient_rgba(t: float) -> tuple[int, int, int, int]:
    if t <= 0.5:
        u = t * 2.0
        return (
            _lerp(INDIGO_500[0], PURPLE_500[0], u),
            _lerp(INDIGO_500[1], PURPLE_500[1], u),
            _lerp(INDIGO_500[2], PURPLE_500[2], u),
            255,
        )
    u = (t - 0.5) * 2.0
    return (
        _lerp(PURPLE_500[0], ROSE_500[0], u),
        _lerp(PURPLE_500[1], ROSE_500[1], u),
        _lerp(PURPLE_500[2], ROSE_500[2], u),
        255,
    )


def render_o_icon(
    size: int = MASTER_SIZE,
    shape: str = 'squircle',
    dot_ratio: float = CORE_DOT_RATIO,
) -> Image.Image:
    """Render an antialiased gradient 'O' icon at `size`x`size`."""
    scale = 2
    hi = size * scale

    grad = Image.new('RGBA', (hi, hi))
    px = grad.load()
    denom = float(2 * (hi - 1))
    for y in range(hi):
        inv_y = hi - 1 - y
        for x in range(hi):
            # `to-tr`: bottom-left (0, hi-1) -> 0.0, top-right (hi-1, 0) -> 1.0
            px[x, y] = _gradient_rgba((x + inv_y) / denom)

    if shape == 'fullbleed':
        plate = grad
    else:
        mask = Image.new('L', (hi, hi), 0)
        mdraw = ImageDraw.Draw(mask)
        if shape == 'circle':
            mdraw.ellipse([0, 0, hi - 1, hi - 1], fill=255)
        elif shape == 'squircle':
            mdraw.rounded_rectangle([0, 0, hi - 1, hi - 1], radius=hi // 3, fill=255)
        else:
            raise ValueError(f"Unsupported icon shape: {shape}")

        plate = Image.new('RGBA', (hi, hi), (0, 0, 0, 0))
        plate.paste(grad, (0, 0), mask)

    dot_d = int(round(hi * dot_ratio))
    offset = (hi - dot_d) // 2
    draw = ImageDraw.Draw(plate)
    draw.ellipse([offset, offset, offset + dot_d, offset + dot_d], fill=(255, 255, 255, 255))

    return plate.resize((size, size), Image.Resampling.LANCZOS)


def build_masters():
    fullbleed = render_o_icon(MASTER_SIZE, shape='fullbleed', dot_ratio=CORE_DOT_RATIO)
    squircle = render_o_icon(MASTER_SIZE, shape='squircle', dot_ratio=CORE_DOT_RATIO)
    circle = render_o_icon(MASTER_SIZE, shape='circle', dot_ratio=CORE_DOT_RATIO)
    # Adaptive icon foreground (108dp canvas, safe zone ~66% center)
    adaptive_fg = render_o_icon(MASTER_SIZE, shape='fullbleed', dot_ratio=CORE_DOT_RATIO * 0.66)
    # PWA maskable icon (80% safe zone circle)
    maskable = render_o_icon(MASTER_SIZE, shape='fullbleed', dot_ratio=CORE_DOT_RATIO * 0.80)
    return squircle, circle, adaptive_fg, fullbleed, maskable


def main():
    squircle, circle, fg_master, fullbleed, maskable = build_masters()
    written = []

    def save_png(img: Image.Image, size: int, rel_path: str, opaque: bool = False):
        target = os.path.join(ROOT, rel_path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        out = img if img.size == (size, size) else img.resize((size, size), Image.Resampling.LANCZOS)
        if opaque:
            out = out.convert('RGB')
        out.save(target, format='PNG', optimize=True)
        written.append(f"{rel_path} ({size}x{size})")

    # Master assets in resources/
    save_png(fullbleed, MASTER_SIZE, "resources/fullbleed_master.png")
    save_png(squircle, MASTER_SIZE, "resources/squircle_master.png")
    save_png(circle, MASTER_SIZE, "resources/circle_master.png")
    save_png(fg_master, MASTER_SIZE, "resources/adaptive_foreground_master.png")
    source_jpg = os.path.join(ROOT, "resources", "app-icon-source.jpg")
    fullbleed.convert('RGB').save(source_jpg, format='JPEG', quality=95)
    written.append("resources/app-icon-source.jpg (1024x1024)")

    # Android densities
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

    # iOS AppIcon (must be 1024x1024 opaque RGB)
    save_png(
        fullbleed,
        1024,
        "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
        opaque=True,
    )

    # Web & PWA
    save_png(squircle, 192, "public/icons/icon-192.png")
    save_png(squircle, 512, "public/icons/icon-512.png")
    save_png(maskable, 512, "public/icons/icon-maskable-512.png")
    save_png(fullbleed, 180, "public/icons/apple-touch-icon-180.png", opaque=True)
    save_png(squircle, 32, "public/favicon-32.png")

    # Multi-resolution favicon.ico
    ico_target = os.path.join(ROOT, "public", "favicon.ico")
    ico_img = squircle.resize((48, 48), Image.Resampling.LANCZOS)
    ico_img.save(ico_target, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    written.append("public/favicon.ico (16, 32, 48)")

    # Update ic_launcher_background.xml to center purple stop
    bg_xml_path = os.path.join(ROOT, "android/app/src/main/res/values/ic_launcher_background.xml")
    if os.path.exists(bg_xml_path):
        bg_content = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#a855f7</color>
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
