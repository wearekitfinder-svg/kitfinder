/* Netlify Function: Classic Football Shirts feed reader
   Reads the official CSV product feeds (Classics + Brand New)
   Usage: /.netlify/functions/cfs?q=arsenal
   Returns products matching the query from both feeds */

const FEED_CLASSICS = 'https://storage.googleapis.com/cfs_data_feeds/awin/live/awin_classics.csv';
const FEED_NEW      = 'https://storage.googleapis.com/cfs_data_feeds/awin/live/awin_new.csv';
const AFFILIATE_ID  = 'mjk5njr';

// Simple CSV parser (handles quoted fields with commas inside)
function parseCSV(text) {
  const lines = text.split('\n');
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row = {};
    headers.forEach(function(h, idx) {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function addAffiliate(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('ref', AFFILIATE_ID);
    u.searchParams.set('utm_source', 'Affiliates');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', 'Tapfiliate');
    return u.toString();
  } catch(e) {
    return url;
  }
}

function rowToProduct(row, feedType) {
  const name  = row['name'] || '';
  const price = parseFloat(row['current_price_GBP']) || 0;
  const url   = row['child_url'] || row['parent_url'] || '';
  const image = row['product_image'] || row['parent_image'] || '';
  const team  = row['team'] || '';
  const brand = row['brand'] || '';
  const season = row['seasons'] || '';
  const condition = row['condition'] || '';
  const size   = row['size'] || '';

  if (!name || price <= 0 || !url) return null;

  // Normalise size to standard labels
  const sizeMap = { 'XS': 'XS', 'S': 'S', 'M': 'M', 'L': 'L', 'XL': 'XL', 'XXL': 'XXL', 'XXXL': 'XXXL', '2XL': 'XXL', '3XL': 'XXXL' };
  const normSize = sizeMap[size.toUpperCase()] || (size ? size : '');
  const sizes = normSize ? [normSize] : ['One size'];

  const id = 'cfs_' + feedType + '_' + Buffer.from(url).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');

  return {
    id:        id,
    name:      name,
    club:      name,
    team:      team,
    brand:     brand,
    season:    season,
    condition: condition,
    price:     price,
    currency:  'GBP',
    sizes:     sizes,
    image:     image,
    images:    image ? [image] : [],
    url:       addAffiliate(url),
    store:     'Classic Football Shirts',
    feedType:  feedType  // 'classic' or 'new'
  };
}

async function fetchFeed(feedUrl) {
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'KitFinder/1.0' }
  });
  if (!res.ok) throw new Error('Feed error: ' + res.status);
  return await res.text();
}

function matchesQuery(row, terms) {
  const haystack = [
    row['name'] || '',
    row['team'] || '',
    row['brand'] || '',
    row['seasons'] || '',
    row['style'] || '',
    row['colour'] || ''
  ].join(' ').toLowerCase();

  return terms.every(function(term) {
    return haystack.includes(term);
  });
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

  // Warmup call — just return OK without fetching feeds
  if (!q || q === 'warmup') {
    return { statusCode: 200, headers, body: JSON.stringify({ products: [], total: 0 }) };
  }

  // Split query into individual words for multi-term matching
  const terms = q.split(/\s+/).filter(function(t) { return t.length >= 2; });

  if (!terms.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Query too short' }) };
  }

  try {
    // Fetch both feeds in parallel
    const [classicsText, newText] = await Promise.all([
      fetchFeed(FEED_CLASSICS),
      fetchFeed(FEED_NEW)
    ]);

    const classicsRows = parseCSV(classicsText);
    const newRows      = parseCSV(newText);

    const products = [];
    const seen = new Set();

    // Process classics feed
    for (const row of classicsRows) {
      if (!matchesQuery(row, terms)) continue;
      const p = rowToProduct(row, 'classic');
      if (!p || seen.has(p.url)) continue;
      seen.add(p.url);
      products.push(p);
      if (products.length >= 200) break;
    }

    // Process new feed
    for (const row of newRows) {
      if (!matchesQuery(row, terms)) continue;
      const p = rowToProduct(row, 'new');
      if (!p || seen.has(p.url)) continue;
      seen.add(p.url);
      products.push(p);
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
