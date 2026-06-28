#!/usr/bin/env python3
# Motor de alertas de favoritos para Kit Finder.
# 1) Lee los favoritos de cada usuario desde Firebase (Firestore).
# 2) Consulta el precio/stock ACTUAL de cada favorito en D1 (Cloudflare).
# 3) Detecta bajadas de precio y restock comparando con el precio sellado (alertPrice).
# 4) Envia un email por usuario (Resend) y actualiza el precio de referencia.
#
# Secretos necesarios (variables de entorno):
#   FIREBASE_SERVICE_ACCOUNT  -> JSON de la cuenta de servicio
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID
#   RESEND_API_KEY
#
# Modo prueba: si TEST_EMAIL esta puesto, todos los emails van a esa direccion.
# Modo dry-run: si DRY_RUN=1, no envia ni guarda nada, solo informa.

import os, json, sys, time, urllib.request, urllib.parse

FROM_EMAIL = "Kit Finder Alerts <alerts@wearekitfinder.com>"
SITE = "https://wearekitfinder.com"

CF_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
CF_ACCOUNT = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
D1_DB_ID = os.environ.get("D1_DATABASE_ID", "")
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "").strip()
DRY_RUN = os.environ.get("DRY_RUN", "") == "1"

# ── D1: consultar precios actuales por lista de ids ──────────────────────────
def d1_query(sql, params=None):
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query"
    body = json.dumps({"sql": sql, "params": params or []}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {CF_TOKEN}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.loads(r.read().decode())
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]

def precios_actuales(ids):
    """Devuelve {id: {price, currency, url, name}} para los ids que siguen en D1."""
    out = {}
    # consultar en lotes de 90 (limite de variables de SQLite)
    for i in range(0, len(ids), 90):
        lote = ids[i:i+90]
        ph = ",".join("?" * len(lote))
        rows = d1_query(
            f"SELECT id, price, currency, url, name FROM products WHERE id IN ({ph})", lote)
        for r in rows:
            out[r["id"]] = r
    return out

print("Motor de alertas - modulo D1 cargado.")
print("DRY_RUN:", DRY_RUN, "| TEST_EMAIL:", TEST_EMAIL or "(ninguno)")


import re as _re

