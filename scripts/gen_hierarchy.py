#!/usr/bin/env python3
"""Jerarquia liga > equipo en las paginas de /leagues, /clubs, /national y /teams.

Hace tres cosas, siempre entre marcadores propios para poder repetirlo sin
duplicar nada (lo llama refresh_seo_content.py despues de gen_category_content.py):

  1. Migas de pan visibles bajo el logo:
       liga:     Inicio > Leagues > La Liga
       equipo:   Inicio > La Liga > Real Madrid      (si su liga tiene pagina)
                 Inicio > Clubs | Teams > Ajax       (si no la tiene)
       seleccion Inicio > National teams > Brazil
     <!-- kf-crumbs:start --> ... <!-- kf-crumbs:end -->
  2. El BreadcrumbList del JSON-LD (dentro de "breadcrumb") con esa misma ruta.
  3. En cada pagina de liga, la lista completa de sus equipos con pagina propia,
     de mas a menos camisetas: <!-- kf-league-teams:start --> ... :end -->
  4. En el indice /teams, una fila "Browse by" con cada pagina de liga y las
     selecciones: <!-- kf-hub-leagues:start --> ... :end -->

No toca titulos ni meta descripciones. Todas las URLs son las canonicas (sin
barra final), que responden 200 sin redireccion. Las ligas sin pagina propia
(/league/... es una vista dinamica de la SPA, fuera del sitemap) no se enlazan.

Uso, desde la raiz del repo:  python scripts/gen_hierarchy.py
"""
import html
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_category_content as G  # noqa: E402

REPO = G.REPO
SITE = "https://wearekitfinder.com"
HOME = ("Home", "/", "crumb_home")
HUB = {"leagues": ("Leagues", "/leagues", "footer_leagues"),
       "clubs": ("Clubs", "/clubs", "footer_clubs"),
       "national": ("National teams", "/national", "footer_national"),
       "teams": ("Teams", "/teams", "footer_teams")}
LEAGUE_PAGE = {name: "/" + page for page, name in G.LEAGUES.items()}
# LEAGUE_TEAMS (app.js) usa nombres cortos para estos equipos ("tottenham",
# "west ham", "roma"...), que no coinciden con el nombre completo de D1. Misma
# liga que les da app.js; solo se usa aqui para las migas de pan.
LEAGUE_ALIAS = {"Tottenham Hotspur": "Premier League", "West Ham United": "Premier League",
                "Brighton and Hove Albion": "Premier League", "AS Roma": "Serie A",
                "Malaga CF": "La Liga", "Schalke 04": "Bundesliga", "Hannover 96": "Bundesliga",
                "St. Pauli": "Bundesliga"}

CSS = """<style id="kf-crumbs-css">
  .kf-crumbs{font-size:13px;color:#9aa3ad;margin:-1rem 0 1.4rem;line-height:1.6;}
  .kf-crumbs ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 0;}
  .kf-crumbs li{display:inline-flex;align-items:center;}
  .kf-crumbs li+li::before{content:"\\203A";margin:0 8px;color:#c4cad1;}
  .kf-crumbs a{color:#5a6472;text-decoration:none;border-bottom:1px solid #e2e6ea;}
  .kf-crumbs a:hover{color:#1FAF6D;border-color:#1FAF6D;}
  .kf-crumbs [aria-current]{color:#1e2530;font-weight:600;}
  .kf-league-teams{margin:2rem 0 0;}
  .kf-league-teams ul{list-style:none;margin:.6rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px;}
  .kf-league-teams a{display:inline-block;padding:6px 12px;border:1px solid #e2e6ea;border-radius:20px;font-size:14px;color:#1e2530;text-decoration:none;background:#fff;}
  .kf-league-teams a:hover{border-color:#1FAF6D;color:#1FAF6D;}
</style>"""
HUB_LEAGUES_CSS = """<style id="kf-hub-leagues-css">
  .kf-hub-leagues ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px;}
  .kf-hub-leagues a{display:inline-block;padding:6px 12px;border:1px solid #e2e6ea;border-radius:20px;font-size:14px;color:#1e2530;text-decoration:none;background:#fff;}
  .kf-hub-leagues a:hover{border-color:#1FAF6D;color:#1FAF6D;}
  .kf-hub-leagues{margin:1rem 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-size:13px;color:#5a6472;}
</style>"""


