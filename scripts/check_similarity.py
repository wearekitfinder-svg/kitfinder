#!/usr/bin/env python3
"""Regla del 60 %: cada pagina de /clubs, /national, /leagues y /teams debe ser
al menos un 60 % distinta de cualquier otra pagina del mismo tipo.

Medida: texto visible (sin <head>, <script>, <style>), en minusculas, cortado
en grupos de 3 palabras seguidas; parecido = grupos en comun / grupos en total
(indice de Jaccard). diferencia = 1 - parecido.

EJECUTAR:  python scripts/check_similarity.py        (sale con error si alguna falla)
"""
import html, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_DIFF = 0.60
TYPES = ("clubs", "national", "leagues", "teams")


def words(path):
    t = open(path, encoding="utf-8").read()
    t = re.sub(r"(?is)<head.*?</head>|<script.*?</script>|<style.*?</style>", " ", t)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.findall(r"[a-z0-9À-ɏ'€£$.,%-]+", t.lower())


def shingles(w, k=3):
    return {" ".join(w[i:i + k]) for i in range(len(w) - k + 1)}


def main():
    failed = []
    for typ in TYPES:
        pages = {}
        for slug in sorted(os.listdir(os.path.join(REPO, typ))):
            p = os.path.join(REPO, typ, slug, "index.html")
            if os.path.isfile(p):
                pages[slug] = shingles(words(p))
        closest = []
        for a in pages:
            sim, b = max(((len(pages[a] & pages[b]) / len(pages[a] | pages[b]), b)
                          for b in pages if b != a), default=(0.0, ""))
            closest.append((sim, a, b))
            if 1 - sim < MIN_DIFF:
                failed.append((typ, a, b, sim))
        closest.sort(reverse=True)
        sim, a, b = closest[0]
        avg = sum(c[0] for c in closest) / len(closest)
        print(f"{typ:9} {len(pages):3} paginas | par mas parecido: {a} ~ {b} = {1 - sim:.0%} distinto "
              f"| media vs su pagina mas parecida: {1 - avg:.0%} distinto")
    if failed:
        print(f"\nFALLAN la regla del {MIN_DIFF:.0%}:")
        for typ, a, b, sim in failed:
            print(f"  {typ}/{a} ~ {b}: {1 - sim:.0%} distinto")
        sys.exit(1)
    print(f"\nOK: todas las paginas son al menos un {MIN_DIFF:.0%} distintas.")


if __name__ == "__main__":
    main()
