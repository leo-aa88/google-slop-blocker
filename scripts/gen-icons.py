#!/usr/bin/env python3
"""Generate the extension's PNG icons from a single vector definition.

Run: python3 scripts/gen-icons.py
Requires: Pillow (pip install pillow)

The icon is a rounded blue square holding a white four-point "sparkle"
(the glyph Google uses for its AI features) struck through by a red
"no" slash -- i.e. "no AI slop".
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "src", "icons")

# Render large, then downsample for crisp anti-aliasing.
SUPERSAMPLE = 8
BASE = 128
SIZES = (16, 32, 48, 128)

BG = (26, 115, 232, 255)      # Google blue
SPARKLE = (255, 255, 255, 255)
SLASH = (234, 67, 53, 255)     # Google red


def sparkle_points(cx, cy, outer, inner):
    """Four-point star (concave diamond) centred at (cx, cy)."""
    return [
        (cx, cy - outer),
        (cx + inner, cy - inner),
        (cx + outer, cy),
        (cx + inner, cy + inner),
        (cx, cy + outer),
        (cx - inner, cy + inner),
        (cx - outer, cy),
        (cx - inner, cy - inner),
    ]


def render(size_px: int) -> Image.Image:
    s = size_px * SUPERSAMPLE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BG)

    cx = cy = s / 2
    d.polygon(sparkle_points(cx, cy, s * 0.34, s * 0.12), fill=SPARKLE)

    # Diagonal "no" slash.
    w = int(s * 0.09)
    pad = int(s * 0.16)
    d.line([(pad, s - pad), (s - pad, pad)], fill=SLASH, width=w)

    return img.resize((size_px, size_px), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        render(size).save(path)
        print(f"wrote {os.path.relpath(path)}")


if __name__ == "__main__":
    main()
