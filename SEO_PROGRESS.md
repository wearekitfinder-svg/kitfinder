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

### Historial de esta tarea (revisado tras detectar una regresión real)

La primera implementación (commit `7b314ef`) creó `long-sleeve-kits/index.html` y `why/index.html` como HTML estático puro (mismo patrón que las páginas de club) y quitó esas dos rutas de `_redirects` para que Cloudflare sirviera ese archivo en vez de reenviar al SPA.

**Se probó en local con `wrangler pages dev` (replicando el comportamiento real de Cloudflare Pages, incluyendo `_redirects`) y se confirmó una regresión de producto real, no solo teórica**: esas dos páginas estáticas no cargaban `app.js`, `auth.js` ni `info.js` — solo `analytics.js`. Cualquier usuario que entrara directo a `/long-sleeve-kits` o `/why` (bookmark, link compartido, resultado de Google, botón "atrás/adelante" del navegador, o simplemente refrescar la página) perdía por completo la funcionalidad real (el buscador de manga larga / el overlay "Why Kit Finder") y solo veía un lander con un botón que le mandaba de vuelta a `/` sin ejecutar la búsqueda. La navegación *interna* del sitio (menú `nav-link` con `onclick="searchLongSleeve()"` / `onclick="showInfo('why',event)"`) no se veía afectada porque nunca llega a pedir esa URL al servidor — pero cualquier entrada externa sí.

**Corregido en el commit `28ad936`**, con una solución distinta: en vez de servir HTML estático, se añadieron `functions/long-sleeve-kits.js` y `functions/why.js` (Cloudflare Pages Functions). Cada una pide el `index.html` real de la SPA vía `context.env.ASSETS.fetch()` y usa `HTMLRewriter` para sustituir *solo* las etiquetas del `<head>` (title, description, keywords, canonical, OG, Twitter) e inyectar un JSON-LD `WebPage` + `BreadcrumbList` propio — el `<body>` (y por tanto `app.js`/`auth.js`/`info.js` y toda la interactividad) llega intacto al navegador. Mismo documento para bots y para usuarios reales (no es cloaking: nadie recibe contenido distinto de nadie).

Verificado en local (`wrangler pages dev`) tras el fix:
- `GET /long-sleeve-kits` → 200, `<title>` único, `app.js`/`auth.js`/`info.js` presentes.
- `GET /why` → 200, `<title>` único, `app.js`/`auth.js`/`info.js` presentes.
- `/clubs/barcelona`, `/results`, `/match-worn` sin cambios de comportamiento.

Se eliminaron `long-sleeve-kits/index.html` y `why/index.html` (ya redundantes) y se volvió a añadir `/long-sleeve-kits` y `/why` a `SPA_ROUTES` en `gen_sitemap.py`, porque al dejar de ser carpetas físicas ya no las detecta `descubrir_carpetas()`.

**Nota sobre `_redirects`**: las líneas de `/long-sleeve-kits` y `/why` siguen sin estar en `_redirects` (correcto — ahora la Function es quien resuelve la ruta directamente, no necesita ese reenvío).

**No se tocó** `/results` ni `/match-worn`, como se pidió explícitamente. Durante la verificación se detectó que ambas rutas devuelven un `308` a `/` en `wrangler pages dev` local — se confirmó comparando contra el commit `ae67d72` (previo a todo el trabajo de hoy) que ese comportamiento ya existía antes, es una particularidad del servidor de desarrollo local y no algo introducido por este trabajo.

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

## Ronda 2 (tras revisión del usuario): 4 puntos resueltos

