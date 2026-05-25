/* Cloudflare Pages Function: Shopify proxy para tiendas sin CORS
   Route: /functions/shopify */

const ALLOWED_STORES = [
  'https://originalfootball.shop',
];

export async function onRequest(context) {
  const { request } = context;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: cors });
  }

  const url = new URL(request.url);
  const store = url.searchParams.get('store');
  const page = url.searchParams.get('page') || '1';

  if (!store) {
    return new Response(JSON.stringify({ error: 'Missing store param' }), { status: 400, headers: cors });
  }

  const storeClean = store.replace(/\/$/, '');
  if (!ALLOWED_STORES.includes(storeClean)) {
    return new Response(JSON.stringify({ error: 'Store not allowed' }), { status: 403, headers: cors });
  }

  try {
    const apiUrl = `${storeClean}/products.json?limit=250&page=${page}`;
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'KitFinder/1.0', 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ products: [], hasMore: false }), { headers: cors });
    }

    const data = await resp.json();
    const products = data.products || [];
    const hasMore = products.length === 250;

    return new Response(
      JSON.stringify({ products, hasMore }),
      { headers: cors }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
