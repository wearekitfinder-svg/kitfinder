/* Netlify Function: search — reads pre-built gzip JSON catalogs
   Usage: /.netlify/functions/search?q=arsenal&store=all|cfs|shopify|woo
   Returns matching products from static JSON files */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '../../data');
const BASE_CFS = 'https://www.classicfootballshirts.co.uk/';
const IMG_BASE = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/';
const AFF_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate';

// In-memory cache per catalog
const _cache = {};

function loadGz(filename) {
  if (_cache[filename]) return _cache[filename];
  const filePath = path.join(DATA_DIR, filename);
  const compressed = fs.readFileSync(filePath);
  const raw = zlib.gunzipSync(compressed).toString('utf8');
  _cache[filename] = JSON.parse(raw);
  return _cache[filename];
}

function loadJson(filename) {
  if (_cache[filename]) return _cache[filename];
  const filePath = path.join(DATA_DIR, filename);
  _cache[filename] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return _cache[filename];
}

function matches(name, terms) {
  const h = name.toLowerCase();
  return terms.every(t => h.includes(t));
}

function searchCFS(terms, limit) {
  const data = loadJson('cfs.json');
  const results = [];
  const seen = new Set();
  for (const p of data.p) {
    if (!matches(p[1], terms)) continue;
    if (seen.has(p[8])) continue;
    seen.add(p[8]);
    const image = p[7] ? IMG_BASE + p[7] : null;
    results.push({
      id: p[0], name: p[1], club: p[1],
      brand: p[2], season: p[3], condition: p[4],
      price: p[5], currency: 'GBP', storeCurrency: 'GBP',
      sizes: p[6], image, images: image ? [image] : [],
      url: BASE_CFS + p[8] + AFF_SUFFIX,
      store: 'Classic Football Shirts',
      source: 'cfs', isShopify: false
    });
    if (results.length >= limit) break;
  }
  return results;
}

function searchShopify(terms, limit) {
  const data = loadGz('shopify.json.gz');
  const results = [];
  const seen = new Set();
  for (const p of data.p) {
    if (!matches(p[1], terms)) continue;
    if (seen.has(p[5])) continue;
    seen.add(p[5]);
    results.push({
      id: p[0], name: p[1], club: p[1],
      price: p[2], currency: p[3], storeCurrency: p[3],
      sizes: ['One size'], image: p[4], images: p[4] ? [p[4]] : [],
      url: p[5], store: p[6],
      source: 'shopify', isShopify: true
    });
    if (results.length >= limit) break;
  }
  return results;
}

function searchWoo(terms, limit) {
  const data = loadGz('woo.json.gz');
  const results = [];
  const seen = new Set();
  for (const p of data.p) {
    if (!matches(p[1], terms)) continue;
    if (seen.has(p[5])) continue;
    seen.add(p[5]);
    results.push({
      id: p[0], name: p[1], club: p[1],
      price: p[2], currency: p[3], storeCurrency: p[3],
      sizes: ['One size'], image: p[4], images: p[4] ? [p[4]] : [],
      url: p[5], store: p[6],
      source: 'woo', isShopify: false
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

  const q = (event.queryStringParameters.q || '').trim().toLowerCase();
  const store = event.queryStringParameters.store || 'all';

  if (!q || q === 'warmup') {
    return { statusCode: 200, headers, body: JSON.stringify({ products: [], total: 0 }) };
  }

  const terms = q.split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query too short' }) };
  }

  try {
    let products = [];
    if (store === 'cfs') {
      products = searchCFS(terms, 400);
    } else if (store === 'shopify') {
      products = searchShopify(terms, 400);
    } else if (store === 'woo') {
      products = searchWoo(terms, 400);
    } else {
      // all: merge results
      products = [
        ...searchCFS(terms, 200),
        ...searchShopify(terms, 200),
        ...searchWoo(terms, 100),
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
