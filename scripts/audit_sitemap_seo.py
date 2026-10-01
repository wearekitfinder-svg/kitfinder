#!/usr/bin/env python3
# Recorre todas las URLs de sitemap.xml y registra, por cada una: status HTTP
# final, si hubo redirección (y la cadena completa), canonical, longitud del
# <title> y si hay meta robots noindex. Guarda el resultado en un CSV para
# tener el mapa real de qué URLs están afectadas por cada problema de SEO,
# en vez de depender de muestras sueltas.
import csv
import re
import sys
import time

import requests

SITEMAP_URL = "https://wearekitfinder.com/sitemap.xml"
OUT_CSV = "scripts/seo_audit.csv"
TIMEOUT = 20

CANONICAL_RE = re.compile(r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\']([^"\']*)["\']', re.I)
TITLE_RE = re.compile(r"<title[^>]*>([^<]*)</title>", re.I)
ROBOTS_RE = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]*content=["\']([^"\']*)["\']', re.I)


def fetch_sitemap_urls():
    r = requests.get(SITEMAP_URL, timeout=TIMEOUT)
    r.raise_for_status()
    return re.findall(r"<loc>([^<]+)</loc>", r.text)


def audit_url(url, session):
    row = {
        "url": url,
        "final_status": None,
        "final_url": url,
        "n_redirects": 0,
        "redirect_chain": "",
        "canonical": "",
        "canonical_self_referencing": "",
        "title": "",
        "title_len": "",
        "robots_noindex": "",
        "error": "",
    }
    try:
        resp = session.get(url, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException as e:
        row["error"] = str(e)
        return row

    row["final_status"] = resp.status_code
    row["final_url"] = resp.url
    row["n_redirects"] = len(resp.history)
    row["redirect_chain"] = " -> ".join(
        f"{h.status_code} {h.url}" for h in resp.history
    )

    html = resp.text if "text/html" in resp.headers.get("Content-Type", "") else ""
    m = CANONICAL_RE.search(html)
    canonical = m.group(1) if m else ""
    row["canonical"] = canonical
    row["canonical_self_referencing"] = str(
        bool(canonical) and canonical.rstrip("/") == url.rstrip("/")
    )

    m = TITLE_RE.search(html)
    title = m.group(1).strip() if m else ""
    row["title"] = title
    row["title_len"] = len(title)

    m = ROBOTS_RE.search(html)
    robots = m.group(1) if m else ""
    row["robots_noindex"] = str("noindex" in robots.lower())

    return row


def main():
    urls = fetch_sitemap_urls()
    print(f"{len(urls)} URLs en el sitemap.")

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (compatible; KitFinderSEOAudit/1.0)"

    rows = []
    for i, url in enumerate(urls, 1):
        row = audit_url(url, session)
        rows.append(row)
        flag = []
        if row["error"]:
            flag.append("ERROR")
        if row["n_redirects"]:
            flag.append(f"{row['n_redirects']}x redirect")
        if row["canonical_self_referencing"] == "False":
            flag.append("canonical NO self-ref")
        if row["title_len"] not in ("", 0) and int(row["title_len"]) > 60:
            flag.append(f"title {row['title_len']} chars")
        if row["robots_noindex"] == "True":
            flag.append("noindex")
        print(f"[{i}/{len(urls)}] {row['final_status']} {url}" + (f"  <-- {', '.join(flag)}" if flag else ""))
        time.sleep(0.05)

    fieldnames = [
        "url", "final_status", "final_url", "n_redirects", "redirect_chain",
        "canonical", "canonical_self_referencing", "title", "title_len",
        "robots_noindex", "error",
    ]
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"\nGuardado en {OUT_CSV}")

    n_redirect = sum(1 for r in rows if r["n_redirects"])
    n_bad_canonical = sum(1 for r in rows if r["canonical_self_referencing"] == "False")
    n_long_title = sum(1 for r in rows if isinstance(r["title_len"], int) and r["title_len"] > 60)
    n_noindex = sum(1 for r in rows if r["robots_noindex"] == "True")
    n_errors = sum(1 for r in rows if r["error"])
    print(f"Resumen: {n_redirect} con redirección | {n_bad_canonical} canonical no self-referencing | "
          f"{n_long_title} títulos >60 chars | {n_noindex} noindex | {n_errors} errores")


if __name__ == "__main__":
    sys.exit(main())
