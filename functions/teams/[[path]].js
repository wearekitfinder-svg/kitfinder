/* Cloudflare Pages Function: /teams y /teams/* (hub + 159 landing pages).
   Mismo patron que functions/leagues/[[path]].js y functions/national/[[path]].js
   (ver functions/_lib/serve-category.js). /teams/ se añadio mas tarde (14/09)
   y se quedo sin este Function: cada URL de /teams/<slug> tal como aparece
   en el sitemap (sin barra final) devolvia un 308 hacia /teams/<slug>/ en
   vez de 200 directo -- confirmado con auditoria real de las 210 URLs del
   sitemap (scripts/audit_sitemap_seo.py): 160 de 160 redirecciones eran
   de /teams/, 0 de /clubs, /national o /leagues. Ver SEO_PROGRESS.md. */
import { serveCategoryNoTrailingSlash } from "../_lib/serve-category.js";

export async function onRequest(context) {
  return serveCategoryNoTrailingSlash(context, "/teams");
}
