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

# Archivos que forman cada ruta SPA: el index.html comun + su Function propia
# (que es la que pone el <head> y el texto de esa ruta).
SPA_FILES = {
    "/": ["index.html"],
    "/long-sleeve-kits": ["index.html", "functions/long-sleeve-kits.js"],
    "/why": ["index.html", "functions/why.js"],
}

def asegurar_historial():
    """En GitHub Actions el checkout es superficial (1 commit): ahi
    `git log -- <ruta>` da la misma fecha para TODOS los archivos. Si el repo
    es superficial, se descarga el historial completo antes de calcular fechas."""
    r = subprocess.run(["git", "rev-parse", "--is-shallow-repository"], capture_output=True, text=True)
    if r.stdout.strip() == "true":
        subprocess.run(["git", "fetch", "--unshallow", "--quiet"], check=False)

def lastmod(ruta):
    """Fecha real del ultimo commit que toco el archivo de la pagina
    (git log -1 --format=%cs -- <ruta>). Las rutas SPA miran index.html y su
    Function. Solo si el archivo aun no tiene ningun commit se usa la de hoy."""
    files = SPA_FILES.get(ruta) or [ruta.lstrip("/") + "/index.html"]
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", *files],
                         capture_output=True, text=True).stdout.strip()
    return out or HOY

def main():
    asegurar_historial()
    rutas = (set(SPA_ROUTES) | descubrir_carpetas(".")) - EXCLUDE
    # Nada bajo /dashboard (panel interno, noindex) entra en el sitemap.
    rutas = {r for r in rutas if not any(r.startswith(e + "/") for e in EXCLUDE)}
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
