/* Cloudflare Pages Function: classic-shirts.com scraper
   Equivalent to netlify/functions/classicshirts.js
   Route: /functions/classicshirts */

function decodeHtml(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n, 10)));
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
  const q    = (url.searchParams.get('q') || '').trim();
  const page = parseInt(url.searchParams.get('page') || '1', 10);

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query parameter: q' }), { status: 400, headers: corsHeaders });
  }

  try {
    const fetchUrl = `https://classic-shirts.com/search.php?text=${encodeURIComponent(q)}&page=${page}`;
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Referer': 'https://classic-shirts.com/',
      },
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();

    let products = [];
    const imgMap  = {};
    const imgsMap = {};

    const dataImgsRegex = /data-product[_-]id="(\d+)"[^>]*data-(?:images|photos|gallery)='([^']+)'/g;
    let dataImgsMatch;
    while ((dataImgsMatch = dataImgsRegex.exec(html)) !== null) {
      try {
        const pid  = dataImgsMatch[1];
        const imgs = JSON.parse(dataImgsMatch[2]);
        if (Array.isArray(imgs) && imgs.length > 0) {
          imgsMap[pid] = imgs.map(u => u.startsWith('http') ? u : ('https://classic-shirts.com/' + u.replace(/^\//, '')));
          imgMap[pid]  = imgsMap[pid][0];
        }
      } catch(e) {}
    }

    const productBlockRegex = /data-product[_-]id="(\d+)"([\s\S]{0,3000}?)(?=data-product[_-]id="|$)/g;
    let blockMatch;
    while ((blockMatch = productBlockRegex.exec(html)) !== null) {
      const pid   = blockMatch[1];
      const block = blockMatch[2];
      if (imgsMap[pid]) continue;
      const foundImgs = [];
      const srcsetRe = /srcset="([^"]+)"/g;
      let sm;
      while ((sm = srcsetRe.exec(block)) !== null) {
        const src = sm[1].split(',')[0].trim().split(' ')[0];
        if (src && !src.includes('logo') && !src.includes('spinner')) {
          const full = src.startsWith('http') ? src : ('https://classic-shirts.com/' + src.replace(/^\//, ''));
          if (!foundImgs.includes(full)) foundImgs.push(full);
        }
      }
      const srcRe = /<img[^>]+src="([^"]+)"/g;
      while ((sm = srcRe.exec(block)) !== null) {
        const src = sm[1];
        if (src && !src.includes('logo') && !src.includes('spinner') && !src.includes('blank') &&
            (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))) {
          const full = src.startsWith('http') ? src : ('https://classic-shirts.com/' + src.replace(/^\//, ''));
          if (!foundImgs.includes(full)) foundImgs.push(full);
        }
      }
      if (foundImgs.length > 0) { imgsMap[pid] = foundImgs; imgMap[pid] = foundImgs[0]; }
    }

    const imgRegex1 = /data-product-id="(\d+)"[^>]*>\s*<picture><source[^>]*srcset="([^"]+)"/g;
    let imgMatch;
    while ((imgMatch = imgRegex1.exec(html)) !== null) {
      const pid = imgMatch[1];
      if (!imgMap[pid]) {
        const firstSrc = imgMatch[2].split(',')[0].trim().split(' ')[0];
        imgMap[pid] = firstSrc.startsWith('http') ? firstSrc : ('https://classic-shirts.com/' + firstSrc.replace(/^\//, ''));
      }
    }

    if (Object.keys(imgMap).length === 0) {
      const imgRegex2 = /data-product[_-]id="(\d+)"[\s\S]{0,800}?<img[^>]+src="([^"]+)"/g;
      while ((imgMatch = imgRegex2.exec(html)) !== null) {
        const pid = imgMatch[1]; const src = imgMatch[2];
        if (!imgMap[pid]) imgMap[pid] = src.startsWith('http') ? src : ('https://classic-shirts.com/' + src.replace(/^\//, ''));
      }
    }

    const productRegex1 = /data-product_id="(\d+)".*?href="(\/product-eng-[^"]+)"[^>]*title="([^"]+)".*?class="price --main">(£[\d,.]+)/gs;
    let match;
    while ((match = productRegex1.exec(html)) !== null) {
      const pid = match[1]; const path = match[2]; const title = match[3]; const price = match[4];
      const priceNum = parseFloat(price.replace('£', '').replace(/,/g, ''));
      if (!priceNum || priceNum <= 0) continue;
      products.push({
        id: 'cs_' + pid, title: decodeHtml(title.trim()),
        url: 'https://classic-shirts.com' + path,
        price: priceNum, currency: 'GBP',
        image: imgMap[pid] || '', images: imgsMap[pid] || (imgMap[pid] ? [imgMap[pid]] : []),
        store: 'classic-shirts.com', storeName: 'Classic Shirts',
      });
    }

    if (products.length === 0) {
      const productRegex2 = /data-product-id="(\d+)"[\s\S]*?href="(\/product-eng-[^"]+)"[^>]*?(?:title|aria-label)="([^"]+)"[\s\S]*?(?:£|GBP\s*)([\d,.]+)/g;
      while ((match = productRegex2.exec(html)) !== null) {
        const pid = match[1]; const path = match[2]; const title = match[3]; const price = match[4];
        const priceNum = parseFloat(price.replace(/,/g, ''));
        if (!priceNum || priceNum <= 0) continue;
        products.push({
          id: 'cs_' + pid, title: decodeHtml(title.trim()),
          url: 'https://classic-shirts.com' + path,
          price: priceNum, currency: 'GBP',
          image: imgMap[pid] || '', images: imgsMap[pid] || (imgMap[pid] ? [imgMap[pid]] : []),
          store: 'classic-shirts.com', storeName: 'Classic Shirts',
        });
      }
    }

    if (products.length === 0) {
      const linkRegex = /<a[^>]+href="(\/product-eng-[^"]+)"[^>]*>([\s\S]{0,500}?)<\/a>/g;
      const seenUrls = new Set();
      let i = 0;
      while ((match = linkRegex.exec(html)) !== null && products.length < 60) {
        const path = match[1]; const inner = match[2];
        if (seenUrls.has(path)) continue;
        seenUrls.add(path);
        const titleMatch = inner.match(/(?:title|alt)="([^"]+)"/) || inner.match(/>([^<>]{8,120})</);
        const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : path.replace('/product-eng-', '').replace(/-/g, ' ');
        const after = html.substr(match.index, 2500);
        const priceMatch = after.match(/£\s*([\d,]+\.?\d*)/);
        if (!priceMatch) continue;
        const priceNum = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (!priceNum || priceNum <= 0) continue;
        const imgM = after.match(/<img[^>]+src="([^"]+)"/);
        const img = imgM ? (imgM[1].startsWith('http') ? imgM[1] : ('https://classic-shirts.com/' + imgM[1].replace(/^\//, ''))) : '';
        products.push({
          id: 'cs_loose_' + (i++), title,
          url: 'https://classic-shirts.com' + path,
          price: priceNum, currency: 'GBP',
          image: img, images: img ? [img] : [],
          store: 'classic-shirts.com', storeName: 'Classic Shirts',
        });
      }
    }

    const dedup = []; const seenU = new Set();
    for (const p of products) {
      if (!seenU.has(p.url)) { seenU.add(p.url); dedup.push(p); }
    }
    products = dedup;

    const totalMatch = html.match(/(\d+)\s*products?/i);
    const total = totalMatch ? parseInt(totalMatch[1]) : products.length;

    return new Response(
      JSON.stringify({ products, total, page, query: q }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, query: q }),
      { status: 500, headers: corsHeaders }
    );
  }
}