1. **UX de `/long-sleeve-kits` y `/why` — corregido**, no solo explicado. Ver la sección reescrita de Tarea 1 arriba: se reemplazó el HTML estático por una Cloudflare Pages Function con `HTMLRewriter` que sirve la SPA real (interactividad 100% intacta) con `<head>` propio por ruta. Verificado en vivo con `wrangler pages dev`, no solo por lectura de código. Commit `28ad936`.
2. **Slug de Uruguay — confirmado**: `clubs/nacional-uruguay`. Verificado que no colisiona con ningún otro slug existente en `clubs/`, `national/` ni `leagues/` (no existe ningún otro "nacional-*" ni "nacional" a secas en el repo).
3. **Precisión histórica de los 15 clubes nuevos**: lista completa de afirmaciones formuladas de forma general (y algunas dudas adicionales detectadas en esta ronda de revisión, más allá de lo que se había marcado la primera vez) entregada directamente al usuario en la conversación — no se publicó ni modificó ningún dato histórico sin su revisión.
4. **`og:image` — corregido**, commit separado `3cfdc99` ("fix: correct og:image extension (pre-existing bug)"). El alcance real era mayor de lo documentado inicialmente: no solo las 25 páginas de club, sino también las 4 páginas de liga + hub `/leagues`, y las 7 páginas de selección + hub `/national` — **39 archivos, 78 ocurrencias** de `og-image.png` → `og-image.jpg`.

## Commits añadidos en esta ronda

- `28ad936` — fix de `/long-sleeve-kits` y `/why` (Function + HTMLRewriter en vez de HTML estático).
- `502aa43` — fix menor: `gen_sitemap.py` había quedado fuera del commit anterior por un error de pathspec en el `git add`.
- `3cfdc99` — fix: extensión correcta de `og:image`/`twitter:image` en 39 archivos.

## Ronda 3 — verificación factual con fuentes reales (WebSearch, no memoria)

El usuario verificó por su cuenta 5 de las afirmaciones marcadas como dudosas en la ronda 2 y confirmó que eran errores reales. Se verificó cada una con búsquedas web antes de tocar el código (fuentes citadas en los commits):

- **Tottenham**: Nike desde 2021 → corregido a 2017 (releva a Under Armour, cuyo contrato era 2012-17). Consecuencia: la camiseta de la final de Champions 2018-19 se reasignó al bloque de Nike, no Puma/Under Armour como decía antes.
- **Tottenham**: Admiral → Hummel en 1985 saltaba a Le Coq Sportif (1980-85) de por medio. Corregido con los 3 proveedores y sus años.
- **Inter Milan**: la afirmación "evitó marca de fabricante por tradición durante décadas" no tiene fuente — se eliminó y se sustituyó por datos verificados (Mecsport 1982-86, Misura sponsor 1982-90).
- **Borussia Dortmund**: Nike "mid-1990s" → corregido a 1990 (segundo club europeo de Nike tras el PSG).
- **Borussia Dortmund**: "Continentale" descrito como Continental (neumáticos) — es incorrecto. Die Continentale es una aseguradora alemana sin relación con Continental. Corregido.

Commit: `02e0b41`.

Adicionalmente se resolvieron los 2 puntos que quedaban pendientes de verificar:

- **Atlético Madrid**: el texto atribuía la llegada de Nike a "Diego Simeone rebuilt the club" (2010s). Verificado: Nike es proveedor desde 2001-02, una década antes de que Simeone llegara (2011) — no era solo la fecha, era una relación causal inventada. Corregido sin perder el hecho real de que el título 2013-14 se ganó en camiseta Nike.
- **Corinthians**: "a high-profile partnership with a media conglomerate" ahora nombra explícitamente Media Sports Investment (MSI), 2004-2007, verificado en Wikipedia.

Commit: `06ffed5`.

**Nota**: las formulaciones "vagas" restantes (décadas sin marca de fabricante nombrada, sobre todo en Peñarol y Nacional Uruguay, donde ninguna década tiene marca asociada) no se han tocado — el usuario indicó que no son errores, solo imprecisas, y que decidiría si prefiere reescribirlas para sonar menos precisas de lo que son. Pendiente de esa decisión, no de una verificación factual.

## Pendiente de revisión humana (actualizado)

1. ~~Trade-off de UX~~ — resuelto (ver arriba).
2. ~~Slug `nacional-uruguay`~~ — confirmado, sin colisión.
3. **Precisión histórica** — lista completa entregada al usuario en el chat para su revisión dato por dato. Nada de esto se ha tocado en el código; si el usuario pide correcciones, será un commit aparte posterior a su revisión.
4. ~~`og:image`~~ — corregido.
5. **Colombia y Ghana añadidos** al ItemList del home y al hub de `/national` — fuera del alcance estricto pedido originalmente, pero corrige un bug preexistente menor. Sigue pendiente de confirmación del usuario (no revertido, sigue en la rama).

