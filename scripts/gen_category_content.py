#!/usr/bin/env python3
"""Contenido unico basado en datos para /clubs/*, /national/*, /leagues/* y
/teams/* (SEO fase 2).

Lee el export de D1 que genera scripts/page_stats.py y, en cada pagina:
  - inserta/reemplaza un bloque <!-- kf-data:start --> ... <!-- kf-data:end -->
    con 2-3 parrafos cortos + tabla de datos + listas + FAQ;
  - pone la cifra de camisetas en <title> (y og/twitter) y reescribe la
    meta description (y og/twitter) con datos de esa pagina;
  - inserta/reemplaza el JSON-LD FAQPage (id="kf-faq");
  - reemplaza el bloque .kf-related por 6-8 enlaces relacionados
    (misma liga / mismo pais / selecciones) + enlace al hub.
Ademas copia las frases (claves "kfd_", ver category_content_text.py) a
i18n.js y lang/*.js: las paginas /teams cargan i18n.js y se traducen solas.

REGLA: solo hechos calculados de nuestros datos (products en D1). Nada de
historia, jugadores ni adjetivos tipo "iconic". Si un dato no existe para
un equipo, la frase correspondiente no se escribe.

Cada frase tiene varias redacciones; cada pagina elige las suyas (y el
orden de los parrafos) con una semilla fija derivada de su URL, asi que
regenerar con los mismos datos da exactamente el mismo HTML.

EJECUTAR (desde la raiz del repo):
    python scripts/page_stats.py                    # refresca datos de D1
    python scripts/gen_category_content.py          # todas las paginas
    python scripts/gen_category_content.py clubs/chelsea teams/celtic   # solo esas
gen_teams.py (kitfinder-automation) lo llama al final para /teams.
"""
import datetime, hashlib, html, json, os, random, re, sys
from collections import Counter, defaultdict
from urllib.parse import quote

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from page_stats import STATS_PATH  # noqa: E402
from category_content_text import T, LANGS  # noqa: E402

TODAY = datetime.date.today()
DATE_EN = f"{TODAY.day} {TODAY:%B %Y}"
DATE_NUM = f"{TODAY:%d/%m/%Y}"
WJ = "⁠"  # word joiner: evita que i18n.js formatee anios como numeros (1962 -> 1.962)

# Paginas hechas a mano en /clubs y /national -> nombre exacto en products.team
HAND_PAGES = {
    "clubs/ac-milan": "AC Milan", "clubs/ajax": "Ajax", "clubs/arsenal": "Arsenal",
    "clubs/atletico-madrid": "Atletico Madrid", "clubs/barcelona": "Barcelona",
    "clubs/bayern-munich": "Bayern Munich", "clubs/boca-juniors": "Boca Juniors",
    "clubs/borussia-dortmund": "Borussia Dortmund", "clubs/chelsea": "Chelsea",
    "clubs/corinthians": "Corinthians", "clubs/flamengo": "Flamengo",
    "clubs/inter-milan": "Inter Milan", "clubs/juventus": "Juventus",
    "clubs/liverpool": "Liverpool", "clubs/manchester-city": "Manchester City",
    "clubs/manchester-united": "Manchester United",
    "clubs/nacional-uruguay": "Club Nacional de Football", "clubs/napoli": "Napoli",
    "clubs/penarol": "Penarol", "clubs/psg": "Paris Saint-Germain",
    "clubs/real-madrid": "Real Madrid", "clubs/river-plate": "River Plate",
    "clubs/santos": "Santos", "clubs/sevilla": "Sevilla", "clubs/tottenham": "Tottenham Hotspur",
    "national/argentina": "Argentina", "national/brazil": "Brazil", "national/colombia": "Colombia",
    "national/england": "England", "national/ghana": "Ghana", "national/morocco": "Morocco",
    "national/nigeria": "Nigeria", "national/senegal": "Senegal",
}
# Nombre a mostrar cuando difiere del de products.team
DISPLAY = {"Atletico Madrid": "Atlético Madrid", "Club Nacional de Football": "Nacional",
           "Penarol": "Peñarol", "Tottenham Hotspur": "Tottenham"}
LEAGUES = {"leagues/premier-league": "Premier League", "leagues/la-liga": "La Liga",
           "leagues/serie-a": "Serie A", "leagues/bundesliga": "Bundesliga"}
