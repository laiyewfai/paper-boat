#!/usr/bin/env python3
"""Build the film: inline three.js and every src/*.js into one HTML file.

    python3 tools/build.py            # writes dist/paper-boat.html and index.html

The page must run from disk with no network, so the library is inlined as a
classic script that defines a global THREE, and the film sources are
concatenated in file-name order inside one IIFE.
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
VENDOR = ROOT / "vendor" / "three.iife.js"
TEMPLATE = ROOT / "tools" / "page.html"
OUT_DIR = ROOT / "dist"
OUT = OUT_DIR / "paper-boat.html"
COPY = ROOT / "index.html"


def die(msg: str) -> None:
    print(f"build: {msg}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    if not VENDOR.exists():
        die(f"missing {VENDOR.relative_to(ROOT)} (see README for the bundle step)")

    sources = sorted(SRC.glob("*.js"))
    if not sources:
        die("no source files in src/")

    lib = VENDOR.read_text()
    if "</script" in lib.lower():
        die("library contains a closing script tag; inline as a data URL instead")

    body = []
    for path in sources:
        text = path.read_text()
        body.append(f"/* ---- {path.name} ---- */\n{text}")
    film = "\n\n".join(body)

    page = TEMPLATE.read_text()
    if "/*__LIB__*/" not in page or "/*__FILM__*/" not in page:
        die("tools/page.html is missing its __LIB__ or __FILM__ marker")

    out = page.replace("/*__LIB__*/", lib).replace("/*__FILM__*/", film)
    OUT_DIR.mkdir(exist_ok=True)
    OUT.write_text(out)
    COPY.write_text(out)

    size = OUT.stat().st_size
    print(f"built {OUT.relative_to(ROOT)} ({size / 1024:.0f} KB) from {len(sources)} sources")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
