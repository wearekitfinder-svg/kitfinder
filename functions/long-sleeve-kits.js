/* Cloudflare Pages Function: /long-sleeve-kits
   Sirve el SPA real (index.html, con app.js/auth.js/info.js intactos) pero
   reescribe el <head> con meta/OG/JSON-LD propios de esta ruta, para no
   sacrificar interactividad a cambio de SEO. Ver SEO_PROGRESS.md. */

const META = {
  title: "Long Sleeve Football Shirts — Vintage & Retro Kits | Kit Finder",
  description: "Search vintage and retro long sleeve football shirts across 200+ specialist stores. Classic winter kits from every club, era and size, all in one search.",
  keywords: "long sleeve football shirts, vintage long sleeve jersey, retro long sleeve kit, l/s football shirt, long sleeve soccer jersey, classic long sleeve football top",
  canonical: "https://wearekitfinder.com/long-sleeve-kits",
  ogImage: "https://wearekitfinder.com/images/og-image.jpg"
};

const JSONLD = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${META.title.split(' | ')[0]}",
  "description": ${JSON.stringify(META.description)},
  "url": "${META.canonical}",
  "isPartOf": {"@type":"WebSite","name":"Kit Finder","url":"https://wearekitfinder.com"},
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Kit Finder","item":"https://wearekitfinder.com"},
      {"@type":"ListItem","position":2,"name":"Long Sleeve Kits","item":"${META.canonical}"}
    ]
  }
}
</script>`;

export async function onRequestGet(context) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/";
  const originResponse = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));

  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(META.title); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute("content", META.description); } })
    .on('meta[name="keywords"]', { element(el) { el.setAttribute("content", META.keywords); } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute("href", META.canonical); } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute("content", META.title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", META.description); } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute("content", META.canonical); } })
    .on('meta[property="og:image"]', { element(el) { el.setAttribute("content", META.ogImage); } })
    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute("content", META.title); } })
    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute("content", META.description); } })
    .on('meta[name="twitter:image"]', { element(el) { el.setAttribute("content", META.ogImage); } })
    .on("head", { element(el) { el.append(JSONLD, { html: true }); } })
    .transform(originResponse);
}