def esc(s):
    return html.escape(s, quote=True)


def crumbs_for(page, shown, d1s, kind, league_of, tipo_of):
    """Lista de (nombre, url, clave i18n o None); el ultimo es la pagina actual."""
    me = d1s[0] if d1s else None
    if kind == "league":
        parent = HUB["leagues"]
    elif kind == "national" or tipo_of.get(me) == "seleccion":
        parent = HUB["national"]
    elif league_of.get(me) in LEAGUE_PAGE:
        lg = league_of[me]
        parent = (lg, LEAGUE_PAGE[lg], None)
    elif page.startswith("clubs/"):
        parent = HUB["clubs"]
    else:
        parent = HUB["teams"]
    return [HOME, parent, (shown, "/" + page, None)]


def crumbs_html(crumbs):
    items = []
    for i, (name, url, key) in enumerate(crumbs):
        attr = f' data-i18n="{key}"' if key else ""
        if i == len(crumbs) - 1:
            items.append(f'<li><span aria-current="page">{esc(name)}</span></li>')
        else:
            items.append(f'<li><a href="{url}"{attr}>{esc(name)}</a></li>')
    return ('<!-- kf-crumbs:start -->\n  <nav class="kf-crumbs" aria-label="Breadcrumb"><ol>'
            + "".join(items) + "</ol></nav>\n  <!-- kf-crumbs:end -->")


def crumbs_jsonld(crumbs, indent):
    pad = " " * indent
    rows = []
    for i, (name, url, _) in enumerate(crumbs, 1):
        nm = "Kit Finder" if url == "/" else name
        item = SITE if url == "/" else SITE + url
        nm = nm.replace("\\", "\\\\").replace('"', '\\"')
        rows.append(f'{pad}    {{"@type":"ListItem","position":{i},"name":"{nm}","item":"{item}"}}')
    return ('"breadcrumb": {\n' + f'{pad}  "@type": "BreadcrumbList",\n{pad}  "itemListElement": [\n'
            + ",\n".join(rows) + f"\n{pad}  ]\n{pad}}}")


def replace_breadcrumb(t, crumbs):
    """Sustituye el objeto "breadcrumb": {...} del JSON-LD (contando llaves)."""
    i = t.find('"breadcrumb":')
    if i < 0:
        return t, False
    j = t.index("{", i)
    depth = 0
    for k in range(j, len(t)):
        depth += t[k] == "{"
        depth -= t[k] == "}"
        if depth == 0:
            break
    line_start = t.rfind("\n", 0, i) + 1
    indent = i - line_start
    return t[:i] + crumbs_jsonld(crumbs, indent) + t[k + 1:], True


def league_teams_html(league, teams):
    items = "".join(f'<li><a href="{u}">{esc(nm)}</a></li>' for nm, u in teams)
    return ('<!-- kf-league-teams:start -->\n  <section class="kf-league-teams">'
            f'<h2 data-i18n="kfh_league_teams" data-i18n-vars="league={G.quote(league, safe="")}">'
            f'{esc(league)} teams on Kit Finder</h2><ul>{items}</ul></section>\n  <!-- kf-league-teams:end -->')


def hub_leagues_html():
    """Indice /teams: enlaces directos a cada pagina de liga y a selecciones."""
    items = "".join(f'<li><a href="/{p}">{esc(nm)}</a></li>' for p, nm in G.LEAGUES.items())
    items += f'<li><a href="{HUB["national"][1]}" data-i18n="{HUB["national"][2]}">{HUB["national"][0]}</a></li>'
    return ('<!-- kf-hub-leagues:start -->\n  <nav class="kf-hub-leagues" aria-label="Leagues">'
            f'<span data-i18n="footer_browse_by">Browse by</span><ul>{items}</ul></nav>\n  <!-- kf-hub-leagues:end -->')


