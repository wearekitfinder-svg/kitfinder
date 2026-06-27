#!/usr/bin/env python3
# Limpia el _HG_POOL de index.html: borra SOLO las camisetas claramente vendidas.
# Regla de oro: ante cualquier duda, la camiseta se queda.
import re, json, sys, urllib.request, time

H = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# señales de AGOTADO en varios idiomas (explícitas)
SOLD = ["outofstock", "soldout", "sold out", "agotado", "ausverkauft",
        "vendu", "esaurito", "esgotado", "uitverkocht", "udsolgt",
        "slutsåld", "wyprzedane", "rupture de stock", "no disponible"]
# señales de DISPONIBLE (para confirmar que sigue a la venta)
INSTOCK = ["instock", "add to cart", "add to basket", "in den warenkorb",
           "ajouter au panier", "aggiungi al carrello", "añadir al carrito",
           "adicionar ao carrinho", "in winkelwagen", "comprar"]

def norm(s): return s.lower().replace(" ", "")

def check_stock(url):
    """True=disponible, False=vendida (seguro), None=duda (no tocar)."""
    base = url.split('?')[0]
    # 1) Shopify .json
    try:
        with urllib.request.urlopen(urllib.request.Request(base + ".json", headers=H), timeout=15) as r:
            p = json.loads(r.read().decode()).get('product')
        if p and p.get('variants'):
            avs = [v.get('available') for v in p['variants']]
            if any(a is True for a in avs): return True
            if avs and all(a is False for a in avs): return False
    except Exception:
        pass
    # 2) HTML de la página
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=15) as r:
            html = r.read().decode('utf-8', 'ignore')
        low = html.lower(); flat = norm(html)
        # JSON-LD explícito manda
        m = re.search(r'"availability"\s*:\s*"[^"]*?(InStock|OutOfStock|SoldOut)"', html)
        if m:
            return m.group(1) == "InStock"
        # señales de agotado SOLO si además NO hay señal de compra
        has_sold = any(s in low or s in flat for s in SOLD)
        has_buy  = any(b in low for b in INSTOCK)
        if has_sold and not has_buy: return False
        if has_buy: return True
    except Exception:
        pass
    return None  # duda -> no tocar

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    dry  = "--apply" not in sys.argv  # por defecto solo simula
    html = open(path, encoding='utf-8').read()
    m = re.search(r'(_HG_POOL\s*=\s*)(\{.*?\})(;)', html, re.S)
    pool = json.loads(m.group(2))

    vendidas, dudas, ok = [], [], 0
    nuevo = {}
    for store, items in pool.items():
        keep = []
        for it in items:
            s = check_stock(it['url'])
            time.sleep(0.3)
            if s is False:
                vendidas.append((store, it['club'], it['season']))
            else:
                if s is None: dudas.append((store, it['club']))
                else: ok += 1
                keep.append(it)
        if keep: nuevo[store] = keep

    print(f"Disponibles: {ok} | Vendidas (a borrar): {len(vendidas)} | Dudas (se quedan): {len(dudas)}\n")
    if vendidas:
        print("Se BORRARÍAN (vendidas confirmadas):")
        for st, cl, se in vendidas: print(f"   ❌ {st}: {cl} {se}")
    if dudas:
        print("\nDudas (NO se tocan):")
        for st, cl in dudas: print(f"   ⚠️ {st}: {cl}")

    if dry:
        print("\n[SIMULACIÓN] No se ha modificado nada. Usa --apply para aplicar.")
        return
    # aplicar: reescribir el pool
    nuevo_json = json.dumps(nuevo, ensure_ascii=False)
    out = html[:m.start()] + m.group(1) + nuevo_json + m.group(3) + html[m.end():]
    open(path, 'w', encoding='utf-8').write(out)
    print(f"\n✅ index.html actualizado: {len(vendidas)} vendida(s) borrada(s).")

if __name__ == "__main__":
    main()
