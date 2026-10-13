# Imprescindibles que le faltan a Kit Finder

Auditoría de la web en producción (wearekitfinder.com) y del repo, 13 oct 2026.
Lista corta y priorizada: lo de arriba es lo más importante.
Esfuerzo: **Rápida** (menos de 1 hora) · **Media** (unas horas) · **Larga** (varios días o varios repos).

> La página **Contact** ya va en el mismo PR que este documento: `/contact`, enlazada desde el pie.

## Prioridad alta

1. **Aviso legal con los datos del titular**. *Rápida en código, pero necesita tus datos* (nombre o razón social, NIF y dirección; no los invento).
   La web tiene actividad económica (comisiones de afiliados) y en España la LSSI obliga a mostrar quién está detrás. Hoy no hay ninguna página que lo diga.

2. **Página 404 real**. *Media*.
   Hoy cualquier URL que no existe devuelve la portada con código 200. Google lo trata como «soft 404» y puede indexar URLs basura. Ojo: cambia cómo responde toda la web, así que va en un PR aparte y se prueba en el preview.

3. **Política de cookies y banner traducido**. *Media*.
   El banner de cookies existe, pero sale siempre en inglés (los textos legales están bloqueados hasta revisión, `KF_TRANSLATE_LEGAL = false`) y no hay una página de política de cookies que explique qué cookies usa GA4 y cuánto duran. Es una obligación legal cuando hay analítica.

4. **Revisar Privacy y Terms**. *Media, requiere revisión legal*.
   La política de privacidad habla de un «contact form» que no existe, y está fechada en marzo de 2026. Conviene que alguien la revise con lo que hay hoy: GA4, login de Google en el perfil, favoritos, newsletter del blog.

## Prioridad media

5. **Pie real en el HTML de todas las páginas**. *Larga (dos repos)*.
   En /clubs, /national, /leagues, /teams, /shirt-checker y el blog, el aviso de afiliados lo añade `analytics.js` con JavaScript, y esas páginas no enlazan a About, Privacy, Terms ni Contact. Un pie de verdad en el HTML (más `gen_teams.py` en kitfinder-automation) da confianza y enlaces internos a Google.

6. **Versiones por idioma visibles para Google (hreflang)**. *Larga*.
   La web se traduce a 7 idiomas en el navegador, pero Google solo ve el inglés. Sin URLs por idioma con `hreflang` (una etiqueta que dice a Google qué página es la versión en cada idioma), las búsquedas en otros idiomas no aprovechan las traducciones.

7. **Accesibilidad básica**. *Media*.
   Hay unos 14 campos de formulario sin etiqueta para lectores de pantalla (`aria-label`), el texto gris del pie tiene poco contraste y no hay estilo de foco visible para quien navega con teclado. Ayuda a personas con discapacidad y suma en Google.

8. **Página «Para tiendas» (cómo aparecer en Kit Finder)**. *Media*.
   Ahora las tiendas solo pueden escribir al correo. Una página que explique qué tiendas entran y qué datos hacen falta ahorra correos y atrae tiendas nuevas.

9. **FAQ general**. *Media*.
   Existe «Why Kit Finder?» y las páginas de clubes tienen FAQ, pero no hay una FAQ de la web: ¿vendéis vosotros?, ¿las camisetas son originales?, ¿quién hace el envío?, ¿cobráis comisión? Da confianza y puede salir en Google con datos estructurados.

## Prioridad baja (rápidas)

10. **Iconos que faltan**. *Rápida*.
    `/favicon.ico` en la raíz devuelve la portada en HTML (los navegadores lo piden por defecto). Tampoco hay `apple-touch-icon` (el icono al guardar la web en el móvil) ni `manifest`.

11. **Blog sin metadatos al compartir ni favicon**. *Rápida*.
    `/blog` y su artículo no tienen `og:image`, `og:title` ni favicon: al compartirlos en redes sale una tarjeta pobre.

12. **Enlace de correo del pie**. *Rápida*.
    En el repo, el icono de email del pie apunta a `/cdn-cgi/l/email-protection#…`, que es la versión ya ofuscada por Cloudflare y copiada al HTML. Funciona en producción, pero no en local ni en los previews. Mejor un `mailto:` normal: Cloudflare lo protege solo.

13. **Cabeceras de seguridad**. *Rápida (sin CSP) / Larga (con CSP)*.
    Solo están `nosniff` y `referrer-policy`. Un archivo `_headers` con HSTS (obliga a usar siempre https), `X-Frame-Options` y `Permissions-Policy` es fácil. La política de contenidos (CSP) requiere más pruebas.

## Ya está bien (no hace falta tocarlo)

- `robots.txt` con el sitemap, y `sitemap.xml` sin redirecciones.
- Open Graph y Twitter en la portada y en las páginas de clubes y equipos.
- Datos estructurados `Organization` y `WebSite` con buscador, y el correo de contacto.
- Enlaces a Instagram y X en el pie.
- Mensaje de «No shirts found» cuando una búsqueda no tiene resultados. Mejora opcional: sugerir búsquedas parecidas.
- Aviso de afiliados en todas las páginas (PR del aviso en el pie).
