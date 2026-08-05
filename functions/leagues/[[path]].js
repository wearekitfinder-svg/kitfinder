/* Cloudflare Pages Function: /leagues y /leagues/* (hub + 4 landing pages).
   Ver functions/_lib/serve-category.js y SEO_PROGRESS.md. */
import { serveCategoryNoTrailingSlash } from "../_lib/serve-category.js";

export async function onRequest(context) {
  return serveCategoryNoTrailingSlash(context, "/leagues");
}