def put_block(t, start, end, block, anchor_re):
    """Reemplaza el bloque entre marcadores o lo inserta despues de anchor_re."""
    if start in t:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda m: block, t, count=1, flags=re.S)
    m = re.search(anchor_re, t, flags=re.S)
    if not m:
        return None
    return t[:m.end()] + "\n  " + block + t[m.end():]


def main():
    S, teams_tbl = G.load_stats()
    pages, url_of, league_of, country_of, tipo_of = G.build_registry(S, teams_tbl, G.load_league_teams())
    for name, lg in LEAGUE_ALIAS.items():
        if name in S:
            league_of.setdefault(name, lg)
            if f"leagues/{G.slugify(lg)}" in pages and name not in pages[f"leagues/{G.slugify(lg)}"][1]:
                pages[f"leagues/{G.slugify(lg)}"][1].append(name)
    changed = 0
    for page in sorted(pages):
        shown, d1s, kind = pages[page]
        path = os.path.join(REPO, page, "index.html")
        if not os.path.isfile(path):
            continue
        t = open(path, encoding="utf-8", newline="").read()
        nl = "\r\n" if "\r\n" in t else "\n"
        t = t.replace("\r\n", "\n")
        orig = t
        crumbs = crumbs_for(page, shown, d1s, kind, league_of, tipo_of)

        t2 = put_block(t, "<!-- kf-crumbs:start -->", "<!-- kf-crumbs:end -->", crumbs_html(crumbs),
                       r'<a class="kf-lp-logo"[^>]*>.*?</a>')
        if t2 is None:
            print(f"  SKIP {page}: sin logo donde poner las migas")
            continue
        t = t2
        t, ok = replace_breadcrumb(t, crumbs)
        if not ok:
            print(f"  AVISO {page}: sin BreadcrumbList en el JSON-LD")

        if kind == "league":
            teams = [url_of[x] for x in sorted(d1s, key=lambda x: (-G.count(S, x), x)) if x in url_of]
            teams = [(nm, u) for u, nm in teams if u != "/" + page]
            block = league_teams_html(shown, teams)
            t3 = put_block(t, "<!-- kf-league-teams:start -->", "<!-- kf-league-teams:end -->", block,
                           r"<!-- kf-data:end -->")
            if t3 is None:
                print(f"  AVISO {page}: sin bloque kf-data para colgar la lista de equipos")
            else:
                t = t3

        if 'id="kf-crumbs-css"' in t:
            t = re.sub(r'<style id="kf-crumbs-css">.*?</style>', lambda m: CSS, t, flags=re.S)
        else:
            t = t.replace("</head>", CSS + "\n</head>", 1)

        if t != orig:
            open(path, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))
            changed += 1
        parent = crumbs[1][0]
        extra = f", {len(teams)} equipos enlazados" if kind == "league" else ""
        print(f"  OK {page}: {parent} > {shown}{extra}")

    # Indice /teams: fila "Browse by" con las ligas, bajo la frase de totales
    path = os.path.join(REPO, "teams", "index.html")
    t = open(path, encoding="utf-8", newline="").read()
    nl = "\r\n" if "\r\n" in t else "\n"
    t = orig = t.replace("\r\n", "\n")
    t2 = put_block(t, "<!-- kf-hub-leagues:start -->", "<!-- kf-hub-leagues:end -->", hub_leagues_html(),
                   r'<p class="kf-hub-intro".*?</p>')
    if t2 is None:
        print("  AVISO teams (indice): sin frase kf-hub-intro donde poner las ligas")
    else:
        t = t2
        if 'id="kf-hub-leagues-css"' in t:
            t = re.sub(r'<style id="kf-hub-leagues-css">.*?</style>', lambda m: HUB_LEAGUES_CSS, t, flags=re.S)
        else:
            t = t.replace("</head>", HUB_LEAGUES_CSS + "\n</head>", 1)
        if t != orig:
            open(path, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))
            changed += 1
        print(f"  OK teams (indice): {len(G.LEAGUES)} ligas enlazadas")
    print(f"\n{changed} paginas actualizadas.")


if __name__ == "__main__":
    main()
