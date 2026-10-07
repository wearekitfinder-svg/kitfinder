#!/usr/bin/env python3
"""Actualizacion mensual del contenido SEO de /clubs, /national, /leagues y
/teams. Un solo comando, desde la raiz del repo, en una rama nueva:

    git checkout main && git pull
    git checkout -b seo/refresh-AAAA-MM
    python scripts/refresh_seo_content.py

Hace, en orden (y se para si algo falla):
  1. page_stats.py           descarga de D1 (solo lectura) los datos por equipo
  2. gen_category_content.py reescribe el bloque de datos, titulos, descripciones,
                             FAQ y "Related" de las 196 paginas
  3. check_similarity.py     comprueba la regla del 60 %
  4. gen_sitemap.py          actualiza sitemap.xml (<lastmod> = fecha real de cambio)
Despues: revisar `git diff --stat`, commit, pull request y fusion segun CLAUDE.md.
"""
import os, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEPS = [["scripts/page_stats.py"], ["scripts/gen_category_content.py"],
         ["scripts/check_similarity.py"], ["gen_sitemap.py"]]

for step in STEPS:
    print(f"\n== {step[0]}")
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    if subprocess.run([sys.executable, *step], cwd=REPO, env=env).returncode != 0:
        sys.exit(f"\nParado: fallo {step[0]}. No hagas commit hasta revisarlo.")
print("\nListo. Revisa los cambios con: git diff --stat")
