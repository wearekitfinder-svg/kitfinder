/* Cloudflare Pages Function: unified search
   Equivalent to netlify/functions/search.js
   Route: /functions/search */

const SITE = 'https://wearekitfinder.com';
const URLS = {
  cfs:     SITE + '/data/cfs.json.gz',
  shopify: SITE + '/data/shopify.json.gz',
  woo:     SITE + '/data/woo.json.gz',
};

const BASE_CFS  = 'https://www.classicfootballshirts.co.uk/';
const IMG_BASE  = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/';
const AFF_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate';

// Cache en memoria (dura mientras el Worker esté activo, ~30 min)
const CACHE_TTL = 30 * 60 * 1000;
const _cache = {};
const _cacheTime = {};

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

async function load(key) {
  const now = Date.now();
  if (_cache[key] && (now - _cacheTime[key]) < CACHE_TTL) return _cache[key];
  _cache[key] = await fetchGz(URLS[key]);
  _cacheTime[key] = now;
  return _cache[key];
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

function parseProduct(p) {
  const len = p.length;
  if (len >= 8) {
    return { id: p[0], name: p[1], price: p[2], currency: p[3], sizes: p[4], image: p[5], url: p[6], store: p[7] };
  } else {
    return { id: p[0], name: p[1], price: p[2], currency: p[3], sizes: ['One size'], image: p[4], url: p[5], store: p[6] };
  }
}

function searchCFS(data, terms, limit, page) {
  const results = [];
  const seen = new Set();
  let skip = page * limit;
  for (const p of data.p) {
    if (!matches(p[1], terms)) continue;
    if (seen.has(p[8])) continue;
    seen.add(p[8]);
    if (skip-- > 0) continue;
    const image = p[7] ? IMG_BASE + p[7] : null;
    results.push({
      id: p[0], name: p[1], club: p[1],
      brand: p[2], season: p[3], condition: p[4],
      price: p[5], currency: 'GBP', storeCurrency: 'GBP',
      sizes: p[6], image, images: image ? [image] : [],
      url: BASE_CFS + p[8] + AFF_SUFFIX,
      store: 'Classic Football Shirts', source: 'cfs', isShopify: false
    });
    if (results.length >= limit) break;
  }
  return results;
}

function searchShopify(data, terms, limit, page) {
  const results = [];
  const seen = new Set();
  let skip = page * limit;
  for (const p of data.p) {
    if (!matches(p[1], terms)) continue;
    const parsed = parseProduct(p);
    if (seen.has(parsed.url)) continue;
    seen.add(parsed.url);
    if (skip-- > 0) continue;
    results.push({
      id: parsed.id, name: parsed.name, club: parsed.name,
      price: parsed.price, currency: parsed.currency, storeCurrency: parsed.currency,
      sizes: Array.isArray(parsed.sizes) ? parsed.sizes : ['One size'],
      image: parsed.image, images: parsed.image ? [parsed.image] : [],
      url: parsed.url, store: parsed.store, source: 'shopify', isShopify: true
    });
    if (results.length >= limit) break;
  }
  return results;
}

function searchWoo(data, terms, limit, page) {
  const results = [];
  const seen = new Set();
  let skip = page * limit;
  for (const p of data.p) {
    if (!matches(p[1], terms)) continue;
    const parsed = parseProduct(p);
    if (seen.has(parsed.url)) continue;
    seen.add(parsed.url);
    if (skip-- > 0) continue;
    results.push({
      id: parsed.id, name: parsed.name, club: parsed.name,
      price: parsed.price, currency: parsed.currency, storeCurrency: parsed.currency,
      sizes: Array.isArray(parsed.sizes) ? parsed.sizes : ['One size'],
      image: parsed.image, images: parsed.image ? [parsed.image] : [],
      url: parsed.url, store: parsed.store, source: 'woo', isShopify: false
    });
    if (results.length >= limit) break;
  }
  return results;
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
  const q      = (url.searchParams.get('q') || '').trim().toLowerCase();
  const store  = url.searchParams.get('store') || 'all';
  const page   = parseInt(url.searchParams.get('page') || '0', 10);
  const limit  = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);

  if (!q || q === 'warmup') {
    return new Response(JSON.stringify({ products: [], total: 0 }), { headers: corsHeaders });
  }

  const terms = q.split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) {
    return new Response(JSON.stringify({ error: 'Query too short' }), { status: 400, headers: corsHeaders });
  }

  try {
    let products = [];

    if (store === 'cfs') {
      const data = await load('cfs');
      products = searchCFS(data, terms, limit, page);
    } else if (store === 'shopify') {
      const data = await load('shopify');
      products = searchShopify(data, terms, limit, page);
    } else if (store === 'woo') {
      const data = await load('woo');
      products = searchWoo(data, terms, limit, page);
    } else {
      const [cfsData, shopData, wooData] = await Promise.all([
        load('cfs'), load('shopify'), load('woo')
      ]);
      products = [
        ...searchCFS(cfsData, terms, 200, page),
        ...searchShopify(shopData, terms, 200, page),
        ...searchWoo(wooData, terms, 100, page),
      ];
    }

    return new Response(
      JSON.stringify({ products, total: products.length, query: q }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
