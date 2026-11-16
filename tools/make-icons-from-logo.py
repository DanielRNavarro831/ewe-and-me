"""
Builds the home-screen app icons from the logo image.

    npm run icons            (uses art-source/app-logo.jpg)
    python tools/make-icons-from-logo.py path/to/logo.png

The logo should be a rounded square badge with a dark frame on a plain light
background (like art-source/app-logo.jpg). Writes:

  public/icons/icon-192.png, icon-512.png   the badge, with transparent corners
  public/icons/icon-maskable-512.png        the badge's inside on its own blue,
                                            shrunk into Android's safe zone so the
                                            circle/squircle mask never cuts the text

Needs Python with Pillow (pip install pillow).
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "art-source" / "app-logo.jpg"
OUT = ROOT / "public" / "icons"


def lum(p):
    return p[0] + p[1] + p[2]


def close(a, b, tol):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2]) <= tol


def flood(img, seeds, matches, paint):
    """Paints every pixel connected to the seeds that `matches`."""
    px = img.load()
    w, h = img.size
    seen = set()
    q = deque(s for s in seeds if matches(px[s]))
    while q:
        x, y = q.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        px[x, y] = paint
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and matches(px[nx, ny]):
                q.append((nx, ny))


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    px = im.load()

    # The badge is bounded by its dark frame.
    dark = [(x, y) for y in range(0, h, 2) for x in range(0, w, 2) if lum(px[x, y]) < 200]
    x0 = min(p[0] for p in dark); x1 = max(p[0] for p in dark) + 2
    y0 = min(p[1] for p in dark); y1 = max(p[1] for p in dark) + 2
    badge = im.crop((x0, y0, x1, y1))
    bw, bh = badge.size

    # Fill colour = the most common colour just inside the frame.
    sample = badge.crop((bw // 20, bh // 3, bw // 20 + 40, bh // 3 + 40)).getcolors(4096)
    fill = max(sample)[1]

    # --- "any" icons: badge on a transparent square, outer light corners removed.
    side = max(bw, bh)
    any_icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    rgba = badge.convert("RGBA")
    corners = [(0, 0), (bw - 1, 0), (0, bh - 1), (bw - 1, bh - 1)]
    flood(rgba, corners, lambda p: lum(p) > 600 and p[3] > 0, (0, 0, 0, 0))
    any_icon.paste(rgba, ((side - bw) // 2, (side - bh) // 2))
    for size in (192, 512):
        any_icon.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png")

    # --- maskable icon: the inside of the frame, on the badge's own fill colour.
    frame = 0
    while frame < bw // 4 and not close(badge.getpixel((frame, bh // 2)), fill, 60):
        frame += 1
    frame += 8  # skip the light bevel just inside the frame
    inner = badge.crop((frame, frame, bw - frame, bh - frame))
    iw, ih = inner.size
    # Paint over any frame left in the rounded inner corners.
    seeds = [(0, 0), (iw - 1, 0), (0, ih - 1), (iw - 1, ih - 1)]
    flood(inner, seeds, lambda p: not close(p, fill, 60) and p != fill, fill)
    # Even out JPEG noise in the background so no seam shows around the artwork.
    ip = inner.load()
    for y in range(ih):
        for x in range(iw):
            if close(ip[x, y], fill, 36):
                ip[x, y] = fill

    size = 512
    mask = Image.new("RGB", (size, size), fill)
    scale = 0.68 * size / max(iw, ih)
    content = inner.resize((round(iw * scale), round(ih * scale)), Image.LANCZOS)
    mask.paste(content, ((size - content.width) // 2, (size - content.height) // 2))
    mask.save(OUT / "icon-maskable-512.png")
    print(f"Icons written to {OUT} (fill colour #{fill[0]:02X}{fill[1]:02X}{fill[2]:02X})")


if __name__ == "__main__":
    main()
