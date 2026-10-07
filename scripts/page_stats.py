#!/usr/bin/env python3
"""Descarga de D1 (solo lectura) las estadisticas por equipo que usan las
paginas /clubs, /national, /leagues y /teams (ver gen_category_content.py).

Todo sale de la tabla products (columna team), sin inventar nada:
numero de camisetas, precios (convertidos a EUR con RATES_TO_EUR de
currency.js), tiendas, marcas, temporadas, version (local/visitante...),
manga larga, y el anuncio mas barato / mas caro.

Solo cuentan camisetas (ver shirt_filter) con precio > 0 y divisa con tipo
de cambio conocido.

EJECUTAR:  python scripts/page_stats.py
Necesita wrangler con sesion iniciada; corre las consultas desde
KITFINDER_SEARCH_DIR. Escribe STATS_PATH (fuera del repo: es un export
de trabajo, no un feed del sitio).
"""
import json, os, re, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KITFINDER_SEARCH_DIR = os.path.join(os.path.dirname(REPO), "kitfinder-search")
STATS_PATH = os.path.join(os.path.dirname(REPO), "kitfinder-automation", "page_stats_raw.json")


# is_shirt solo esta relleno en ~1% de productos. Para no contar bufandas,
# llaveros o chaquetas como "camisetas", un producto sin is_shirt se decide
# por su nombre (name_en + name), comparando PALABRAS COMPLETAS (columna nm:
# minusculas, signos -> espacios, con espacio delante y detras). Antes se
# buscaban trozos y "ball" casaba con "footBALL shirt" y "rain" con
# "tRAINing shirt": se perdian ~46.500 camisetas reales (octubre 2026).
#   - GARMENT: prendas que nunca son camiseta -> fuera siempre.
#   - ACCESSORY: objetos sueltos -> fuera salvo que el nombre diga claramente
#     que es una camiseta (SHIRT_WORDS): "framed signed shirt" si cuenta.
#   - Cuenta si dice que es camiseta (SHIRT_WORDS) o una equipacion (KIT_WORDS).
SHIRT_STEMS = ["trikot", "maglia", "camiseta", "camisa", "maillot", "jersey", "koszulk",
               "tricou", "drakt"]   # trozo: valen compuestos (heimtrikot)
SHIRT_WORDS = ["shirt", "shirts", "tr_je", "tr_ja"]
# "match worn"/"player issue" valen como home/away: un accesorio les gana
# ("Player Issue Patch" es un parche, no una camiseta).
KIT_WORDS = ["home", "away", "third", "fourth", "goalkeeper", "gk", "heim", "ausw_rts", "local",
             "visitante", "domicile", "ext_rieur", "trasferta", "uit", "thuis", "primeira",
             "terceira", "segunda", "kit", "match worn", "matchworn", "match issue", "player issue"]
GARMENT = ["shorts", "short pants", "socks", "sock", "scarf", "jacket", "tracksuit", "trousers",
           "pants", "hoodie", "hooded", "sweatshirt", "sweater", "jumper", "polo", "tee", "t shirt",
           "tshirt", "drill top", "track top", "training top", "trainingtop", "zip top", "half zip",
           "quarter zip", "1 4 zip", "beanie", "gilet", "vest", "gloves", "cap", "hat", "mug",
           "keyring", "key ring", "coaster", "poster", "magnet", "cushion", "towel", "sticker",
           "mini kit", "miniature", "pantalon", "pantalones", "pantaloncini", "calcetines",
           "calzettoni", "calze", "bufanda", "sciarpa", "chaqueta", "giacca", "giubbotto", "chandal",
           "tuta", "felpa", "sudadera", "jacke", "schal", "trainingsanzug",
           "numeros", "numbers", "number set", "name set", "nameset"]
ACCESSORY = ["programme", "magazine", "book", "ticket", "photo", "frame", "framed", "flag",
             "fanion", "pennant", "gagliardetto", "bandiera", "patch", "patches", "badge",
             "sponsor", "armband",
             "fascia", "bundle", "figure", "pin", "lanyard", "ball", "boots", "bag", "porte",
             "fan kit"]
PUNCT = "()-/,.|:[]\"'*#+!?&;"


