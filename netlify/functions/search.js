/* Netlify Function: unified search — fetches gz catalogs from site public URLs */

const zlib  = require('zlib');
const https = require('https');

const SITE = 'https://wearekitfinder.com';
const URLS = {
  cfs:     SITE + '/data/cfs.json.gz',
  shopify: SITE + '/data/shopify.json.gz',
  woo:     SITE + '/data/woo.json.gz',
};
const BASE_CFS   = 'https://www.classicfootballshirts.co.uk/';
const IMG_BASE   = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/';
const AFF_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate';
const CACHE_TTL  = 30 * 60 * 1000;

const _cache = {};
const _cacheTime = {};

function fetchGz(url) {
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      const chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        zlib.gunzip(Buffer.concat(chunks), function(err, raw) {
          if (err) return reject(err);
          try { resolve(JSON.parse(raw.toString('utf8'))); }
          catch(e) { reject(e); }
        });
      });
    }).on('error', reject);
  });
}

async function load(key) {
  const now = Date.now();
  if (_cache[key] && (now - _cacheTime[key]) < CACHE_TTL) return _cache[key];
  _cache[key] = await fetchGz(URLS[key]);
  _cacheTime[key] = now;
  return _cache[key];
}

function matches(name, terms) {
  const h = name.toLowerCase();
  return terms.every(function(t) { return h.includes(t); });
}

// Extract fields handling both 7-field and 8-field formats
// 7-field: [id, name, price, currency, image, url, store]
// 8-field: [id, name, price, currency, sizes, image, url, store]
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

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const q     = (event.queryStringParameters.q || '').trim().toLowerCase();
  const store = event.queryStringParameters.store || 'all';
  const page  = parseInt(event.queryStringParameters.page || '0', 10);
  const limit = Math.min(parseInt(event.queryStringParameters.limit || '100', 10), 200);

  if (!q || q === 'warmup') {
    return { statusCode: 200, headers, body: JSON.stringify({ products: [], total: 0 }) };
  }

  const terms = q.split(/\s+/).filter(function(t) { return t.length >= 2; });
  if (!terms.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query too short' }) };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products, total: products.length, query: q })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
