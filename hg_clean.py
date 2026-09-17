#!/usr/bin/env python3
# Limpia el _HG_POOL de index.html: borra SOLO las camisetas claramente vendidas.
# Regla de oro: ante cualquier duda, la camiseta se queda.
import re, json, sys, urllib.request, urllib.error, time

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

def image_is_dead(img_ref):
    """True SOLO si se confirma un 404/4xx/5xx real en la imagen ya
    guardada en el pool. Regla de oro (misma que check_stock): ante
    cualquier duda, no se toca -- una ruta local relativa ('images/xxx.jpg',
    foto elegida a mano, no un enlace de CDN externo que pueda pudrirse) o
    un timeout/error de red puntual NUNCA cuentan como 'muerta', solo un
    codigo de error HTTP explicito. Sin esto, un primer intento de
    'refrescar imagenes' (2026-09-17) sobreescribio sin querer 3 fotos
    locales que SI funcionaban (hg-boca.jpg, hg-youngboys.jpg,
    hg-manutd.jpg) solo porque diferian del src que trae hoy el JSON de
    Shopify -- diferente no es lo mismo que roto."""
    if not img_ref or not img_ref.startswith(('http://', 'https://', '//')):
        return False
    url = ('https:' + img_ref) if img_ref.startswith('//') else img_ref
    try:
        req = urllib.request.Request(url, headers=H, method='HEAD')
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status >= 400
    except urllib.error.HTTPError as e:
        return e.code >= 400
    except Exception:
        return False

def check_stock(url):
    """True=disponible, False=vendida (seguro), None=duda (no tocar).
    Devuelve ademas la imagen ACTUAL del producto como segundo valor (o
    None si no se pudo leer). fresh_img se captura ANTES de decidir el
    stock y se devuelve en TODOS los caminos de salida (incluida la
    ruta 2, HTML) -- bug real encontrado probando esto: The Kit Dealer no
    trae el campo 'available' en sus variantes del .json, asi que el
    chequeo de stock de la ruta 1 nunca acierta y siempre cae a la ruta 2
    (HTML) para decidir disponibilidad; con fresh_img calculado solo
    dentro del bloque que hace 'return ..., fresh_img' de la ruta 1, esa
    caida perdia la imagen ya leida del JSON aunque fuera valida."""
    base = url.split('?')[0]
    fresh_img = None
    # 1) Shopify .json
    try:
        with urllib.request.urlopen(urllib.request.Request(base + ".json", headers=H), timeout=15) as r:
            p = json.loads(r.read().decode()).get('product')
        if p:
            imgs = p.get('images') or []
            if imgs and imgs[0].get('src'):
                fresh_img = imgs[0]['src']
            if p.get('variants'):
                avs = [v.get('available') for v in p['variants']]
                if any(a is True for a in avs): return True, fresh_img
                if avs and all(a is False for a in avs): return False, fresh_img
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
            return m.group(1) == "InStock", fresh_img
        # señales de agotado SOLO si además NO hay señal de compra
        has_sold = any(s in low or s in flat for s in SOLD)
        has_buy  = any(b in low for b in INSTOCK)
        if has_sold and not has_buy: return False, fresh_img
        if has_buy: return True, fresh_img
    except Exception:
        pass
    return None, fresh_img  # duda -> no tocar

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    dry  = "--apply" not in sys.argv  # por defecto solo simula
    html = open(path, encoding='utf-8').read()
    m = re.search(r'(_HG_POOL\s*=\s*)(\{.*?\})(;)', html, re.S)
    pool = json.loads(m.group(2))

    vendidas, dudas, ok = [], [], 0
    refrescadas = []
    nuevo = {}
    for store, items in pool.items():
        keep = []
        for it in items:
            s, fresh_img = check_stock(it['url'])
            time.sleep(0.3)
            if s is False:
                vendidas.append((store, it['club'], it['season']))
            else:
                if s is None: dudas.append((store, it['club']))
                else: ok += 1
                # Refresco de imagen (2026-09-17, bug real: The Kit Dealer
                # reproceso todas sus fotos y las 3 URLs guardadas en el
                # pool quedaron muertas -- ver commit del fix puntual). Solo
                # se refresca si la imagen YA guardada esta confirmada como
                # rota (image_is_dead) -- "distinta de la que trae hoy el
                # JSON" NO basta por si solo, ver docstring de
                # image_is_dead para el porque.
                if fresh_img and fresh_img != it.get('img') and image_is_dead(it.get('img')):
                    refrescadas.append((store, it['club'], it['img'], fresh_img))
                    it['img'] = fresh_img
                time.sleep(0.2)
                keep.append(it)
        if keep: nuevo[store] = keep

    print(f"Disponibles: {ok} | Vendidas (a borrar): {len(vendidas)} | Dudas (se quedan): {len(dudas)} | "
          f"Imagenes refrescadas: {len(refrescadas)}\n")
    if vendidas:
        print("Se BORRARÍAN (vendidas confirmadas):")
        for st, cl, se in vendidas: print(f"   ❌ {st}: {cl} {se}")
    if refrescadas:
        print("\nImagenes desactualizadas (se refrescarían):")
        for st, cl, old, new in refrescadas: print(f"   🔄 {st}: {cl}\n      {old}\n      -> {new}")
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
    print(f"\n✅ index.html actualizado: {len(vendidas)} vendida(s) borrada(s), "
          f"{len(refrescadas)} imagen(es) refrescada(s).")

if __name__ == "__main__":
    main()