def extract_season(title):
    """Extrae la temporada (formato YYYY/YY). Portado de extractSeasonFromTitle de la web."""
    if not title: return ""
    t = title
    n = _re.search(r'\b((?:19|20)\d{2})\s*[\/\-]\s*((?:19|20)\d{2})\b', t)
    if n:
        a, e = int(n.group(1)), int(n.group(2))
        if e == a+1: return f"{a}/{str(e)[-2:]}"
    n = _re.search(r'\b((?:19|20)\d{2})\s*[\/\-]\s*(\d{2})\b', t)
    if n:
        a = int(n.group(1)); e2 = int(n.group(2))
        r = 100*(a//100)+e2
        if r <= a: r += 100
        if r == a+1: return f"{a}/{n.group(2).zfill(2)}"
    n = _re.search(r'\b([6-9]\d|0\d|[12]\d)\s*\/\s*([6-9]\d|0\d|[12]\d)\b', t)
    if n:
        a = int(n.group(1))
        if int(n.group(2)) == (a+1)%100:
            base = 1900 if a >= 60 else 2000
            return f"{base+a}/{n.group(2).zfill(2)}"
    return ""

def _norm(s):
    return (s or "").lower().strip()

# palabras de ruido: si el titulo las lleva, no es una camiseta equivalente
_NO_SHIRT = ["socks","shorts","polo","jacket","coat"," tee ","scarf","baby","training",
             "tracksuit"," hat ","cap ","name set","mug","poster","keyring","shin","glove"]

def _es_camiseta(title):
    t = " " + _norm(title) + " "
    return not any(w in t for w in _NO_SHIRT)

def _equipo_clave(title):
    """Saca el nombre de equipo SIN año ni ruido, normalizado, para comparar."""
    t = _norm(title)
    t = _re.sub(r'\b(19|20)\d{2}\s*[\/\-]?\s*\d{0,4}\b', ' ', t)  # quitar años
    for w in ["home","away","third","gk","goalkeeper","shirt","jersey","football",
              "soccer","fc","cf","retro","vintage","kit","-","(",")","/"]:
        t = t.replace(w, " ")
    return " ".join(t.split())


def buscar_equivalente(fav):
    """Para un favorito AGOTADO, busca en D1 otra camiseta igual (equipo+temporada).
    Conservador: misma temporada exacta Y el nombre del equipo del favorito
    aparece en el candidato. Devuelve el producto o None."""
    title = fav.get("name", "")
    if not _es_camiseta(title):
        return None
    season = extract_season(title)
    equipo = _equipo_clave(title)
    if not season or not equipo:
        return None  # sin temporada o equipo claro, no arriesgamos
    # buscar en D1 por la primera palabra fuerte del equipo + año
    palabra = equipo.split()[0] if equipo.split() else ""
    if len(palabra) < 3:
        return None
    anio = season.split("/")[0]  # 1996
    rows = d1_query(
        "SELECT id, price, currency, url, name FROM products "
        "WHERE name LIKE ? LIMIT 200", [f"%{palabra}%"])
    for r in rows:
        cand = r.get("name", "")
        if not _es_camiseta(cand):
            continue
        if extract_season(cand) != season:
            continue
        # el equipo del favorito debe aparecer en el candidato (conservador)
        ce = _equipo_clave(cand)
        ce_palabras = set(ce.split())
        eq_palabras = set(equipo.split())
        # coincidencia: todas las palabras del equipo del favorito estan en el candidato
        if eq_palabras and eq_palabras.issubset(ce_palabras):
            return r
    return None

# ── Firebase: leer usuarios y sus favoritos ──────────────────────────────────
def cargar_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore
    sa = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    cred = credentials.Certificate(sa)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    return firestore.client()

def leer_usuarios(db):
    """Devuelve lista de (uid, email, favourites[]) de quienes tengan favoritos."""
    usuarios = []
    for doc in db.collection("users").stream():
        d = doc.to_dict() or {}
        favs = d.get("favourites") or []
        email = d.get("email")
        if email and favs:
            usuarios.append((doc.id, email, favs))
    return usuarios

# ── Comparacion: detectar cambios ────────────────────────────────────────────
def detectar_cambios(favs, actuales):
    """Devuelve (bajadas[], restocks[]) para un usuario."""
    bajadas, restocks = [], []
    for f in favs:
        if not isinstance(f, dict): continue
        fid = f.get("id")
        if not fid: continue
        ancla = f.get("alertPrice")
        en_d1 = actuales.get(fid)

        # RESTOCK exacto: el mismo producto vuelve a D1
        if f.get("alertInStock") is False and en_d1:
            restocks.append({"name": f.get("name", "Shirt"), "url": en_d1.get("url") or f.get("url"),
                             "price": en_d1.get("price"), "currency": en_d1.get("currency", ""), "tipo": "same"})
            continue
        # RESTOCK equivalente: mi favorito se AGOTO (ya no esta en D1) -> buscar otro igual
        if en_d1 is None:
            eq = buscar_equivalente(f)
            if eq:
                restocks.append({"name": eq.get("name", "Shirt"), "url": eq.get("url"),
                                 "price": eq.get("price"), "currency": eq.get("currency", ""),
                                 "tipo": "equiv", "original": f.get("name","")})
            continue

        # BAJADA DE PRECIO: sigue en D1 y su precio actual < precio sellado
        if en_d1 and ancla:
            try:
                nuevo = float(en_d1.get("price"))
                viejo = float(ancla)
            except (TypeError, ValueError):
                continue
            if nuevo > 0 and nuevo < viejo:
                bajadas.append({"name": f.get("name", "Shirt"), "url": en_d1.get("url") or f.get("url"),
                                "old": viejo, "new": nuevo, "currency": en_d1.get("currency", "")})
    return bajadas, restocks

# ── Email (Resend) ───────────────────────────────────────────────────────────
def construir_email(bajadas, restocks):
    filas = ""
    for b in bajadas:
        filas += (f'<tr><td style="padding:10px 0">'
                  f'<a href="{b["url"]}" style="color:#111;text-decoration:none;font-weight:600">{b["name"]}</a><br>'
                  f'<span style="color:#888;text-decoration:line-through">{b["currency"]} {b["old"]:.2f}</span> '
                  f'<span style="color:#16a34a;font-weight:700">{b["currency"]} {b["new"]:.2f}</span> '
                  f'<span style="color:#16a34a">price drop</span></td></tr>')
    for r in restocks:
        pr = f'{r["currency"]} {float(r["price"]):.2f}' if r.get("price") else ""
        if r.get("tipo") == "equiv":
            etiqueta = "similar shirt available"
            extra = f'<br><span style="color:#888;font-size:13px">your saved one sold out</span>'
        else:
            etiqueta = "back in stock"
            extra = ""
        filas += (f'<tr><td style="padding:10px 0">'
                  f'<a href="{r["url"]}" style="color:#111;text-decoration:none;font-weight:600">{r["name"]}</a><br>'
                  f'<span style="color:#2563eb;font-weight:700">{etiqueta}</span> {pr}{extra}</td></tr>')
    return f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2 style="margin:0 0 4px">Good news from Kit Finder</h2>
  <p style="color:#555;margin:0 0 16px">Some of your favourite shirts have changed:</p>
  <table style="width:100%;border-collapse:collapse">{filas}</table>
  <p style="margin:24px 0 0"><a href="{SITE}" style="background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View on Kit Finder</a></p>
  <p style="color:#aaa;font-size:12px;margin-top:24px">You receive this because you saved these shirts as favourites on Kit Finder.</p>
</div>"""

def enviar_email(to, asunto, html):
    if DRY_RUN:
        print(f"   [DRY_RUN] email a {to}: {asunto}")
        return True
    destino = TEST_EMAIL or to
    body = json.dumps({"from": FROM_EMAIL, "to": [destino], "subject": asunto, "html": html}).encode()
    req = urllib.request.Request("https://api.resend.com/emails", data=body, method="POST",
        headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            ok = r.status in (200, 201)
        print(f"   {'✅' if ok else '⚠️'} email -> {destino}")
        return ok
    except Exception as e:
        print(f"   ❌ fallo email a {destino}: {str(e)[:60]}")
        return False

# ── Guardar el nuevo precio de referencia (para no repetir avisos) ───────────
def actualizar_anclas(db, uid, favs, actuales):
    cambiado = False
    for f in favs:
        if not isinstance(f, dict): continue
        en_d1 = actuales.get(f.get("id"))
        if en_d1:
            try:
                nuevo = float(en_d1.get("price"))
                if f.get("alertPrice") and nuevo < float(f["alertPrice"]):
                    f["alertPrice"] = nuevo; cambiado = True
                if f.get("alertInStock") is False:
                    f["alertInStock"] = True; cambiado = True
            except (TypeError, ValueError):
                pass
    if cambiado and not DRY_RUN:
        db.collection("users").doc(uid).set({"favourites": favs}, merge=True)
    return cambiado

# ── Proceso principal ────────────────────────────────────────────────────────
def main():
    db = cargar_firebase()
    usuarios = leer_usuarios(db)
    print(f"Usuarios con favoritos: {len(usuarios)}")

    # juntar todos los ids de favoritos para una sola consulta a D1
    todos_ids = list({f.get("id") for _, _, favs in usuarios for f in favs
                      if isinstance(f, dict) and f.get("id")})
    print(f"Favoritos unicos a consultar en D1: {len(todos_ids)}")
    actuales = precios_actuales(todos_ids) if todos_ids else {}
    print(f"De esos, siguen en stock (en D1): {len(actuales)}")

    avisados = 0
    for uid, email, favs in usuarios:
        bajadas, restocks = detectar_cambios(favs, actuales)
        if not bajadas and not restocks:
            continue
        n = len(bajadas) + len(restocks)
        asunto = f"{n} of your favourite shirts just changed"
        html = construir_email(bajadas, restocks)
        if enviar_email(email, asunto, html):
            actualizar_anclas(db, uid, favs, actuales)
            avisados += 1
        time.sleep(0.4)
    print(f"\nUsuarios avisados: {avisados}")

if __name__ == "__main__":
    main()
