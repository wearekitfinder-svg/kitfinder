#!/usr/bin/env python3
"""Ordena las camisetas de ejemplo de cada pagina /teams/<slug>.

Por que: las tarjetas de ejemplo (bloque <div class="kf-team-grid">) se
escribieron una vez dentro del HTML. Algunas no son camisetas (tazas, gorras)
y otras tienen la foto rota: VintageSportsFashion bloquea sus fotos cuando se
ven desde otra web (403), asi que salia la lupa negra de "sin foto" y la
pagina quedaba fea (nov 2026).

Que hace, en cada pagina:
  1. Quita las tarjetas que no son camisetas (taza, gorra, programa, mochila...).
  2. Comprueba cada foto como lo haria un navegador desde wearekitfinder.com
     (con Referer). Orden: primero las que cargan, luego las dudosas (no se
     pudo comprobar) y al final las rotas.
  3. Si quedan al menos MIN_GOOD tarjetas con foto, las de foto rota se quitan.
  4. Red de seguridad en el navegador: si una foto falla mas adelante, su
     tarjeta pasa al final (clase kf-noimg + CSS order) en vez de quedarse
     arriba con la lupa.

Repetible: volver a ejecutarlo no duplica nada.

Uso, desde la raiz del repo:  python scripts/order_team_cards.py
"""
import glob
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_GOOD = 8

NOT_SHIRT = re.compile(
    r"\b(mugs?|scarf|scarves|posters?|key ?rings?|stickers?|coasters?|magnets?|beanies?|"
    r"bucket hat|caps?|hats?|socks|towels?|programmes?|pennants?|mystery|cushions?|"
    r"canvas|blankets?|bags?|backpacks?|figurines?|lanyards?|wallets?|pin badges?)\b", re.I)

CARD = re.compile(r" {8}<div class=\"card(?: kf-noimg)?\">\n.*?\n {8}</div>\n\n?", re.S)
IMG = re.compile(r'<div class="card-img-wrap"[^>]*>\s*<img src="([^"]+)" alt="([^"]*)"')
ONERR_OLD = "onerror=\"this.onerror=null;this.src='/images/placeholder.png';"
ONERR_NEW = ("onerror=\"this.onerror=null;var c=this.closest('.card');if(c)c.classList.add('kf-noimg');"
             "this.src='/images/placeholder.png';")
CSS = '<style id="kf-cards-css">.kf-team-grid .card.kf-noimg{order:1;}</style>'

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def check(url):
    """True = carga, False = rota, None = no se pudo comprobar."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Referer": "https://wearekitfinder.com/",
        "Accept": "image/avif,image/webp,image/*,*/*", "Range": "bytes=0-8191"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status in (200, 206) and r.headers.get("Content-Type", "").startswith("image/")
    except urllib.error.HTTPError as e:
        return False if e.code in (401, 403, 404, 410) else None
    except Exception:
        return None


def main():
    pages = sorted(glob.glob(os.path.join(REPO, "teams", "*", "index.html")))
    blocks = {}
    urls = set()
    for f in pages:
        t = open(f, encoding="utf-8", newline="").read()
        i = t.find('<div class="kf-team-grid">')
        if i < 0:
            continue
        cards = CARD.findall(t, i)
        blocks[f] = cards
        for c in cards:
            m = IMG.search(c)
            if m:
                urls.add(m.group(1))
    print(f"Comprobando {len(urls)} fotos...")
    with ThreadPoolExecutor(32) as ex:
        status = dict(zip(sorted(urls), ex.map(check, sorted(urls))))

    tot = {"pages": 0, "removed_not_shirt": 0, "removed_broken": 0, "kept": 0}
    for f, cards in blocks.items():
        t = open(f, encoding="utf-8", newline="").read()
        nl = "\r\n" if "\r\n" in t else "\n"
        t = t.replace("\r\n", "\n")
        cards = CARD.findall(t, t.find('<div class="kf-team-grid">'))
        good, unknown, broken = [], [], []
        for c in cards:
            m = IMG.search(c)
            alt = m.group(2) if m else ""
            if NOT_SHIRT.search(alt):
                tot["removed_not_shirt"] += 1
                continue
            c = c.replace('<div class="card kf-noimg">', '<div class="card">', 1)
            c = c.replace(ONERR_OLD, ONERR_NEW) if ONERR_NEW not in c else c
            st = status.get(m.group(1)) if m else None
            (good if st else broken if st is False else unknown).append(c.rstrip("\n") + "\n\n")
        if len(good) >= MIN_GOOD:
            tot["removed_broken"] += len(broken)
            broken = []
        new_cards = good + unknown + broken
        tot["kept"] += len(new_cards)
        # sustituir el tramo de tarjetas original por el nuevo orden
        first, last = CARD.search(t, t.find('<div class="kf-team-grid">')), None
        for last in CARD.finditer(t, first.start()):
            pass
        span = t[first.start():last.end()]
        assert CARD.sub("", span).strip() == "", f"{f}: hay algo entre las tarjetas, no se toca"
        assert last.end() < t.find("<!-- kf-data:start -->"), f"{f}: tarjetas fuera del bloque"
        t = t[:first.start()] + "".join(new_cards) + t[last.end():]
        if 'id="kf-cards-css"' not in t:
            t = t.replace("</head>", CSS + "\n</head>", 1)
        open(f, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))
        tot["pages"] += 1
    print(f"OK: {tot['pages']} paginas; tarjetas que quedan {tot['kept']}; quitadas: "
          f"{tot['removed_not_shirt']} que no son camisetas, {tot['removed_broken']} con foto rota")


if __name__ == "__main__":
    sys.exit(main())