HUBS = {"clubs": ("/clubs", "All clubs", None), "national": ("/national", "All national teams", None),
        "leagues": ("/leagues", "All leagues", None), "teams": ("/teams", "All teams A-Z", "teams_all_az")}

VERSION_EN = {"Local": "home", "Visitante": "away", "Tercera": "third",
              "Cuarta": "fourth", "Portero": "goalkeeper"}
BRAND_JUNK = {"", "-", "sin marca", "- sin marca/genérico -", "genérico", "generico", "unknown",
              "n/a", "na", "none", "other", "otro", "generic", "no brand", "unbranded", "brand"}
BRAND_FIX = {"adidas": "Adidas", "nike": "Nike", "puma": "Puma", "umbro": "Umbro", "kappa": "Kappa",
             "le coq sportif": "Le Coq Sportif", "lotto": "Lotto", "diadora": "Diadora",
             "hummel": "Hummel", "new balance": "New Balance", "reebok": "Reebok", "macron": "Macron",
             "joma": "Joma", "errea": "Erreà", "erreà": "Erreà", "uhlsport": "Uhlsport",
             "asics": "Asics", "mizuno": "Mizuno", "castore": "Castore", "admiral": "Admiral",
             "pony": "Pony", "patrick": "Patrick", "kelme": "Kelme", "fila": "Fila",
             "under armour": "Under Armour", "le coq": "Le Coq Sportif", "topper": "Topper",
             "penalty": "Penalty", "olympikus": "Olympikus", "bukta": "Bukta", "ennerre": "Ennerre"}


def esc(s):
    return html.escape(str(s), quote=False)


def attr(s):
    return html.escape(str(s), quote=True)


def slugify(name):
    s = name.lower().strip().replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def eur(v):
    return f"€{v:,.0f}"


def num(n):
    return f"{n:,}"


def pct(part, whole):
    return f"{round(100 * part / whole)}%" if whole else "0%"


# ── Datos ─────────────────────────────────────────────────────────────────────

def load_league_teams():
    src = open(os.path.join(REPO, "app.js"), encoding="utf-8").read()
    m = re.search(r"\bLEAGUE_TEAMS\s*=\s*\{", src)
    i = m.end() - 1
    depth = 0
    for j in range(i, len(src)):
        depth += src[j] == "{"
        depth -= src[j] == "}"
        if depth == 0:
            break
    body = re.sub(r'([{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:', r'\1"\2":', src[i:j + 1])
    return json.loads(body)


def parse_season(s):
    """-> (primer anio, etiqueta normalizada) o None. Acepta 1994-95, 1994/1995, 1994."""
    s = (s or "").strip()
    m = re.search(r"\b(19[5-9]\d|20[0-2]\d)\s*[-/]\s*(\d{4}|\d{2})\b", s)
    if m:
        y = int(m.group(1))
        y2 = int(m.group(2)[-2:])
        if y2 == (y + 1) % 100:
            return y, f"{y}-{y2:02d}"
    m = re.search(r"\b(19[5-9]\d|20[0-2]\d)\b", s)
    if m and int(m.group(1)) <= TODAY.year:
        return int(m.group(1)), m.group(1)
    return None


def clean_brand(b):
    b = (b or "").strip()
    k = b.lower()
    if k in BRAND_JUNK or len(k) < 2:
        return None
    return BRAND_FIX.get(k, b if not b.islower() else b.title())


def empty():
    return {"prices": Counter(), "stores": Counter(), "brands": Counter(), "versions": Counter(),
            "sleeves": Counter(), "seasons": Counter(), "decades": Counter(), "lo": None, "hi": None}


