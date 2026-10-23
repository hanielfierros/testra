"""Genera iconos de marcador de posicion para la PWA (testra).

Los iconos son simples marcadores (no diseno final). Se generan con Pillow
y se guardan en assets/icons/. Ejecutar: python tools/gen_icons.py
"""
from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "assets", "icons")

SIZES = {
    "icon-192.png": 192,
    "icon-512.png": 512,
    "icon-180.png": 180,      # apple-touch-icon
    "icon-maskable-512.png": 512,
}

BG = (18, 122, 227)   # azul
FG = (255, 255, 255)


def make_icon(path, size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size - 1, size - 1], fill=BG)
    else:
        r = size * 0.22
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(r), fill=BG)
    cx = size / 2
    cy = size * 0.42
    rad = size * 0.26
    d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], outline=FG, width=max(2, size // 40))
    d.ellipse([cx - rad * 0.45, cy - rad * 0.45, cx + rad * 0.45, cy + rad * 0.45], fill=FG)
    tri = [
        (cx - rad, cy + rad * 1.4),
        (cx + rad, cy + rad * 1.4),
        (cx, cy + rad * 2.6),
    ]
    d.polygon(tri, fill=FG)
    img.save(path, "PNG")


def main():
    os.makedirs(ICONS, exist_ok=True)
    for name, size in SIZES.items():
        make_icon(os.path.join(ICONS, name), size, maskable="maskable" in name)
        print("OK", name, size)


if __name__ == "__main__":
    main()
