/* Netlify Function: Classic Football Shirts — reads cfs.json.gz */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const BASE_CFS  = 'https://www.classicfootballshirts.co.uk/';
const IMG_BASE  = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/';
const AFF_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate';

let _cache = null;

function loadData() {
  if (_cache) return _cache;
const filePath = path.join(__dirname, 'data/cfs.json.gz');
const filePath = path.join(__dirname, 'data/cfs.json.gz');  const raw = zlib.gunzipSync(compressed).toString('utf8');
  _cache = JSON.parse(raw);
  return _cache;
}

function matches(name, terms) {
  const h = name.toLowerCase();
  return terms.every(function(t) { return h.includes(t); });
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

  if (!q || q === 'warmup') {
    return { statusCode: 200, headers, body: JSON.stringify({ products: [], total: 0 }) };
  }

  const terms = q.split(/\s+/).filter(function(t) { return t.length >= 2; });
  if (!terms.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query too short' }) };
  }

  try {
    const data = loadData();
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
        store: 'Classic Football Shirts',
        source: 'cfs', isShopify: false
      });
      if (products.length >= 400) break;
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
      body: JSON.stringify({ error: err.message, query: q })
    };
  }
};