def load_stats():
    raw = json.load(open(STATS_PATH, encoding="utf-8"))
    S = defaultdict(empty)
    for r in raw["prices"]:
        S[r["team"]]["prices"][r["eur"]] += r["n"]
    for r in raw["stores"]:
        S[r["team"]]["stores"][r["store"] or "?"] += r["n"]
    for r in raw["brands"]:
        b = clean_brand(r["brand"])
        if b:
            S[r["team"]]["brands"][b] += r["n"]
    for r in raw["versions"]:
        S[r["team"]]["versions"][VERSION_EN.get(r["version"], "other")] += r["n"]
    for r in raw["sleeves"]:
        S[r["team"]]["sleeves"][r["sleeve"]] += r["n"]
    for r in raw["seasons"]:
        p = parse_season(r["season"])
        if p:
            S[r["team"]]["seasons"][p[1]] += r["n"]
            S[r["team"]]["decades"][p[0] // 10 * 10] += r["n"]
    for r in raw["extremes"]:
        if r["lo"] == 1:
            S[r["team"]]["lo"] = r
        if r["hi"] == 1:
            S[r["team"]]["hi"] = r
    return S, raw["teams"]


def merge(stats_list):
    out = empty()
    for s in stats_list:
        for k in ("prices", "stores", "brands", "versions", "sleeves", "seasons", "decades"):
            out[k].update(s[k])
        if s["lo"] and (not out["lo"] or s["lo"]["eur"] < out["lo"]["eur"]):
            out["lo"] = s["lo"]
        if s["hi"] and (not out["hi"] or s["hi"]["eur"] > out["hi"]["eur"]):
            out["hi"] = s["hi"]
    return out


def summary(s):
    """Cifras derivadas de un bloque de stats."""
    n = sum(s["prices"].values())
    d = {"n": n}
    if not n:
        return d
    vals = sorted(s["prices"].items())
    d["min"], d["max"] = vals[0][0], vals[-1][0]
    d["avg"] = sum(v * c for v, c in vals) / n
    acc = 0
    for v, c in vals:
        acc += c
        if acc >= n / 2:
            d["median"] = v
            break
    d["under50"] = sum(c for v, c in vals if v < 50)
    d["over200"] = sum(c for v, c in vals if v > 200)
    d["n_stores"] = len(s["stores"])
    d["stores"] = s["stores"].most_common()
    d["brands"] = s["brands"].most_common()
    d["versions"] = s["versions"]
    d["typed"] = sum(c for k, c in s["versions"].items() if k != "other")
    d["long"] = s["sleeves"].get("long", 0)
    d["seasons"] = s["seasons"].most_common()
    d["decades"] = sorted(s["decades"].items())
    d["oldest"] = min(s["seasons"], key=lambda k: (int(k[:4]), k)) if s["seasons"] else None
    d["newest"] = max(s["seasons"], key=lambda k: (int(k[:4]), k)) if s["seasons"] else None
    d["dated"] = sum(s["seasons"].values())
    d["lo"], d["hi"] = s["lo"], s["hi"]
    return d


# ── Frases ────────────────────────────────────────────────────────────────────
# Una frase = (clave, vars). El texto ingles se obtiene de T[clave]["en"].

def year_safe(v):
    v = str(v)
    return WJ + v if re.fullmatch(r"\d+", v) else v


SAFE_VARS = {"oldest", "newest", "season", "dec", "dec2"}


def render_en(key, vars):
    out = T[key]["en"]
    for k, v in vars.items():
        out = out.replace("{" + k + "}", str(v))
    return out


def span(key, vars, tag="span", cls=""):
    """Elemento con data-i18n: el texto visible es el ingles; i18n.js lo traduce."""
    full = dict(vars, date=DATE_EN, dnum=DATE_NUM)
    enc = ";".join(f"{k}={quote(year_safe(v) if k in SAFE_VARS else str(v), safe='')}"
                   for k, v in full.items())
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-i18n="{key}" data-i18n-vars="{attr(enc)}">{esc(render_en(key, full))}</{tag}>'


def listing(r):
    """Anuncio concreto: “nombre” — precio original, tienda."""
    name = re.sub(r"\s+", " ", html.unescape(r["name"])).strip()
    if len(name) > 80:
        name = name[:77].rsplit(" ", 1)[0] + "…"
    price = f"{r['price']:,.2f}".rstrip("0").rstrip(".")
    return f"“{name}” — {price} {r['currency']}, {r['store']}"


def s_overview(rng, team, d):
    v = {"team": team, "n": num(d["n"]), "s": num(d["n_stores"]), "min": eur(d["min"]),
         "max": eur(d["max"]), "avg": eur(d["avg"]), "median": eur(d["median"])}
    if d["n"] == 1:
        return [("kfd_ov_one", v)]
    if d["n_stores"] == 1:
        out = [("kfd_ov_1s", dict(v, store=d["stores"][0][0]))]
    else:
        out = [(rng.choice(["kfd_ov_a", "kfd_ov_b", "kfd_ov_c", "kfd_ov_d"]), v)]
    if d["n"] >= 10:
        # con 0 por encima de 200 € solo vale la frase que no lo menciona
        out.append((rng.choice(["kfd_px_a", "kfd_px_b", "kfd_px_c"] if d["over200"] else ["kfd_px_c"]),
                    {"p50": pct(d["under50"], d["n"]), "p200": pct(d["over200"], d["n"]),
                     "c50": num(d["under50"]), "c200": num(d["over200"])}))
    return out


def s_eras(rng, team, d):
    if not d["dated"]:
        return []
    out = []
    if d["oldest"] != d["newest"]:
        out.append((rng.choice(["kfd_era_a", "kfd_era_b", "kfd_era_c"]),
                    {"team": team, "oldest": d["oldest"], "newest": d["newest"], "k": num(len(d["seasons"]))}))
    dec = sorted(d["decades"], key=lambda x: -x[1])
    if len(dec) > 1:
        out.append((rng.choice(["kfd_dec_a", "kfd_dec_b", "kfd_dec_c"]),
                    {"dec": dec[0][0], "c": num(dec[0][1]), "p": pct(dec[0][1], d["dated"]),
                     "dec2": dec[1][0], "c2": num(dec[1][1])}))
    season, c = d["seasons"][0]
    if c > 1:
        out.append((rng.choice(["kfd_top_a", "kfd_top_b"]), {"season": season, "c": num(c)}))
    if d["dated"] < d["n"]:
        out.append((rng.choice(["kfd_nod_a", "kfd_nod_b"]),
                    {"p": pct(d["n"] - d["dated"], d["n"]), "c": num(d["n"] - d["dated"])}))
    return out


def s_kits(rng, team, d):
    out = []
    v, typed = d["versions"], d["typed"]
    if typed >= 3:
        out.append((rng.choice(["kfd_kit_a", "kfd_kit_b", "kfd_kit_c"]),
                    {"c": num(typed), "home": pct(v.get("home", 0), typed),
                     "away": pct(v.get("away", 0), typed), "third": pct(v.get("third", 0), typed)}))
        if v.get("goalkeeper"):
            out.append(("kfd_gk", {"gk": pct(v["goalkeeper"], typed)}))
    if d["long"]:
        out.append((rng.choice(["kfd_ls_a", "kfd_ls_b", "kfd_ls_c"]), {"c": num(d["long"])}))
    return out


def s_brands_stores(rng, team, d):
    out = []
    br = [(b, c) for b, c in d["brands"] if c >= 2][:3]
    branded = sum(c for _, c in d["brands"])
    if br:
        out.append((rng.choice(["kfd_br_a", "kfd_br_b", "kfd_br_c"]),
                    {"list": ", ".join(f"{b} ({pct(c, branded)})" for b, c in br),
                     "brand": br[0][0], "p": pct(br[0][1], branded)}))
    if d["n_stores"] > 1:
        st = d["stores"][:3]
        out.append((rng.choice(["kfd_st_a", "kfd_st_b", "kfd_st_c"]),
                    {"list": ", ".join(f"{s} ({num(c)})" for s, c in st),
                     "store": st[0][0], "c": num(st[0][1])}))
    return out


def s_extremes(rng, team, d):
    if d["n"] < 2 or not d["lo"] or not d["hi"]:
        return []
    return [(rng.choice(["kfd_ex_a", "kfd_ex_b", "kfd_ex_c"]), {"lo": listing(d["lo"]), "hi": listing(d["hi"])})]


def s_league(rng, team, members):
    if not members:
        return []
    return [(rng.choice(["kfd_lg_a", "kfd_lg_b", "kfd_lg_c"]),
             {"team": team, "k": num(len(members)),
              "list": ", ".join(f"{nm} ({num(c)})" for nm, c, _ in members[:3])})]


def faq(rng, team, d):
    """[(clave pregunta, vars), (clave respuesta, vars)] solo con datos."""
    qa = []
    if d["n"] >= 2:
        if d["n_stores"] > 1:
            a = ("kfd_a_n", {"team": team, "n": num(d["n"]), "s": num(d["n_stores"])})
        else:
            a = ("kfd_a_n1", {"team": team, "n": num(d["n"]), "store": d["stores"][0][0]})
        qa.append(((rng.choice(["kfd_q_n_a", "kfd_q_n_b"]), {"team": team}), a))
        qa.append(((rng.choice(["kfd_q_p_a", "kfd_q_p_b"]), {"team": team}),
                   ("kfd_a_p", {"min": eur(d["min"]), "max": eur(d["max"]),
                                "median": eur(d["median"]), "avg": eur(d["avg"])})))
    if d["n_stores"] > 1:
        qa.append(((rng.choice(["kfd_q_s_a", "kfd_q_s_b"]), {"team": team}),
                   ("kfd_a_s", {"team": team, "list": ", ".join(f"{s} ({num(c)})" for s, c in d["stores"][:4])})))
    if d.get("oldest") and d["oldest"] != d["newest"]:
        qa.append(((rng.choice(["kfd_q_o_a", "kfd_q_o_b"]), {"team": team}),
                   ("kfd_a_o", {"oldest": d["oldest"], "newest": d["newest"]})))
    return qa


DROP_ORDER = ["kfd_nod_", "kfd_top_", "kfd_gk", "kfd_px_", "kfd_dec_", "kfd_ls_"]


def render_block(page, team, d, kind, members=None):
    rng = random.Random(int(hashlib.md5(page.encode()).hexdigest(), 16))
    heading = span(rng.choice(["kfd_h_a", "kfd_h_b", "kfd_h_c", "kfd_h_d"]), {"team": team}, "h2")
    if not d["n"]:
        return heading + "\n  " + span("kfd_none", {"team": team}, "p"), []

    groups = [s_eras(rng, team, d), s_kits(rng, team, d), s_brands_stores(rng, team, d)]
    if kind != "national":   # en selecciones hay anuncios mal etiquetados (decision del owner)
        groups.append(s_extremes(rng, team, d))
    if kind == "league":
        groups.insert(0, s_league(rng, team, members))
    groups = [g for g in groups if g]
    rng.shuffle(groups)
    paras = [s_overview(rng, team, d)]
    if len(groups) >= 3:
        paras += [groups[0] + groups[1], sum(groups[2:], [])]
    elif groups:
        paras.append(sum(groups, []))
    # 80-150 palabras: si sobra, se quitan primero las frases menos utiles
    # (lo que ya muestran la tabla o las listas de debajo).
    words = lambda: sum(len(render_en(k, dict(v, date=DATE_EN)).split()) for p in paras for k, v in p)
    for drop in DROP_ORDER:
        if words() <= 150:
            break
        paras = [[(k, v) for k, v in p if not k.startswith(drop)] for p in paras]
    paras = [p for p in paras if p]
    body = [heading] + ["<p>" + " ".join(span(k, v) for k, v in p) + "</p>" for p in paras]

    rows = [("kfd_t_n", num(d["n"])), ("kfd_t_s", num(d["n_stores"]))]
    tail = []
    if d["n"] >= 2:
        tail += [("kfd_t_range", f"{eur(d['min'])} – {eur(d['max'])}"),
                 ("kfd_t_avg", eur(d["avg"])), ("kfd_t_med", eur(d["median"]))]
    if d["oldest"]:
        tail.append(("kfd_t_seasons", f"{len(d['seasons'])} ({d['oldest']} – {d['newest']})"
                     if d["oldest"] != d["newest"] else d["oldest"]))
    if d["brands"]:
        tail.append(("kfd_t_brand", d["brands"][0][0]))
    if d["long"]:
        tail.append(("kfd_t_ls", num(d["long"])))
    rng.shuffle(tail)
    body.append('<table class="kf-data-table"><tbody>\n' + "\n".join(
        f'    <tr>{span(k, {}, "th")}<td>{esc(v)}</td></tr>' for k, v in rows + tail) + "\n  </tbody></table>")

    lists = []
    if kind == "league" and members:
        items = [f'<a href="{u}">{esc(nm)}</a>: {num(c)}' if u else f"{esc(nm)}: {num(c)}"
                 for nm, c, u in members[:8]]
        lists.append((rng.choice(["kfd_l_clubs_a", "kfd_l_clubs_b"]), {"team": team}, items))
    top = [(s, c) for s, c in d["seasons"][:6] if c > 1]
    if len(top) >= 3:
        lists.append((rng.choice(["kfd_l_seas_a", "kfd_l_seas_b", "kfd_l_seas_c"]), {},
                      [f"{esc(s)}: {num(c)}" for s, c in top]))
    if len(d["decades"]) >= 2:
        lists.append((rng.choice(["kfd_l_dec_a", "kfd_l_dec_b"]), {},
                      [f"{dec}s: {num(c)}" for dec, c in d["decades"]]))
    for key, v, items in lists:
        body.append(span(key, v, "h3") + '\n  <ul class="kf-data-list">\n'
                    + "\n".join(f"    <li>{it}</li>" for it in items) + "\n  </ul>")

    qa = faq(rng, team, d)
    if qa:
        body.append(span(rng.choice(["kfd_faq_a", "kfd_faq_b", "kfd_faq_c"]), {}, "h3"))
        for (qk, qv), (ak, av) in qa:
            body.append(f'<details class="kf-faq">{span(qk, qv, "summary")}{span(ak, av, "p")}</details>')
    body.append(span("kfd_note", {}, "p", "kf-data-note"))
    ld = [(render_en(qk, dict(qv, date=DATE_EN)), render_en(ak, dict(av, date=DATE_EN))) for (qk, qv), (ak, av) in qa]
    return "\n  ".join(body), ld


# ── HTML ──────────────────────────────────────────────────────────────────────

CSS = """<style id="kf-data-css">
  .kf-data{background:#fff;border:1px solid #e2e6ea;border-radius:12px;padding:1.2rem 1.4rem;margin:2rem 0;}
  .kf-data h2{margin-top:0;}
  .kf-data p{font-size:15px;line-height:1.7;color:#3a4350;margin:0 0 .9rem;}
  .kf-data h3{font-size:15px;font-weight:700;color:#1e2530;margin:1.2rem 0 .5rem;}
  .kf-data-table{border-collapse:collapse;width:100%;max-width:520px;font-size:14px;margin:.5rem 0 1rem;}
  .kf-data-table th{text-align:left;font-weight:600;color:#5a6472;padding:6px 12px 6px 0;border-bottom:1px solid #eef0f2;width:50%;}
  .kf-data-table td{padding:6px 0;border-bottom:1px solid #eef0f2;color:#1e2530;font-weight:600;}
  .kf-data-list{margin:0 0 .8rem 1.2rem;font-size:14px;line-height:1.7;color:#3a4350;}
  .kf-data-list a{color:#178a55;}
  .kf-faq{border-bottom:1px solid #eef0f2;padding:.55rem 0;font-size:14.5px;}
  .kf-faq summary{cursor:pointer;font-weight:600;color:#1e2530;}
  .kf-faq p{margin:.5rem 0 0;font-size:14px;}
  .kf-data .kf-data-note{font-size:12.5px;color:#9aa3ad;margin-top:1rem;}
</style>"""


def set_head(t, title, desc):
    t = re.sub(r"<title>[^<]*</title>", lambda m: f"<title>{esc(title)}</title>", t, count=1)
    for a in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        t = re.sub(rf'<meta {a} content="[^"]*"', lambda m: f'<meta {a} content="{attr(desc)}"', t, count=1)
    for a in ('property="og:title"', 'name="twitter:title"'):
        t = re.sub(rf'<meta {a} content="[^"]*"', lambda m: f'<meta {a} content="{attr(title)}"', t, count=1)
    return t


def rounded(n):
    """Cifra para <title>/description que envejece bien: 3,412 -> "3,400+", 137 -> "130+",
    49 -> "40+". Por debajo de 20 se deja exacta."""
    if n < 20:
        return num(n)
    step = 10 ** max(1, len(str(n)) - 2)
    return f"{num(n // step * step)}+"


def new_title(old, kind, team, n):
    old = html.unescape(old)
    count = rounded(n)
    if kind == "team":   # "Celtic Vintage Shirts — 2,000+ available | Kit Finder"
        return re.sub(r"— [\d,]+\+? available", f"— {count} available", old)
    # "Chelsea Football Shirts — 3,400+ Vintage, Retro & Classic Kits | Kit Finder"
    new = re.sub(r"— (?:[\d,]+\+? )?Vintage", f"— {count} Vintage", old, count=1)
    return new if count in new else f"{team} Football Shirts — {count} Vintage & Retro Kits | Kit Finder"


def new_desc(rng, team, d, kind):
    """Sin precios ni fechas (cambian cada mes); cifras redondeadas."""
    if not d["n"]:
        return f"Vintage and retro {team} football shirts on Kit Finder. Compare listings from specialist stores."
    noun = "football shirts" if kind != "league" else "shirts"
    stores = f"{rounded(d['n_stores'])} stores" if d["n_stores"] > 1 else d["stores"][0][0]
    return rng.choice([
        f"Compare {rounded(d['n'])} vintage and retro {team} {noun} from {stores}. "
        f"See prices, seasons, brands and kit types on Kit Finder.",
        f"{rounded(d['n'])} original {team} {noun} in stock from {stores}. "
        f"Price range, seasons and top stores, updated monthly on Kit Finder."])


def related_html(links, hub):
    out = ['  <div class="kf-related">', "    " + span("kfd_related", {}, "h3")]
    for nm, u in links:
        out.append(f'    <a href="{u}" class="kf-related-link" data-i18n="teams_link" '
                   f'data-i18n-vars="team={attr(quote(nm, safe=""))}">{esc(nm)} shirts</a>')
    i18n = f' data-i18n="{hub[2]}"' if hub[2] else ""
    out.append(f'    <a href="{hub[0]}" class="kf-related-link"{i18n}>{hub[1]}</a>')
    out.append("  </div>")
    return "\n".join(out)


def apply(page, team, d, kind, links, members=None):
    path = os.path.join(REPO, page, "index.html")
    t = open(path, encoding="utf-8", newline="").read()
    nl = "\r\n" if "\r\n" in t else "\n"
    t = t.replace("\r\n", "\n")
    rng = random.Random(int(hashlib.md5((page + "#head").encode()).hexdigest(), 16))

    body, qa = render_block(page, team, d, kind, members)
    block = (f'<!-- kf-data:start -->\n<section class="kf-data">\n  {body}\n</section>\n<!-- kf-data:end -->')

    if "<!-- kf-data:start -->" in t:
        t = re.sub(r"<!-- kf-data:start -->.*?<!-- kf-data:end -->", lambda m: block, t, flags=re.S)
    else:
        t = t.replace('  <div class="kf-related">', block + '\n  <div class="kf-related">', 1)
    t = re.sub(r'  <div class="kf-related">.*?\n  </div>',
               lambda m: related_html(links, HUBS[page.split("/")[0]]), t, count=1, flags=re.S)

    t = t.replace("/i18n.js?v=5", "/i18n.js?v=6")   # nuevas claves kfd_: no usar la copia en cache
    if 'id="kf-data-css"' in t:
        t = re.sub(r'<style id="kf-data-css">.*?</style>', lambda m: CSS, t, flags=re.S)
    else:
        t = t.replace("</head>", CSS + "\n</head>", 1)
    if d["n"]:
        old_title = re.search(r"<title>([^<]*)</title>", t).group(1)
        t = set_head(t, new_title(old_title, kind, team, d["n"]), new_desc(rng, team, d, kind))
        if kind == "team":   # subtitulo "1,325 available right now" (texto y data-i18n-vars)
            t = re.sub(r'(<p class="kf-lp-sub"[^>]*data-i18n-vars="n=)[\d,]+(">)[\d,]+ available',
                       lambda m: f"{m.group(1)}{num(d['n'])}{m.group(2)}{num(d['n'])} available", t, count=1)
    t = re.sub(r'\n<script type="application/ld\+json" id="kf-faq">.*?</script>', "", t, flags=re.S)
    if qa:
        ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]}
        t = t.replace("</head>", '<script type="application/ld+json" id="kf-faq">\n'
                      + json.dumps(ld, ensure_ascii=False, indent=2) + "\n</script>\n</head>", 1)
    open(path, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))


