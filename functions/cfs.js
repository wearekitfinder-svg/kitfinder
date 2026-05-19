/* Cloudflare Pages Function: Classic Football Shirts
   Equivalent to netlify/functions/cfs.js
   Route: /functions/cfs */

const DATA_URL  = 'https://wearekitfinder.com/data/cfs.json.gz';
const BASE_CFS  = 'https://www.classicfootballshirts.co.uk/';
const IMG_BASE  = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/';
const AFF_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate';

const CACHE_TTL = 30 * 60 * 1000;
let _cache = null;
let _cacheTime = 0;

async function fetchGz(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch ' + url);
  const buf = await resp.arrayBuffer();
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(buf));
  writer.close();
  const reader = ds.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return JSON.parse(new TextDecoder().decode(out));
}

async function loadData() {
  const now = Date.now();
  if (_cache && (now - _cacheTime) < CACHE_TTL) return _cache;
  _cache = await fetchGz(DATA_URL);
  _cacheTime = now;
  return _cache;
}

const ALIASES = {
  'psg':        ['paris saint-germain','paris sg'],
  'man utd':    ['manchester united'],
  'man united': ['manchester united'],
  'man city':   ['manchester city'],
  'atletico':   ['atletico madrid','atletico de madrid'],
  'inter':      ['inter milan','internazionale'],
  'inter milan':['internazionale'],
  'juve':       ['juventus'],
  'barca':      ['barcelona','fc barcelona'],
  'bvb':        ['borussia dortmund','dortmund'],
  'dortmund':   ['borussia dortmund'],
  'spurs':      ['tottenham','tottenham hotspur'],
  'wolves':     ['wolverhampton'],
  'forest':     ['nottingham forest'],
  'brasil':     ['brazil'],
  'espana':     ['spain'],
  'alemania':   ['germany','deutschland'],
  'francia':    ['france'],
  'holanda':    ['netherlands','holland'],
};

function expandTerm(t) {
  const lo = t.toLowerCase();
  return ALIASES[lo] ? [lo].concat(ALIASES[lo]) : [lo];
}

function matches(name, terms) {
  const h = name.toLowerCase();
  return terms.every(t => expandTerm(t).some(alias => h.includes(alias)));
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  if (!q || q === 'warmup') {
    return new Response(JSON.stringify({ products: [], total: 0 }), { headers: corsHeaders });
  }

  const terms = q.split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) {
    return new Response(JSON.stringify({ error: 'Query too short' }), { status: 400, headers: corsHeaders });
  }

  try {
    const data = await loadData();
    const products = [];
    const seen = new Set();

    for (const p of data.p) {
      if (!matches(p[1], terms)) continue;
      if (seen.has(p[8])) continue;
      seen.add(p[8]);
      const image = p[7] ? IMG_BASE + p[7] : null;
      products.push({
        id: p[0], name: p[1], club: p[1],
        brand: p[2], season: p[3], condition: p[4],
        price: p[5], currency: 'GBP', storeCurrency: 'GBP',
        sizes: p[6], image, images: image ? [image] : [],
        url: BASE_CFS + p[8] + AFF_SUFFIX,
        store: 'Classic Football Shirts', source: 'cfs', isShopify: false
      });
      if (products.length >= 400) break;
    }

    return new Response(
      JSON.stringify({ products, total: products.length, query: q }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, query: q }),
      { status: 500, headers: corsHeaders }
    );
  }
}
