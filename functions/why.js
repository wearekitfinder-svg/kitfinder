/* Cloudflare Pages Function: /why
   Mismo patron que functions/long-sleeve-kits.js: sirve el SPA real con
   <head> reescrito para esta ruta. Ver SEO_PROGRESS.md.
   Ademas deja el HTML ya en la vista /why (portada oculta, #info-why visible:
   el mismo estado que pone showInfo('why') en info.js) y anade enlaces
   internos, para que el texto del HTML sea el de /why y no el de la portada. */

import { applyView } from "./_lib/spa-view.js";

const META = {
  title: "Why Kit Finder? — The World's First Football Shirt Search Engine",
  description: "Kit Finder searches 250+ specialist stores and 350,000+ vintage, retro and classic football shirts in real time. Search by photo, compare prices, 100% authentic.",
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

// Enlaces internos al final de #info-why (solo en la URL /why; mismo estilo de texto).
const LINKS_HTML = `
      <h2>Explore Kit Finder</h2>
      <p>Start with the shirts collectors search for most: browse vintage kits by <a href="/clubs" style="color:#178a55;">club</a>, by <a href="/national" style="color:#178a55;">national team</a> or by <a href="/leagues" style="color:#178a55;">league</a>, see <a href="/teams" style="color:#178a55;">every team A-Z</a>, or jump straight to <a href="/long-sleeve-kits" style="color:#178a55;">long sleeve football shirts</a>. Popular pages: <a href="/clubs/manchester-united" style="color:#178a55;">Manchester United</a>, <a href="/clubs/real-madrid" style="color:#178a55;">Real Madrid</a>, <a href="/clubs/ac-milan" style="color:#178a55;">AC Milan</a>, <a href="/national/england" style="color:#178a55;">England</a> and <a href="/leagues/premier-league" style="color:#178a55;">Premier League</a> shirts. For guides and collecting stories, read the <a href="/blog" style="color:#178a55;">Kit Finder blog</a>.</p>`;

export async function onRequestGet(context) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/";
  const originResponse = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));

  const rewriter = applyView(new HTMLRewriter(), { "info-page": "flex" });
  return rewriter
    .on("#info-why", {
      element(el) {
        el.setAttribute("class", "info-section active");
        el.append(LINKS_HTML, { html: true });
      }
    })
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
