/* Netlify Function: WooCommerce Store API proxy
   Bypasses CORS restrictions by fetching from server-side.
   Usage: /.netlify/functions/woo?store=https://kickback.pl&page=1 */

const ALLOWED_STORES = [
  'https://retrocalcioshirts.com',
  'https://www.rb-jerseys.com',
  'https://footballlegendskits.com',
  'https://footballthrift.shop',
  'https://kickback.pl',
  'https://thethirdkit.co.uk',
  'https://historicfootballshirts.co.uk',
  'https://footballsecondhand.com',
  'https://valdevintage.com',
  'https://nr10.store',
  'https://www.kitroomfootball.com',
  'https://thefootballtimecapsule.com',
  'https://goalmarkt.com',
];

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  const store = (event.queryStringParameters.store || '').replace(/\/$/, '');
  const page  = parseInt(event.queryStringParameters.page || '1', 10);

  // Validate store is in allow-list
  if (!ALLOWED_STORES.includes(store)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Store not allowed' }) };
  }

  const url = store + '/wp-json/wc/store/v1/products?per_page=100&page=' + page;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'KitFinder/1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) {
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: 'Store returned ' + resp.status }) };
    }

    const data = await resp.json();
    const total = resp.headers.get('X-WP-Total') || '0';
    const totalPages = resp.headers.get('X-WP-TotalPages') || '1';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: data, total: parseInt(total), totalPages: parseInt(totalPages) }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
