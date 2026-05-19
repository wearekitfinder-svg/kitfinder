/* Cloudflare Pages Function: WooCommerce proxy
   Equivalent to netlify/functions/woo.js
   Route: /functions/woo */

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
  const store = (url.searchParams.get('store') || '').replace(/\/$/, '');
  const page  = parseInt(url.searchParams.get('page') || '1', 10);

  if (!ALLOWED_STORES.includes(store)) {
    return new Response(JSON.stringify({ error: 'Store not allowed' }), { status: 403, headers: corsHeaders });
  }

  const apiUrl = store + '/wp-json/wc/store/v1/products?per_page=100&page=' + page;

  try {
    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'KitFinder/1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Store returned ' + resp.status }), { status: resp.status, headers: corsHeaders });
    }

    const data = await resp.json();
    const total      = resp.headers.get('X-WP-Total') || '0';
    const totalPages = resp.headers.get('X-WP-TotalPages') || '1';

    return new Response(
      JSON.stringify({ products: data, total: parseInt(total), totalPages: parseInt(totalPages) }),
      { headers: corsHeaders }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}