# ── Traducciones -> i18n.js y lang/*.js ───────────────────────────────────────

def sync_translations():
    def line(k, lang, indent):
        return f'{indent}{json.dumps(k)}: {json.dumps(T[k][lang], ensure_ascii=False)},\n'

    def write(path, anchor_re, lang, indent):
        src = open(path, encoding="utf-8", newline="").read()
        nl = "\r\n" if "\r\n" in src else "\n"
        src = src.replace("\r\n", "\n")
        src = re.sub(r'^\s*"kfd_[a-z0-9_]+": .*\n', "", src, flags=re.M)
        m = re.search(anchor_re, src, flags=re.M)
        block = "".join(line(k, lang, indent) for k in T)
        src = src[:m.end()] + block + src[m.end():]
        open(path, "w", encoding="utf-8", newline="").write(src.replace("\n", nl))

    write(os.path.join(REPO, "i18n.js"), r'^\s*"footer_teams": "Teams",\n', "en", "      ")
    for lang in LANGS[1:]:
        write(os.path.join(REPO, "lang", f"{lang}.js"), rf"^KF_TRANSLATIONS\.{lang} = \{{\n", lang, "  ")


# ── Paginas y enlaces relacionados ────────────────────────────────────────────

def build_registry(S, teams_tbl, league_teams):
    """page -> (nombre mostrado, nombres en D1, tipo); url_of: nombre D1 -> (url, nombre)."""
    pages = {}
    for page, d1 in HAND_PAGES.items():
        pages[page] = (DISPLAY.get(d1, d1), [d1], "club" if page.startswith("clubs/") else "national")
    for slug in os.listdir(os.path.join(REPO, "teams")):
        f = os.path.join(REPO, "teams", slug, "index.html")
        if not os.path.isfile(f):
            continue
        match = [t for t in S if slugify(t) == slug]
        if match:
            h1 = re.search(r"<h1[^>]*>([^<]*)</h1>", open(f, encoding="utf-8").read())
            shown = html.unescape(h1.group(1)).replace(" Vintage Shirts", "").strip() if h1 else match[0]
            pages[f"teams/{slug}"] = (shown, match, "team")
    url_of = {d1s[0]: ("/" + page, shown) for page, (shown, d1s, kind) in pages.items()}

    lower = {t.lower(): t for t in S}
    league_of = {}
    for lg, names in league_teams.items():
        for nm in names:
            if nm in lower:
                league_of.setdefault(lower[nm], lg)
    country_of, tipo_of = {}, {}
    for tm in teams_tbl:
        for nm in [tm["nombre_canonico"]] + json.loads(tm.get("alias") or "[]"):
            if nm.lower() in lower:
                country_of.setdefault(lower[nm.lower()], tm["pais"])
                tipo_of.setdefault(lower[nm.lower()], tm["tipo"])
    for page, lg in LEAGUES.items():
        pages[page] = (lg, [t for t in S if league_of.get(t) == lg], "league")
    return pages, url_of, league_of, country_of, tipo_of


