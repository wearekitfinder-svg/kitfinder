/* Cloudflare Pages Function: WooCommerce proxy
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
  'https://oh20footballshirts.com',
  'https://backtothefootball.com',
  'https://www.magliecalciovintage.it',
  'https://footballworldgs.it',
  'https://www.arsijstore.com',
  'https://vintagemaillots.com',
  'https://kainkuno.id',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function tryFetch(url) {
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json', 'User-Agent': 'KitFinder/1.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error('status ' + resp.status);
  return resp;
}

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

  // Intentar primero v1, si falla intentar sin versión
  const endpoints = [
    store + '/wp-json/wc/store/v1/products?per_page=100&page=' + page,
    store + '/wp-json/wc/store/products?per_page=100&page=' + page,
  ];

  let resp = null;
  let lastError = '';
  for (const ep of endpoints) {
    try {
      resp = await tryFetch(ep);
      break;
    } catch (e) {
      lastError = e.message;
    }
  }

  if (!resp) {
    return new Response(JSON.stringify({ error: lastError }), { status: 502, headers: corsHeaders });
  }

  try {
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
