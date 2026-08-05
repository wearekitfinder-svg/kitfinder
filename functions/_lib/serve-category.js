/* Helper compartido para servir /clubs/*, /leagues/*, /national/* sin la
   normalizacion automatica de barra final de Cloudflare Pages (que convierte
   /clubs/liverpool en un 308 hacia /clubs/liverpool/). Estandar elegido: SIN
   barra final, igual que ya usan sitemap.xml, el ItemList del home y todos
   los canonical existentes.

   Prefijado con "_" (functions/_lib/) para que Cloudflare Pages Functions no
   lo trate como una ruta propia - solo se importa desde los archivos
   [[path]].js de cada categoria. Ver SEO_PROGRESS.md. */

export async function serveCategoryNoTrailingSlash(context, categoryRoot) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Cualquier variante con barra final -> 301 limpio a la version sin barra
  // (una sola URL debe ganar; la otra no debe devolver 200 tambien).
  if (path === categoryRoot + "/") {
    return Response.redirect(new URL(categoryRoot + url.search, url).toString(), 301);
  }
  if (path.startsWith(categoryRoot + "/") && path.endsWith("/")) {
    const target = path.slice(0, -1);
    return Response.redirect(new URL(target + url.search, url).toString(), 301);
  }

  // Version sin barra (la que ve el cliente): internamente hay que pedirle
  // al binding ASSETS la ruta CON barra (".../slug/"), que es su forma
  // "limpia" para directorios. Pedir ".../slug/index.html" explicito NO
  // funciona: ASSETS.fetch aplica la misma normalizacion de "URL limpia"
  // que ya vimos en /why (quita el nombre de archivo "index.html" y
  // redirige 308 hacia la forma con barra) - probado empiricamente antes
  // de fijar este enfoque. La forma con barra es la unica que ASSETS.fetch
  // devuelve directa, sin redirigir.
  const assetUrl = new URL(url.toString());
  assetUrl.pathname = path === categoryRoot ? categoryRoot + "/" : path + "/";

  const assetReq = new Request(assetUrl, context.request);
  return context.env.ASSETS.fetch(assetReq);
}