def name_words():
    """Expresion SQL: nombre en minusculas, signos -> espacio, con espacios a los lados."""
    e = "lower(COALESCE(name_en, '') || ' ' || name)"
    for ch in PUNCT:
        e = f"REPLACE({e}, '{ch * 2 if ch == chr(39) else ch}', ' ')"
    return f"(' ' || {e} || ' ')"


def shirt_filter():
    """Condicion sobre la columna nm (ver name_words)."""
    word = lambda ws: " OR ".join(f"nm LIKE '% {w} %'" for w in ws)
    stem = " OR ".join(f"nm LIKE '%{w}%'" for w in SHIRT_STEMS)
    strong = f"({word(SHIRT_WORDS)} OR {stem})"
    return (f"(is_shirt = 1 OR (is_shirt IS NULL AND NOT ({word(GARMENT)}) AND "
            f"({strong} OR (({word(KIT_WORDS)}) AND NOT ({word(ACCESSORY)})))))")


def rates_to_eur():
    src = open(os.path.join(REPO, "currency.js"), encoding="utf-8").read()
    body = re.search(r"RATES_TO_EUR=\{([^}]*)\}", src).group(1)
    return {k: float(v) for k, v in re.findall(r"([A-Z]{3}):([0-9.e+-]+)", body)}


def d1(sql):
    # Solo ASCII: en Windows la linea de comandos rompe los acentos (por eso
    # las palabras con tilde usan el comodin "_" de LIKE: "ausw_rts").
    assert sql.isascii(), "consulta con caracteres no ASCII"
    # node + wrangler.js directo (sin cmd.exe): cmd corta a 8191 caracteres.
    wrangler = os.path.join(KITFINDER_SEARCH_DIR, "node_modules", "wrangler", "bin", "wrangler.js")
    out = subprocess.run(
        ["node", wrangler, "d1", "execute", "kitfinder", "--remote", "--json", "--command", sql],
        cwd=KITFINDER_SEARCH_DIR, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if out.returncode != 0:
        sys.exit("D1 error: " + (out.stderr or out.stdout)[-2000:])
    return json.loads(out.stdout)[0]["results"]


def main():
    rates = rates_to_eur()
    eur = "price * CASE currency " + " ".join(
        f"WHEN '{c}' THEN {r}" for c, r in rates.items()) + " END"
    # MATERIALIZED: nm se calcula una vez por producto. Sin esto SQLite repite
    # la limpieza del nombre en cada LIKE y D1 corta por tiempo de CPU (7429).
    cte = (f"WITH t AS MATERIALIZED (SELECT id, team, name, store, brand, version, sleeve, season, "
           f"price, currency, is_shirt, {name_words()} AS nm FROM products "
           f"WHERE team IS NOT NULL AND team != '' AND price > 0 "
           f"AND currency IN ({','.join(repr(c) for c in rates)})) ")
    base = f"FROM t WHERE {shirt_filter()} "
    q = {
        "prices": f"{cte}SELECT team, CAST(ROUND({eur}) AS INTEGER) eur, COUNT(*) n {base} GROUP BY team, eur",
        "stores": f"{cte}SELECT team, store, COUNT(*) n {base} GROUP BY team, store",
        "brands": f"{cte}SELECT team, brand, COUNT(*) n {base} GROUP BY team, brand",
        "versions": f"{cte}SELECT team, version, COUNT(*) n {base} GROUP BY team, version",
        "sleeves": f"{cte}SELECT team, sleeve, COUNT(*) n {base} AND sleeve IS NOT NULL GROUP BY team, sleeve",
        "seasons": f"{cte}SELECT team, season, COUNT(*) n {base} GROUP BY team, season",
        "extremes": (f"{cte}SELECT team, name, store, price, currency, eur, lo, hi FROM ("
                     f"SELECT team, name, store, price, currency, ROUND({eur}, 2) eur, "
                     f"ROW_NUMBER() OVER (PARTITION BY team ORDER BY {eur} ASC, id) lo, "
                     f"ROW_NUMBER() OVER (PARTITION BY team ORDER BY {eur} DESC, id) hi {base}"
                     f") WHERE lo = 1 OR hi = 1"),
        "teams": "SELECT id, nombre_canonico, tipo, pais, alias FROM teams",
    }
    data = {"rates_to_eur": rates}
    for k, sql in q.items():
        data[k] = d1(sql)
        print(f"  {k}: {len(data[k])} filas")
    with open(STATS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"OK -> {STATS_PATH}")


if __name__ == "__main__":
    main()
