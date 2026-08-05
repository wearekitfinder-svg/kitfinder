# SEO Progress — rama `seo-improvements-agosto`

Ejecutado de forma autónoma a partir de la auditoría técnica de SEO previa. Este documento resume qué se hizo, con qué criterio, y qué decisiones debería revisar el usuario al volver.

## Resumen de commits

12 commits atómicos, del bugfix de robots.txt hasta la regeneración final del sitemap. Ver `git log main..seo-improvements-agosto` para el detalle.

---

## Bug encontrado antes de empezar: `/valuation`

`/valuation` aparecía en `sitemap.xml` y en `gen_sitemap.py` (`SPA_ROUTES`) pero **no existe como ruta real**: no hay ningún manejador en `app.js` ni contenido asociado a "valuation" en ningún sitio del repo. Era una entrada fantasma.

La función real de "comprobar el valor de una camiseta" ya vive en `/shirt-checker/index.html`, una página estática independiente que **ya tenía** title/description/canonical/robots correctos — no necesitaba ningún cambio.

**Resuelto**: se quitó `/valuation` de `SPA_ROUTES` en `gen_sitemap.py`. No se creó ninguna página `/valuation` nueva. Commit `6d08e6f`.

---

## Tarea 1 — Meta/OG/JSON-LD para `/long-sleeve-kits` y `/why`

**Archivos nuevos**: `long-sleeve-kits/index.html`, `why/index.html`.
**Archivo modificado**: `_redirects`.

### Cómo funciona el routing real (corrección a mi propia hipótesis inicial)

Antes de tocar nada investigué `_redirects` (no `_routes.json`, que solo gobierna qué rutas invocan Cloudflare Pages Functions — y aquí no hay ninguna Function de tipo catch-all para el SPA). El fallback del SPA en este sitio lo gestiona **`_redirects`**, con reglas explícitas tipo `/why /index.html 200`. Los clubes/ligas/países existentes funcionan como páginas estáticas simplemente porque **no** están en `_redirects` — Cloudflare Pages sirve el archivo físico directamente si existe.

Por eso, para que `/long-sleeve-kits` y `/why` sirvan mi HTML nuevo en vez de redirigir al SPA, **quité esas dos líneas de `_redirects`**. `_routes.json` no necesitó ningún cambio (mi hipótesis original en el prompt de trabajo suponía que sí, pero al investigar confirmé que no aplica aquí).

### Qué contienen las páginas nuevas

Mismo patrón que `clubs/barcelona`: title/description/keywords/canonical/OG/Twitter únicos, `meta robots`, y JSON-LD `WebPage` (no `CollectionPage`, porque no son colecciones de productos por club — son páginas de herramienta/información del sitio) con `isPartOf: WebSite` y `BreadcrumbList`.

**Decisión a revisar**: el contenido es un wrapper estático simple (logo + texto + CTA hacia `/`), no la experiencia interactiva real (el buscador de manga larga, el overlay de "Why"). Esto es una **regresión de UX en la navegación directa/hard-refresh**: antes, visitar `/why` directamente mostraba el overlay interactivo vía el SPA; ahora muestra esta página estática con un botón "Start searching now" que lleva a `/`. Es el mismo trade-off que ya asumen las páginas de club/liga/país existentes (son landers con CTA, no la búsqueda embebida), así que sigue el patrón establecido — pero es una regresión real de la experiencia de usuario en esas dos rutas específicas a cambio de indexabilidad SEO. Si se prefiere no perder esa interactividad en el hard-refresh, habría que revertir el cambio en `_redirects` y buscar otro mecanismo (p. ej. inyectar meta tags dinámicamente en el `index.html` del SPA vía Cloudflare Pages Function, bastante más complejo).

**No se tocó** `/results` ni `/match-worn`, como se pidió explícitamente.

---

## Tarea 2 — Páginas hub

**Archivos nuevos**: `clubs/index.html`, `leagues/index.html`, `national/index.html`.

Cada una lista todas las páginas de su categoría (25 clubes, 4 ligas, 7 selecciones), con intro breve, mismo estilo visual (`.kf-lp` + grid de tarjetas `.kf-hub-card`), meta/OG propios, y JSON-LD `CollectionPage` con un `ItemList` embebido en `mainEntity` enlazando todas las páginas listadas.

No hizo falta tocar `_routes.json` ni `_redirects`: al ser subrutas de `/clubs/*`, `/leagues/*`, `/national/*` (ya excluidas de las Functions y sin reglas de `_redirects`), Cloudflare Pages las sirve como archivos estáticos automáticamente, igual que las páginas de club existentes.

**Decisión de paso**: aproveché para añadir Colombia y Ghana al `ItemList` del home y al hub de `/national` — ya existían como carpetas (`national/colombia`, `national/ghana`) pero no estaban en el `ItemList` del home. Bug menor preexistente, corregido de paso.