---

## Ronda 4 — rama `fix-redirects-agosto`: Search Console marcaba 10 URLs como "Página con redirección"

Investigado con `curl -I` en producción (no era caché de Search Console — confirmado con timestamps del propio día). Dos causas distintas:

### Causa A — 9 rutas SPA devolvían un 308 real hacia `/` (bug de producto, no solo SEO)

`/results`, `/match-worn`, `/about`, `/privacy`, `/terms`, `/affiliate`, `/favourites`, `/profile`, `/settings`. La regla `_redirects` de cada una (`/results /index.html 200`) debía ser un rewrite interno transparente, pero Cloudflare Pages redirige automáticamente cualquier petición literal a `/index.html` hacia `/` — el rewrite de `_redirects` vuelve a pasar por esa normalización y genera un 308 real visible para el cliente y para Google. Mismo mecanismo que ya vimos con `/why` y `/long-sleeve-kits`.

**Resuelto** con el mismo patrón: 9 Cloudflare Pages Functions nuevas (`functions/results.js`, `functions/match-worn.js`, `functions/about.js`, `functions/privacy.js`, `functions/terms.js`, `functions/affiliate.js`, `functions/favourites.js`, `functions/profile.js`, `functions/settings.js`), cada una sirviendo `index.html` real vía `context.env.ASSETS.fetch()` apuntando a `/` (no a `/index.html`, que dispara la misma normalización). Sin `HTMLRewriter` — estas rutas no necesitan meta único, solo dejar de redirigir. Se quitaron las 9 líneas ahora redundantes de `_redirects` (quedan solo `/league/*` y `/country/*`, sin tocar).

Verificado en local con `wrangler pages dev` (en puerto limpio — un proceso huérfano de sesiones de prueba anteriores en el puerto 8788 dio falsos negativos al principio, con la versión vieja de `_redirects` todavía respondiendo; resuelto matando todos los procesos node y usando un puerto nuevo): las 9 rutas devuelven 200 sin `Location`, con `app.js`/`auth.js`/`info.js` cargados (interactividad intacta). Home, `/clubs/barcelona/`, `/shirt-checker`, `/league/*`, `/country/*` sin cambios. Commit `8ac3240`.

### Causa B — 39 páginas estáticas (25 clubs + 4 leagues + 7 national + 3 hubs) con canonical contradictorio

Cada una declara `<link rel="canonical">` **sin barra final**, pero Cloudflare Pages solo sirve 200 en la versión **con barra final** — la versión sin barra (la que la propia página declara canónica) hace 308 hacia la versión con barra. Mismo patrón en `sitemap.xml`, el `ItemList` del home, y todos los enlaces internos (`.kf-related`, enlaces de los hubs): todo sin barra, apuntando sistemáticamente a la URL que redirige en vez de la que sirve contenido.

**Pendiente**: el usuario va a revisar el ajuste "Trailing Slash" en el dashboard de Cloudflare Pages (Settings → Builds & deployments) antes de tocar código. Si ese ajuste resuelve las 39 páginas, no hace falta ningún cambio de archivo. Si no, la Opción 2 (Functions + `HTMLRewriter` para `/clubs/*`, `/leagues/*`, `/national/*`, sacándolas del `exclude` de `_routes.json`) queda como plan B.

### Hallazgo aparte, pendiente, NO tocado

`/clubs/liverpool`, `/clubs/manchester-united` y `/clubs/arsenal` (páginas originales, previas a la rama `seo-improvements-agosto`) enlazan en su sección "Also popular" a `/national/england`, que no existe como página propia — cae en el fallback de la SPA y sirve el HTML genérico del home con su propio título (soft-404 silencioso, ni 404 real ni contenido real). Dos opciones a decidir más adelante: crear `/national/england` como página real, o quitar ese enlace de las 3 páginas afectadas. No forma parte del alcance de esta ronda.
