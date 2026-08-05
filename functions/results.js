/* Cloudflare Pages Function: /results
   Sirve el index.html real de la SPA directamente (200), sin pasar por el
   rewrite "200" de _redirects hacia /index.html. Ese rewrite disparaba la
   normalizacion automatica de URLs limpias de Cloudflare Pages (que
   redirige /index.html -> / con un 308 real), asi que Google veia esta
   ruta como "Pagina con redireccion" en vez de un 200 directo. Mismo
   patron que functions/why.js y functions/long-sleeve-kits.js, pero sin
   reescribir el <head> (esta ruta no necesita meta unico). Ver
   SEO_PROGRESS.md. */

export async function onRequestGet(context) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/";
  return context.env.ASSETS.fetch(new Request(assetUrl, context.request));
}
