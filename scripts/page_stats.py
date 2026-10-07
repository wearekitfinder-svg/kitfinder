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
# llaveros o chaquetas como "camisetas", un producto sin is_shirt cuenta
# solo si su nombre (name_en o name) dice que es camiseta (SHIRT_WORDS) o
# que es una equipacion (KIT_WORDS: home/away/...), y nunca si contiene
# una palabra de NOT_SHIRT. Comprobado a mano con muestras aleatorias.
SHIRT_WORDS = ["shirt", "jersey", "maglia", "camiseta", "camisa", "maillot", "trikot",
               "koszulka", "tricou", "drakt", "tr_je", "tr_ja", "matchworn", "match worn",
               "match-worn", "match issue", "player issue"]
KIT_WORDS = ["home", "away", "third", "fourth", "goalkeeper", "heim", "ausw_rts", "local",
             "visitante", "domicile", "ext_rieur", "trasferta", "uit", "thuis"]
NOT_SHIRT = ["short", "sock", "scarf", "jacket", "tracksuit", "trouser", "pants", "hoodie", "hooded",
             "sweat", "drill top", "track top", "training top", "trainingtop", "1/4 zip", "half zip",
             "zip top", "rain", "polo", "t-shirt", "tee ", " tee", "programme", "poster", "keyring",
             "key ring", "porte", "mug", "boot", "beanie", "hat ", "flag", "fanion", "pennant",
             "coaster", "patch", "name set", "nameset", "armband", "fascia", "bundle", "sticker",
             "frame", "photo", "ticket", "book", "magazine", "towel", "cushion", "bag ", "ball ",
             "figure", "badge", "pin ", "lanyard", "sponsor", "number set", "numeros", "numbers", "gloves", "glove", "bib", "vest", "gilet",
             "pantal", "calcet", "calze", "bufanda", "sciarpa", "chaqueta", "giacca", "chandal",
             "tuta ", "felpa", "sudadera", "giubbotto", "bandiera", "gagliardetto"]


def shirt_filter():
    nm = "(' ' || lower(COALESCE(name_en, '') || ' ' || name) || ' ')"
    like = lambda ws: " OR ".join(f"{nm} LIKE '%{w}%'" for w in ws)
    return (f"(is_shirt = 1 OR (is_shirt IS NULL AND ({like(SHIRT_WORDS + KIT_WORDS)}) "
            f"AND NOT ({like(NOT_SHIRT)})))")


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
    base = (f"FROM products WHERE team IS NOT NULL AND team != '' "
            f"AND price > 0 AND currency IN ({','.join(repr(c) for c in rates)}) "
            f"AND {shirt_filter()} ")
    q = {
        "prices": f"SELECT team, CAST(ROUND({eur}) AS INTEGER) eur, COUNT(*) n {base} GROUP BY team, eur",
        "stores": f"SELECT team, store, COUNT(*) n {base} GROUP BY team, store",
        "brands": f"SELECT team, brand, COUNT(*) n {base} GROUP BY team, brand",
        "versions": f"SELECT team, version, COUNT(*) n {base} GROUP BY team, version",
        "sleeves": f"SELECT team, sleeve, COUNT(*) n {base} AND sleeve IS NOT NULL GROUP BY team, sleeve",
        "seasons": f"SELECT team, season, COUNT(*) n {base} GROUP BY team, season",
        "extremes": (f"SELECT team, name, store, price, currency, eur, lo, hi FROM ("
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
