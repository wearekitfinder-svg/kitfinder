/* Cloudflare Pages Function: /long-sleeve-kits
   Sirve el SPA real (index.html, con app.js/auth.js/info.js intactos) pero
   reescribe el <head> con meta/OG/JSON-LD propios de esta ruta, para no
   sacrificar interactividad a cambio de SEO. Ver SEO_PROGRESS.md.
   Ademas deja el HTML ya en la vista de manga larga (portada oculta, #results
   y la cabecera #wcResultsHeader visibles: el mismo estado que ponen
   searchLongSleeve()/_showWcHeader() en app.js) y anade enlaces internos a
   equipos y ligas con camisetas de manga larga, para que el texto del HTML
   sea el de esta pagina y no el de la portada. */

import { applyView } from "./_lib/spa-view.js";

const META = {
  title: "Long Sleeve Football Shirts — Vintage & Retro Kits | Kit Finder",
  description: "Search vintage and retro long sleeve football shirts across 250+ specialist stores. Classic winter kits from every club, era and size, all in one search.",
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

// Equipos con mas camisetas de manga larga en el buscador (consulta publica
// /search?q=long sleeve y l/s, nov-2026) que tienen pagina propia, + ligas.
const LS_TEAMS = [
  ["Juventus", "/clubs/juventus"], ["Manchester United", "/clubs/manchester-united"],
  ["AC Milan", "/clubs/ac-milan"], ["Liverpool", "/clubs/liverpool"], ["Arsenal", "/clubs/arsenal"],
  ["Borussia Dortmund", "/clubs/borussia-dortmund"], ["Real Madrid", "/clubs/real-madrid"],
  ["Rangers", "/teams/rangers"], ["Manchester City", "/clubs/manchester-city"], ["AS Roma", "/teams/as-roma"],
  ["Barcelona", "/clubs/barcelona"], ["England", "/national/england"], ["Chelsea", "/clubs/chelsea"],
  ["Celtic", "/teams/celtic"], ["Bayern Munich", "/clubs/bayern-munich"]
];
const LS_LEAGUES = [
  ["Premier League", "/leagues/premier-league"], ["Serie A", "/leagues/serie-a"],
  ["Bundesliga", "/leagues/bundesliga"], ["La Liga", "/leagues/la-liga"]
];
const link = ([name, href]) => `<a href="${href}" style="color:#178a55;">${name}</a>`;
// Bloque de enlaces al final de los resultados (antes del pie), para no tocar
// la cabecera ni la rejilla de camisetas.
const LINKS_HTML = `<section class="kf-ls-links" style="max-width:1200px;margin:0 auto;padding:.5rem 1.5rem 2rem;width:100%;">
  <h2 style="font-size:16px;font-weight:600;color:#1e2530;margin-bottom:.5rem;">Long sleeve shirts by team and league</h2>
  <p style="font-size:14px;line-height:1.7;color:#5a6472;">Teams with the most long sleeve shirts on Kit Finder: ${LS_TEAMS.map(link).join(", ")}. Browse by league: ${LS_LEAGUES.map(link).join(", ")}, or see <a href="/teams" style="color:#178a55;">all teams A-Z</a>.</p>
</section>
`;

export async function onRequestGet(context) {
  const assetUrl = new URL(context.request.url);
  assetUrl.pathname = "/";
  const originResponse = await context.env.ASSETS.fetch(new Request(assetUrl, context.request));

  const rewriter = applyView(new HTMLRewriter(), {
    results: "flex", wcResultsHeader: "block", normalSearchBar: "none", sidebarBrandSection: "none"
  });
  return rewriter
    .on("#results footer.kf-foot", { element(el) { el.before(LINKS_HTML, { html: true }); } })
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
