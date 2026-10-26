#!/usr/bin/env python3
# Informe semanal de indexación con la API URL Inspection de Search Console.
# Inspecciona cada URL del sitemap y guarda: estado de indexación, última
# fecha de rastreo y si Google eligió otro canonical. Añade una fila por tipo
# de página a un histórico con fecha y muestra qué cambió desde la última vez.
#
# La clave de la cuenta de servicio NO está en el repo: se pasa con --key o con
# la variable de entorno GSC_KEY_FILE (ruta a un .json). El script nunca
# imprime ni copia su contenido.
#
#   python scripts/gsc_index_report.py --key "C:\ruta\gsc.json"
#   python scripts/gsc_index_report.py --probe --key ...   (3 URLs, no escribe nada)
import argparse
import csv
import datetime
import os
import re
import sys
import time

import requests
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

SITEMAP_URL = "https://wearekitfinder.com/sitemap.xml"
SNAPSHOT_CSV = "scripts/gsc_index_status.csv"
HISTORY_CSV = "scripts/gsc_index_history.csv"
SITES_URL = "https://www.googleapis.com/webmasters/v3/sites"
INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

DAILY_LIMIT = 1900   # la API permite ~2.000 inspecciones al día por propiedad
PAUSE = 0.5          # ~120/min, muy por debajo del límite de 600/min
HUBS = {"clubs", "teams", "national", "leagues"}
TYPES = ["equipos", "clubes", "selecciones", "ligas", "hubs indice", "otras"]
FOLDER_TYPE = {"teams": "equipos", "clubs": "clubes", "national": "selecciones", "leagues": "ligas"}

SNAPSHOT_FIELDS = ["url", "type", "checked", "verdict", "coverage_state", "indexed",
                   "last_crawl", "google_canonical", "user_canonical", "other_canonical",
                   "robots_state", "page_fetch"]
HISTORY_FIELDS = ["date", "type", "total", "indexed", "not_indexed", "main_reason"]


def page_type(url):
    path = url.split("://", 1)[-1].split("/", 1)[-1].strip("/")
    if path in HUBS:
        return "hubs indice"
    return FOLDER_TYPE.get(path.split("/")[0], "otras") if "/" in path else "otras"


def sitemap_urls():
    r = requests.get(SITEMAP_URL, timeout=20)
    r.raise_for_status()
    return re.findall(r"<loc>([^<]+)</loc>", r.text)


def open_session(key_path):
    creds = service_account.Credentials.from_service_account_file(key_path, scopes=[SCOPE])
    return AuthorizedSession(creds)


def find_site(session):
    r = session.get(SITES_URL, timeout=30)
    if r.status_code != 200:
        sys.exit(f"sites.list falló {r.status_code}: {r.text[:300]}")
    sites = [s["siteUrl"] for s in r.json().get("siteEntry", [])]
    if not sites:
        sys.exit("La cuenta de servicio no tiene ninguna propiedad: añade su correo en "
                 "Search Console > Configuración > Usuarios y permisos.")
    return next((s for s in sites if "wearekitfinder.com" in s), sites[0])