def count(S, t):
    return sum(S[t]["prices"].values()) if t in S else 0


def related_links(page, pages, url_of, league_of, country_of, tipo_of, S):
    shown, d1s, kind = pages[page]
    me = d1s[0] if d1s else None
    pick = []

    def add(cands, limit=8):
        for t in sorted(cands, key=lambda t: (-count(S, t), t)):
            u = url_of.get(t)
            if u and u[0] != "/" + page and u not in pick and len(pick) < limit:
                pick.append(u)

    is_nat = lambda t: tipo_of.get(t) == "seleccion" or url_of[t][0].startswith("/national/")
    if kind == "league":
        others = [("/" + p, LEAGUES[p]) for p in LEAGUES if p != page]
        add(d1s, 8 - len(others))
        pick += others
    elif kind == "national" or is_nat(me):
        n0 = count(S, me)
        for t in sorted((t for t in url_of if is_nat(t)), key=lambda t: (abs(count(S, t) - n0), t)):
            if url_of[t][0] != "/" + page and len(pick) < 7:
                pick.append(url_of[t])
    else:
        lg, ct = league_of.get(me), country_of.get(me)
        if lg:
            add([t for t in url_of if league_of.get(t) == lg], 7)
        if ct:
            add([t for t in url_of if country_of.get(t) == ct and not is_nat(t)], 7)
        if lg:
            lp = next((p for p, n in LEAGUES.items() if n == lg), None)
            if lp:
                pick.append(("/" + lp, lg))
        if len(pick) < 6:   # sin liga/pais conocido: clubes con un numero parecido de camisetas
            n0 = count(S, me)
            for t in sorted((t for t in url_of if not is_nat(t)), key=lambda t: (abs(count(S, t) - n0), t)):
                if url_of[t][0] != "/" + page and url_of[t] not in pick and len(pick) < 6:
                    pick.append(url_of[t])
    return [(nm, u) for u, nm in pick][:8]


def main():
    only = [a.strip("/") for a in sys.argv[1:]]
    sync_translations()
    S, teams_tbl = load_stats()
    pages, url_of, league_of, country_of, tipo_of = build_registry(S, teams_tbl, load_league_teams())
    for page in only or sorted(pages):
        if page not in pages:
            print(f"  SKIP {page}: sin datos/registro")
            continue
        shown, d1s, kind = pages[page]
        d = summary(merge([S[t] for t in d1s if t in S]))
        members = None
        if kind == "league":
            members = sorted(((url_of.get(t, (None, t))[1], count(S, t), url_of.get(t, (None,))[0])
                              for t in d1s), key=lambda x: -x[1])
        links = related_links(page, pages, url_of, league_of, country_of, tipo_of, S)
        apply(page, shown, d, kind, links, members)
        print(f"  OK {page}: {d['n']} camisetas, {len(links)} relacionados")


if __name__ == "__main__":
    main()
