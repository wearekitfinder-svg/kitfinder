/* Netlify Function: Classic Football Shirts — static JSON reader
   Reads pre-built data/cfs.json instead of downloading CSVs on every request
   Usage: /.netlify/functions/cfs?q=arsenal
   Format: each product is an array [id, name, brand, season, condition, price, sizes, img, slug, type] */

const BASE_URL = 'https://www.classicfootballshirts.co.uk/';
const IMG_BASE = 'https://www.classicfootballshirts.co.uk/cdn-cgi/image/w=360,h=360,q=100,f=webp/pub/media/catalog/product/';
const AFFILIATE_SUFFIX = '?ref=mjk5njr&utm_source=Affiliates&utm_medium=referral&utm_campaign=Tapfiliate';

// In-memory cache so we only read the JSON file once per function instance
let _cache = null;

function loadData() {
  if (_cache) return _cache;
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../../data/cfs.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  _cache = JSON.parse(raw);
  return _cache;
}

function matchesQuery(name, terms) {
  const hay = name.toLowerCase();
  return terms.every(function(t) { return hay.includes(t); });
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
      // p = [id, name, brand, season, condition, price, sizes, img, slug, type]
      const name = p[1];
      if (!matchesQuery(name, terms)) continue;
      const slug = p[8];
      if (seen.has(slug)) continue;
      seen.add(slug);

      const image = p[7] ? IMG_BASE + p[7] : null;
      const url = BASE_URL + slug + AFFILIATE_SUFFIX;

      products.push({
        id: p[0],
        name: name,
        club: name,
        brand: p[2],
        season: p[3],
        condition: p[4],
        price: p[5],
        currency: 'GBP',
        sizes: p[6],
        image: image,
        images: image ? [image] : [],
        url: url,
        store: 'Classic Football Shirts',
        feedType: p[9] === 'c' ? 'classic' : 'new'
      });

      if (products.length >= 400) break;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: products, total: products.length, query: q })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, query: q })
    };
  }
};
