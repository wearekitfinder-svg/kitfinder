/* Cloudflare Pages Function: /dashboard
   Dashboard interno de analytics (GA4 vía D1, servido por kitfinder-search).
   Sirve dashboard/index.html sin barra final. Mismo patrón que
   functions/shirt-checker.js — ver functions/_lib/serve-category.js. */
import { serveCategoryNoTrailingSlash } from "./_lib/serve-category.js";

export async function onRequest(context) {
  return serveCategoryNoTrailingSlash(context, "/dashboard");
}
