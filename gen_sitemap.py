#!/usr/bin/env python3
# Genera sitemap.xml para Kit Finder.
# Combina: (1) rutas-vista de la SPA (fijas) + (2) paginas reales (carpetas con index.html).
# Asi nunca pierde una pagina existente y suma sola las nuevas (blog, clubes, etc.).
import os, datetime, subprocess

BASE = "https://wearekitfinder.com"
HOY = datetime.date.today().isoformat()

# (1) Rutas que viven dentro del index.html (la SPA las dibuja con JS).
#     No son archivos: hay que listarlas a mano.
#     /about, /results y /match-worn NO van: sirven la home y su canonical
#     apunta a "/", asi que Google las marca como "pagina alternativa".
SPA_ROUTES = ["/", "/long-sleeve-kits", "/why"]

# Carpetas reales que NO deben ir al sitemap (paginas internas con noindex).
EXCLUDE = {"/dashboard"}

def prioridad(ruta):
    if ruta == "/": return ("daily", "1.0")
    if ruta == "/long-sleeve-kits": return ("daily", "0.9")
    if ruta.startswith(("/clubs/", "/national/", "/leagues/")): return ("weekly", "0.8")
    if ruta.startswith("/blog"): return ("weekly", "0.7")
    if ruta == "/why": return ("monthly", "0.5")
    return ("weekly", "0.7")

def descubrir_carpetas(repo="."):
    rutas = set()
    for root, dirs, files in os.walk(repo):
        # Carpetas ocultas (.git, .claude, .wrangler...) no son paginas del sitio.
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        rel = os.path.relpath(root, repo)
        if "index.html" in files and rel != ".":
            rutas.add("/" + rel.replace(os.sep, "/"))
    return rutas

def lastmod(ruta):
    """Fecha real del ultimo cambio de la pagina: la de hoy si tiene cambios
    sin commitear, si no la del ultimo commit que la toco (git). Las rutas SPA
    usan index.html. Asi <lastmod> solo cambia cuando la pagina cambia."""
    f = "index.html" if ruta in SPA_ROUTES else ruta.lstrip("/") + "/index.html"
    git = lambda *a: subprocess.run(["git", *a, "--", f], capture_output=True, text=True).stdout.strip()
    if git("status", "--porcelain"):
        return HOY
    return git("log", "-1", "--format=%cs") or HOY

def main():
    rutas = (set(SPA_ROUTES) | descubrir_carpetas(".")) - EXCLUDE
    orden = sorted(rutas, key=lambda r: (r != "/", r))
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for r in orden:
        cf, pr = prioridad(r)
        out += ["  <url>",
                f"    <loc>{BASE}{r}</loc>",
                f"    <lastmod>{lastmod(r)}</lastmod>",
                f"    <changefreq>{cf}</changefreq>",
                f"    <priority>{pr}</priority>",
                "  </url>"]
    out.append("</urlset>")
    open("sitemap.xml", "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"sitemap.xml generado con {len(orden)} paginas.")

if __name__ == "__main__":
    main()
