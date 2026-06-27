#!/usr/bin/env python3
# Genera sitemap.xml para Kit Finder.
# Combina: (1) rutas-vista de la SPA (fijas) + (2) paginas reales (carpetas con index.html).
# Asi nunca pierde una pagina existente y suma sola las nuevas (blog, clubes, etc.).
import os, datetime

BASE = "https://wearekitfinder.com"
HOY = datetime.date.today().isoformat()

# (1) Rutas que viven dentro del index.html (la SPA las dibuja con JS).
#     No son archivos: hay que listarlas a mano.
SPA_ROUTES = ["/", "/results", "/match-worn", "/world-cup-kits", "/why", "/about", "/valuation"]

def prioridad(ruta):
    if ruta == "/": return ("daily", "1.0")
    if ruta in ("/results", "/match-worn", "/world-cup-kits"): return ("daily", "0.9")
    if ruta.startswith(("/clubs/", "/national/", "/leagues/")): return ("weekly", "0.8")
    if ruta.startswith("/blog"): return ("weekly", "0.7")
    if ruta in ("/about", "/why", "/valuation"): return ("monthly", "0.5")
    return ("weekly", "0.7")

def descubrir_carpetas(repo="."):
    rutas = set()
    for root, dirs, files in os.walk(repo):
        if "/.git" in root or root.startswith("./.git"): continue
        rel = os.path.relpath(root, repo)
        if "index.html" in files and rel != ".":
            rutas.add("/" + rel.replace(os.sep, "/"))
    return rutas

def main():
    rutas = set(SPA_ROUTES) | descubrir_carpetas(".")
    orden = sorted(rutas, key=lambda r: (r != "/", r))
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for r in orden:
        cf, pr = prioridad(r)
        out += ["  <url>",
                f"    <loc>{BASE}{r}</loc>",
                f"    <lastmod>{HOY}</lastmod>",
                f"    <changefreq>{cf}</changefreq>",
                f"    <priority>{pr}</priority>",
                "  </url>"]
    out.append("</urlset>")
    open("sitemap.xml", "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"sitemap.xml generado con {len(orden)} paginas (fecha {HOY}).")

if __name__ == "__main__":
    main()
