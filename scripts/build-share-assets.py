#!/usr/bin/env python3
"""
Build the Open Graph card and the raster app icons from the one logo source.

Two problems this solves, both of them things a link-preview scraper or a
browser tab does on every share and every page load:

**There was no `og:image`.** A link to aurixasystems.com.au pasted into
LinkedIn, Slack, WhatsApp or iMessage rendered as a bare URL. None of the
existing brand assets works as one: the Stripe logo tile is 1600x604 (2.65:1,
so it letterboxes or centre-crops against Open Graph's 1.91:1), the Stripe icon
is square (which downgrades the card to a small thumbnail), and the old
`aurixa-symbol.svg` was an SVG — no unfurler accepts SVG for `og:image`.

**The favicon was 535 KB.** `aurixa-symbol.svg` was an SVG wrapper around a
base64-encoded JPEG, and it was the tab icon, so every page load paid for it.
A 32x32 PNG is about two kilobytes. It has since been deleted outright: it was
also being used to fill a 96px square on the home page, which a 19 KB WebP does
better.

Everything derives from `brand-source/aurixa-lockup-source.png` — a PNG with a real
alpha channel, kept OUT of `public/` so the 401 KB original is never served — and reuses the
ground, glow and placement helpers from `build-stripe-brand-assets.py` so the
two sets cannot drift apart. Same reasoning as that script for putting the mark
on an opaque dark ground rather than shipping transparency: we do not control
what an unfurler or an OS composites behind it, and gold on white is the weak
case.

**The tab icon may come from its own file.** `brand-source/aurixa-icon-source.png`
is optional; when it is present the favicon and the apple-touch icon are drawn
from it instead of from the left half of the lockup. That exists because the
platform mark is one artwork across three deployments — this site, Mission
Control and every clone whose brand settings are empty — and a tab icon
recovered by cropping a wordmark off a lockup is a fourth thing that only
resembles it. The OG card and the on-page marks keep coming from the lockup:
the card needs the WORDMARK (a symbol alone in a feed is not a brand card), and
the on-page symbol is painted onto the site's own dark ground, where an icon
carrying its own light ground would print as a pale square.

An icon source that is opaque is used as supplied — it already carries the
ground its designer chose, and re-compositing it onto the brand tile would
paint that ground as a square inside ours. One that carries alpha is composited
like the lockup, for the gold-on-white reason above. Which of the two it is, is
measured rather than declared.

    python3 scripts/build-share-assets.py
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# Reuse rather than re-derive. The module has a `__main__` guard, so importing
# it does not rebuild the Stripe assets.
_spec = importlib.util.spec_from_file_location(
    "aurixa_brand", ROOT / "scripts" / "build-stripe-brand-assets.py"
)
assert _spec and _spec.loader
brand = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(brand)

SOURCE = ROOT / "brand-source" / "aurixa-lockup-source.png"

# Optional. Absent, the icons are cropped out of the lockup exactly as before,
# so this file existing is the only thing that changes their appearance.
ICON_SOURCE = ROOT / "brand-source" / "aurixa-icon-source.png"

BRAND_DIR = ROOT / "public" / "brand"

# Open Graph's canonical size. 1.91:1 — the ratio Facebook, LinkedIn, Slack and
# X all target, so a card built at it is never cropped by any of them.
OG_SIZE = (1200, 630)

# LinkedIn and WhatsApp are the strict ones on file size.
OG_MAX_BYTES = 1024 * 1024

# iOS home-screen icon. 180x180 is the largest any current device asks for.
APPLE_TOUCH = 180
FAVICON = 32

# On-page display sizes, each 2x its largest CSS box and no larger.
#
# BrandLogo's widest box is 560x112 (`h-28 w-[560px]`), but the image is
# `object-contain` and the lockup is ~3.16:1, so height is the binding
# constraint: it actually paints at 354x112, not 560 wide. 2x of that is 708.
# Sizing to the declared 560 would have shipped 60% more pixels than any
# display can use. The Home symbol sits in a 96px square.
LOCKUP_WIDTH = 720
SYMBOL_PX = 192


def square(art: Image.Image, size: int) -> Image.Image:
    """Centre-crop to a square, then resize. A square input is just a resize."""
    w, h = art.size
    edge = min(w, h)
    box = ((w - edge) // 2, (h - edge) // 2)
    cropped = art.crop((box[0], box[1], box[0] + edge, box[1] + edge))
    return cropped.resize((size, size), Image.LANCZOS).convert("RGBA")


def resolve_icon_art(fallback: Image.Image) -> tuple[Image.Image, bool]:
    """The tab icon's artwork, and whether it carries its own ground.

    Returns the lockup-derived symbol unchanged when no dedicated icon source
    is on disk, so adding this parameter changed nothing about the output.

    Opacity is MEASURED, not declared, because getting it wrong is silent in
    both directions: composite an opaque icon onto the brand tile and its own
    ground prints as a square inside ours; put a transparent one on no ground
    at all and the PNG flattens gold onto black or white depending on what
    Pillow feels like. A stray anti-aliased pixel must not decide it either,
    so the test is the SHARE of the image that is meaningfully transparent
    rather than whether any pixel is.
    """
    if not ICON_SOURCE.exists():
        return fallback, False

    art = Image.open(ICON_SOURCE).convert("RGBA")
    alpha = art.getchannel("A")
    # Pixel count below full opacity, via the histogram — no per-pixel Python.
    soft = sum(alpha.histogram()[:250])
    transparent_share = soft / (art.width * art.height)

    if transparent_share < 0.01:
        # Opaque: the artwork is the tile. Nothing to crop to, because the
        # margin around the mark is part of what was supplied.
        return art, True

    # Transparent: trim to the artwork so `place` scales the mark and not its
    # padding, then let the caller composite it onto the brand ground.
    return art.crop(brand.bbox(art)), False


def main() -> int:
    if not SOURCE.exists():
        print(f"missing source: {SOURCE}", file=sys.stderr)
        return 1

    source = Image.open(SOURCE).convert("RGBA")
    lockup = source.crop(brand.bbox(source))
    symbol = source.crop(brand.bbox(source, (0, 0, brand.SPLIT_X, source.height)))

    icon_art, icon_has_own_ground = resolve_icon_art(symbol)

    written: list[Path] = []

    # --- The Open Graph card -------------------------------------------------
    # The full lockup, centred, at 62% of the canvas. Wide enough to read as a
    # brand card in a feed at thumbnail size; short of the edges so no platform
    # that applies its own rounded corners clips the wordmark.
    card = brand.ground(OG_SIZE, (OG_SIZE[0] / 2, OG_SIZE[1] / 2), OG_SIZE[1] * 1.05).convert("RGBA")
    art, at, _ = brand.place(lockup, OG_SIZE, 0.62)
    card.alpha_composite(art, at)
    path = BRAND_DIR / "og-default.png"
    # No alpha: some clients composite onto white, and gold-on-white is the
    # weak case this whole approach exists to avoid.
    card.convert("RGB").save(path, "PNG", optimize=True)
    written.append(path)

    # --- Raster app icons ----------------------------------------------------
    # A favicon is read at 16px in a strip of other tabs, so the mark is set
    # large in its square: 0.78 of the edge when we supply the ground, and full
    # bleed when the artwork brought its own (cropping in past the artwork's
    # own margin is the designer's call, not this script's).
    for size, name in ((APPLE_TOUCH, "apple-touch-icon.png"), (FAVICON, "favicon-32.png")):
        canvas = (size, size)
        if icon_has_own_ground:
            icon = square(icon_art, size)
        else:
            icon = brand.ground(canvas, (size / 2, size / 2), size * 0.9).convert("RGBA")
            art, at, _ = brand.place(icon_art, canvas, 0.78)
            icon.alpha_composite(art, at)
        path = BRAND_DIR / name
        icon.convert("RGB").save(path, "PNG", optimize=True)
        written.append(path)

    # --- On-page display assets ---------------------------------------------
    # These DO keep their alpha: unlike the share assets, we control the surface
    # they land on (the site's own #040B16 ground), so the mark composites
    # against it instead of carrying its own tile.
    #
    # Both replace assets that were absurdly oversized for their display box.
    # The lockup was a 401 KB source image rendered at most 560px wide, in the
    # header AND the footer, on every page. The symbol was a 535 KB "SVG" —
    # actually a base64 JPEG in an SVG wrapper — painted into a 96px square.
    transparent: list[Path] = []

    lockup_w = LOCKUP_WIDTH
    lockup_h = round(lockup.height * lockup_w / lockup.width)
    path = BRAND_DIR / "aurixa-lockup.webp"
    lockup.resize((lockup_w, lockup_h), Image.LANCZOS).save(
        path, "WEBP", quality=88, method=6
    )
    transparent.append(path)

    path = BRAND_DIR / "aurixa-symbol-192.webp"
    sym = Image.new("RGBA", (SYMBOL_PX, SYMBOL_PX), (0, 0, 0, 0))
    art, at, _ = brand.place(symbol, (SYMBOL_PX, SYMBOL_PX), 1.0)
    sym.alpha_composite(art, at)
    sym.save(path, "WEBP", quality=90, method=6)
    transparent.append(path)

    # --- Assert the constraints rather than trusting them --------------------
    failures = []
    for path in written + transparent:
        img = Image.open(path)
        size = path.stat().st_size
        print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {size / 1024:.1f} KB")
        if path.name == "og-default.png":
            if img.size != OG_SIZE:
                failures.append(f"{path.name}: {img.size} is not {OG_SIZE[0]}x{OG_SIZE[1]}")
            if size > OG_MAX_BYTES:
                failures.append(f"{path.name}: {size / 1024:.0f} KB is over the 1 MB share limit")
        if path in written and img.mode == "RGBA":
            failures.append(f"{path.name}: share asset still carries an alpha channel")
        if path in transparent and img.mode != "RGBA":
            failures.append(f"{path.name}: display asset lost its alpha channel")
        # Nothing built here has any business being large. The whole point is
        # that the originals were 401 KB and 535 KB for these two slots.
        if path in transparent and size > 80 * 1024:
            failures.append(f"{path.name}: {size / 1024:.0f} KB is too heavy for an on-page mark")

    if failures:
        for f in failures:
            print(f"FAIL {f}", file=sys.stderr)
        return 1
    # Say which source drew the icons. Dropping the artwork in under a
    # misspelt name is silent otherwise — the script succeeds, prints the same
    # five lines, and rebuilds the old icons from the lockup.
    if ICON_SOURCE.exists():
        ground = "its own ground" if icon_has_own_ground else "the brand ground"
        print(f"\nIcons drawn from {ICON_SOURCE.relative_to(ROOT)} on {ground}.")
    else:
        print(f"\nIcons cropped from the lockup ({ICON_SOURCE.relative_to(ROOT)} is absent).")
    print("Share assets: 1200x630 OG card, 180px apple-touch icon, 32px favicon.")
    print("Display assets: transparent lockup and symbol, sized for their boxes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
