#!/usr/bin/env python3
# Actualiza el objeto RATES={...} dentro de app.js con tipos de cambio reales.
# Base EUR. API gratuita sin clave: open.er-api.com
import re, json, sys, urllib.request

APP = "app.js"
API = "https://open.er-api.com/v6/latest/EUR"

def fetch_rates():
    req = urllib.request.Request(API, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    if data.get('result') != 'success' or 'rates' not in data:
        raise SystemExit("La API no devolvió tipos válidos")
    return data['rates']

def fmt(v):
    # 4 decimales, sin ceros sobrantes
    s = f"{v:.4f}".rstrip('0').rstrip('.')
    return s if s else "0"

def main():
    src = open(APP, encoding='utf-8').read()
    m = re.search(r'RATES=\{([^}]*)\}', src)
    if not m:
        raise SystemExit("No encontré el objeto RATES={...} en app.js")

    # divisas actuales (mantenemos la misma lista y orden)
    pares = re.findall(r'([A-Z]{3}):[0-9.]+', m.group(1))
    api = fetch_rates()

    nuevos = []
    cambiadas = 0
    for cur in pares:
        if cur == 'EUR':
            nuevos.append("EUR:1"); continue
        if cur in api and api[cur] > 0:
            nuevos.append(f"{cur}:{fmt(api[cur])}"); cambiadas += 1
        else:
            # si la API no la trae, conservar el valor viejo
            viejo = re.search(rf'{cur}:([0-9.]+)', m.group(1)).group(1)
            nuevos.append(f"{cur}:{viejo}")

    nuevo_obj = "RATES={" + ",".join(nuevos) + "}"
    out = src[:m.start()] + nuevo_obj + src[m.end():]

    if out == src:
        print("Sin cambios (los tipos ya estaban iguales).")
        return
    open(APP, 'w', encoding='utf-8').write(out)
    print(f"app.js actualizado: {cambiadas} divisas refrescadas.")

if __name__ == "__main__":
    main()