---

## Tarea 3 — robots.txt

Quitada la línea `Disallow: /.netlify/` (código muerto — el sitio corre en Cloudflare Pages, no Netlify). Resto del archivo intacto. Commit `973a557`.

---

## Tarea 4 — 15 landing pages de club nuevas

**Carpetas nuevas**: `clubs/chelsea`, `clubs/manchester-city`, `clubs/tottenham`, `clubs/inter-milan`, `clubs/napoli`, `clubs/borussia-dortmund`, `clubs/atletico-madrid`, `clubs/sevilla`, `clubs/river-plate`, `clubs/boca-juniors`, `clubs/flamengo`, `clubs/corinthians`, `clubs/santos`, `clubs/penarol`, `clubs/nacional-uruguay`.

### Criterio de selección/ajuste

Se usó la lista sugerida por el usuario sin cambios (15 clubes: 8 europeos + 7 sudamericanos). Todos tienen volumen de búsqueda retro/vintage significativo y una historia de camiseta suficientemente rica para contenido genuino y no intercambiable.

### Decisión a revisar: slug de "Nacional" (Uruguay)

Usé `clubs/nacional-uruguay` en vez de `clubs/nacional` a secas, para evitar ambigüedad con otros clubes "Nacional" en Sudamérica (el más conocido siendo Atlético Nacional de Colombia). El `<title>`, el H1 y el JSON-LD usan "Nacional (Uruguay)" para dejarlo inequívoco también de cara al usuario/buscador, no solo en la URL.

### Contenido

Cada página sigue exactamente la plantilla de `clubs/barcelona/index.html`: title/description/keywords/canonical/OG/Twitter únicos, `meta robots`, JSON-LD `CollectionPage` + `BreadcrumbList` (Kit Finder > Clubs > {Club}), ~300 palabras de historia genuina y específica (marcas de kit reales, temporadas icónicas, jugadores asociados), sección `.kf-facts` con kits por década, CTA a `/?q={Club}`, y bloque `.kf-related` con 3-4 clubes relacionados por rivalidad/liga/país.

**Nota sobre precisión factual**: en los casos donde no tenía certeza sobre una fecha o marca exacta de patrocinador (p. ej. transiciones de proveedor de kit en Manchester City o Tottenham en años concretos), preferí formulaciones más generales y verificables antes que arriesgar un dato inventado. Sí soy confiado en los hechos centrales de cada club (títulos, jugadores, temporadas icónicas, marcas asociadas a épocas concretas como Ennerre-Maradona en Napoli o Kelme-Torres en Atlético). Vale la pena que alguien con conocimiento futbolístico revise cada página antes de publicar, especialmente fechas de patrocinadores/proveedores de kit que mencioné con menor seguridad.

### ItemList del home y sitemap

El `ItemList` JSON-LD de `index.html` ahora tiene 32 posiciones (10 clubes + 5 selecciones originales, + 15 clubes nuevos + Colombia/Ghana). Los 15 clubes nuevos se descubren automáticamente en `gen_sitemap.py` vía `descubrir_carpetas()` (no hizo falta tocar `SPA_ROUTES`).

---

## Sitemap final

`sitemap.xml` regenerado: **48 URLs** (antes 31). Incluye: home, about, blog (2), 3 hubs nuevos, 25 clubes (10 + 15), 4 ligas, 7 selecciones, long-sleeve-kits, why, shirt-checker, results, match-worn. **Sin** `/valuation`.

---

## Todo lo pedido se completó. Nada quedó bloqueado.

## Pendiente de revisión humana (resumen para el usuario)

1. **Trade-off de UX en `/long-sleeve-kits` y `/why`**: hard-refresh/visita directa ahora muestra un lander estático en vez de la experiencia interactiva. Ver Tarea 1 arriba.
2. **Fechas/marcas de patrocinador con menor certeza** en algunas de las 15 páginas de club nuevas — revisar antes de publicar si la precisión histórica es crítica.
3. **Slug `nacional-uruguay`** en vez de `nacional` — confirmar que es el criterio deseado.
4. **Colombia y Ghana añadidos** al ItemList del home y al hub de `/national` — fuera del alcance estricto pedido, pero corrige un bug preexistente menor.
5. **`og:image` usa `og-image.png`** en todas las páginas de club (nuevas y viejas) pero el archivo real en `images/` es `og-image.jpg` (el home sí usa `.jpg`). Este bug **ya existía** en las 10 páginas de club originales antes de este trabajo — no lo tocué por estar fuera de alcance, pero probablemente vale la pena corregirlo en una pasada aparte (afecta las 25 páginas de club, no solo las 15 nuevas).
