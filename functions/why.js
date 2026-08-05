/* Cloudflare Pages Function: /why
   Mismo patron que functions/long-sleeve-kits.js: sirve el SPA real con
   <head> reescrito para esta ruta. Ver SEO_PROGRESS.md. */

const META = {
  title: "Why Kit Finder? — The World's First Football Shirt Search Engine",
  description: "Kit Finder searches 150+ specialist stores and 325,000+ vintage, retro and classic football shirts in real time. Search by photo, compare prices, 100% authentic.",
  keywords: "why kit finder, football shirt search engine, vintage football shirt finder, football shirt price comparison, football shirt photo search",
  canonical: "https://wearekitfinder.com/why",
  ogImage: "https://wearekitfinder.com/images/og-image.jpg"
};

const JSONLD = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Why Kit Finder?",
  "description": ${JSON.stringify(META.description)},
  "url": "${META.canonical}",
  "isPartOf": {"@type":"WebSite","name":"Kit Finder","url":"https://wearekitfinder.com"},
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Kit Finder","item":"https://wearekitfinder.com"},
      {"@type":"ListItem","position":2,"name":"Why Kit Finder?","item":"${META.canonical}"}
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