def inspect(session, site, url):
    for attempt in range(5):
        r = session.post(INSPECT_URL, json={"inspectionUrl": url, "siteUrl": site}, timeout=60)
        if r.status_code == 200:
            ix = r.json().get("inspectionResult", {}).get("indexStatusResult", {})
            google, user = ix.get("googleCanonical", ""), ix.get("userCanonical", "")
            return {
                "url": url, "type": page_type(url),
                "checked": datetime.date.today().isoformat(),
                "verdict": ix.get("verdict", ""),
                "coverage_state": ix.get("coverageState", ""),
                "indexed": ix.get("verdict") == "PASS",
                "last_crawl": ix.get("lastCrawlTime", ""),
                "google_canonical": google, "user_canonical": user,
                "other_canonical": bool(google and user and google != user),
                "robots_state": ix.get("robotsTxtState", ""),
                "page_fetch": ix.get("pageFetchState", ""),
            }
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(10 * (attempt + 1))
            continue
        sys.exit(f"URL Inspection falló {r.status_code} en {url}: {r.text[:300]}")
    sys.exit(f"URL Inspection sigue fallando tras 5 intentos en {url}")


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(path, fields, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def history_rows(rows, today):
    out = []
    for t in TYPES:
        group = [r for r in rows if r["type"] == t]
        if not group:
            continue
        bad = [r["coverage_state"] or "sin dato" for r in group if not r["indexed"]]
        main = max(set(bad), key=bad.count) if bad else ""
        out.append({"date": today, "type": t, "total": len(group),
                    "indexed": len(group) - len(bad), "not_indexed": len(bad),
                    "main_reason": main})
    return out


def summary(rows, previous):
    if not previous:
        return "Primera ejecución: sin datos anteriores con los que comparar."
    prev = {r["url"]: r for r in previous}
    lines = []
    for r in rows:
        p = prev.get(r["url"])
        if p is None:
            lines.append(f"  nueva en el sitemap: {r['url']} ({r['coverage_state']})")
        elif (p["indexed"] == "True") != r["indexed"]:
            lines.append(f"  {'+ ahora indexada' if r['indexed'] else '- ya no indexada'}: {r['url']} ({r['coverage_state']})")
        elif p["coverage_state"] != r["coverage_state"]:
            lines.append(f"  ~ {r['url']}: {p['coverage_state']} -> {r['coverage_state']}")
    if not lines:
        return "Sin cambios respecto a la ejecución anterior."
    return "Cambios respecto a la ejecución anterior:\n" + "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=os.environ.get("GSC_KEY_FILE"),
                    help="ruta al .json de la cuenta de servicio (o GSC_KEY_FILE)")
    ap.add_argument("--site", help="propiedad exacta; por defecto la que devuelva sites.list")
    ap.add_argument("--probe", action="store_true", help="inspecciona 3 URLs y no escribe nada")
    ap.add_argument("--limit", type=int, default=DAILY_LIMIT)
    args = ap.parse_args()
    if not args.key or not os.path.isfile(args.key):
        sys.exit("Falta la clave: usa --key RUTA o la variable GSC_KEY_FILE.")

    session = open_session(args.key)
    site = args.site or find_site(session)
    print(f"Propiedad: {site}")
    urls = sitemap_urls()
    if len(urls) > args.limit:
        print(f"Aviso: {len(urls)} URLs y el límite diario es {args.limit}; se inspeccionan las primeras.")
        urls = urls[:args.limit]
    if args.probe:
        urls = [urls[0], urls[len(urls) // 2], urls[-1]]

    rows = []
    for i, u in enumerate(urls, 1):
        rows.append(inspect(session, site, u))
        if i % 25 == 0:
            print(f"  {i}/{len(urls)}")
        time.sleep(PAUSE)

    if args.probe:
        for r in rows:
            print(r)
        return
    today = datetime.date.today().isoformat()
    previous = read_csv(SNAPSHOT_CSV)
    write_csv(SNAPSHOT_CSV, SNAPSHOT_FIELDS, rows)
    hist = [h for h in read_csv(HISTORY_CSV) if h["date"] != today]
    write_csv(HISTORY_CSV, HISTORY_FIELDS, hist + history_rows(rows, today))

    print(f"\n{'tipo':<14}{'total':>6}{'indexadas':>11}{'sin indexar':>13}  causa principal")
    for h in history_rows(rows, today):
        print(f"{h['type']:<14}{h['total']:>6}{h['indexed']:>11}{h['not_indexed']:>13}  {h['main_reason']}")
    print("\n" + summary(rows, previous))
    others = [r["url"] for r in rows if r["other_canonical"]]
    print(f"\nURLs donde Google eligió otro canonical: {len(others)}")
    for u in others:
        print("  " + u)


if __name__ == "__main__":
    main()
