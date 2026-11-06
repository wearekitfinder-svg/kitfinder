#!/usr/bin/env python3
"""Bloque "More teams" en cada pagina de /clubs, /national y /teams.

Por que: el bloque "Related" (gen_category_content.py) elige los equipos con
mas camisetas, asi que casi todas las paginas enlazan a los mismos grandes
(Man United, Liverpool, Arsenal...) y los equipos pequenos solo reciben un
enlace: el del indice /teams. Google no llega a ellos (oct 2026: 104 de 159
paginas /teams sin indexar).

Que hace: agrupa las paginas (misma liga o pais de liga, selecciones juntas,
el resto en "otros"), las ordena A-Z dentro del grupo como un circulo y cada
pagina enlaza a sus 3 vecinas de delante y 3 de detras. Asi TODAS reciben al
menos 6 enlaces internos, sin depender del tamano del equipo.

No usa datos de D1 (no hace falta wrangler). Va entre marcadores propios
<!-- kf-more-teams:start --> ... :end -->, fuera del bloque "Related", asi que
gen_category_content.py no lo pisa y se puede repetir sin duplicar nada.

Uso, desde la raiz del repo:  python scripts/gen_more_teams.py
(refresh_seo_content.py lo llama despues de gen_hierarchy.py)
"""
import html
import os
import re
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_category_content as G  # noqa: E402

REPO = G.REPO
N_EACH_SIDE = 3
MIN_GROUP = 7     # grupos mas pequenos se juntan con "otros"

# Ligas del mismo pais en un solo grupo (mas vecinos y mas naturales)
FAMILY = {"La Liga": "Spain", "Segunda División": "Spain",
          "Premier League": "England", "Championship": "England",
          "League One": "England", "League Two": "England",
          "Serie A": "Italy", "Serie B": "Italy",
          "Bundesliga": "Germany", "Bundesliga 2": "Germany",
          "Ligue 1": "France", "Ligue 2": "France"}

START, END = "<!-- kf-more-teams:start -->", "<!-- kf-more-teams:end -->"


def page_name(page):
    if page in G.HAND_PAGES:
        d1 = G.HAND_PAGES[page]
        return G.DISPLAY.get(d1, d1)
    t = open(os.path.join(REPO, page, "index.html"), encoding="utf-8").read()
    m = re.search(r"<h1[^>]*>([^<]*)</h1>", t)
    name = html.unescape(m.group(1)) if m else page.split("/")[-1].replace("-", " ").title()
    return name.replace(" Vintage Shirts", "").strip()


def collect_pages():
    pages = []
    for hub in ("clubs", "national", "teams"):
        for slug in sorted(os.listdir(os.path.join(REPO, hub))):
            if os.path.isfile(os.path.join(REPO, hub, slug, "index.html")):
                pages.append(f"{hub}/{slug}")
    return pages


def group_of(page, name, slug_league):
    if page.startswith("national/"):
        return "national"
    slug = page.split("/")[-1]
    lg = slug_league.get(slug) or slug_league.get(G.slugify(name))
    if lg:
        return FAMILY.get(lg, lg)
    return "other"


def block_html(links):
    out = [START, '  <div class="kf-related kf-more-teams">',
           '    <h3 data-i18n="kfh_more_teams">More teams</h3>']
    for name, url in links:
        out.append(f'    <a href="{url}" class="kf-related-link" data-i18n="teams_link" '
                   f'data-i18n-vars="team={html.escape(quote(name, safe=""), quote=True)}">'
                   f'{html.escape(name)} shirts</a>')
    out += ["  </div>", END]
    return "\n".join(out)


def main():
    league_teams = G.load_league_teams()
    slug_league = {}
    for lg, names in league_teams.items():
        for nm in names:
            slug_league.setdefault(G.slugify(nm), lg)

    pages = collect_pages()
    names = {p: page_name(p) for p in pages}
    groups = {}
    for p in pages:
        groups.setdefault(group_of(p, names[p], slug_league), []).append(p)
    # grupos pequenos -> "other" (las selecciones se quedan juntas siempre)
    for g in [g for g, ps in groups.items() if len(ps) < MIN_GROUP and g not in ("other", "national")]:
        groups.setdefault("other", []).extend(groups.pop(g))

    inbound = {p: 0 for p in pages}
    changed = 0
    for g, ps in sorted(groups.items()):
        ps = sorted(ps, key=lambda p: names[p].lower())
        n = len(ps)
        for i, p in enumerate(ps):
            picks = []
            for d in list(range(1, N_EACH_SIDE + 1)) + list(range(-1, -N_EACH_SIDE - 1, -1)):
                q = ps[(i + d) % n]
                if q != p and q not in picks:
                    picks.append(q)
            for q in picks:
                inbound[q] += 1
            block = block_html([(names[q], "/" + q) for q in picks])

            path = os.path.join(REPO, p, "index.html")
            t = open(path, encoding="utf-8", newline="").read()
            nl = "\r\n" if "\r\n" in t else "\n"
            t = t.replace("\r\n", "\n")
            if START in t:
                new = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda m: block, t, flags=re.S)
            else:
                m = re.search(r'  <div class="kf-related">.*?\n  </div>\n', t, flags=re.S)
                if not m:
                    print(f"  AVISO {p}: sin bloque Related, no se toca")
                    continue
                new = t[:m.end()] + block + "\n" + t[m.end():]
            if new != t:
                changed += 1
                open(path, "w", encoding="utf-8", newline="").write(new.replace("\n", nl))
        print(f"  {g}: {n} paginas")

    low = sorted(inbound.items(), key=lambda kv: kv[1])[:3]
    print(f"OK: {changed} paginas actualizadas de {len(pages)}; "
          f"minimo de enlaces 'More teams' recibidos: {low[0][1]} ({low[0][0]})")


if __name__ == "__main__":
    main()
