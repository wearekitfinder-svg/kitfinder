#!/usr/bin/env python3
# Inserta el analytics (GA4) en todas las páginas .html que aún no lo tengan.
# Lo pone justo antes de </head>, con ruta absoluta para que funcione en subcarpetas.
import os, re

TAG = '<script src="/analytics.js?v=1" defer></script>'
MARK = 'analytics.js'

def main():
    cambiadas = []
    for root, _, files in os.walk('.'):
        if '/.git' in root or root.startswith('./.git'):
            continue
        for fn in files:
            if not fn.endswith('.html'):
                continue
            path = os.path.join(root, fn)
            try:
                html = open(path, encoding='utf-8').read()
            except Exception:
                continue
            if MARK in html:
                continue  # ya lo tiene
            if '</head>' not in html.lower():
                continue  # sin head, no tocar
            # insertar antes del primer </head> (respetando may/min)
            nuevo = re.sub(r'(?i)</head>', '  ' + TAG + '\n</head>', html, count=1)
            open(path, 'w', encoding='utf-8').write(nuevo)
            cambiadas.append(path)
    if cambiadas:
        print(f"Analytics añadido en {len(cambiadas)} páginas:")
        for c in cambiadas:
            print("  ", c)
    else:
        print("Todas las páginas ya tenían analytics.")

if __name__ == "__main__":
    main()
