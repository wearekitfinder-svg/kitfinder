/* Cloudflare Pages Function: Claude Vision proxy para búsqueda por imagen
   Equivalent to netlify/functions/vision.js
   Route: /functions/vision
   Necesita la variable de entorno ANTHROPIC_API_KEY en Cloudflare Pages */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // En Cloudflare, las variables de entorno se acceden via env.*
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); }
  catch(e) { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders }); }

  const { imageData, mediaType } = body;
  if (!imageData) {
    return new Response(JSON.stringify({ error: 'No image data' }), { status: 400, headers: corsHeaders });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData }
            },
            {
              type: 'text',
              text: `You are an expert in classic and modern football/soccer shirts. Analyze this photo carefully.

The photo may be:
- Cropped, partial, or showing only a portion of the shirt
- A close-up of details (sponsor, badge, sleeve, collar, fabric texture)
- Worn by someone, on a hanger, on a flat surface, or held up
- Low quality, blurry, or with bad lighting
- A historical or vintage piece from any era (1970s-present)

Even with limited visual information, use ALL clues you can find:
- Visible badge / crest (even partial)
- Sponsor logo (Parmalat, JVC, Carlsberg, Crown Paints, Sharp, Opel, etc.)
- Manufacturer logo (Adidas stripes, Nike swoosh, Umbro double-diamond, Kappa Omini, Kappa logo, Le Coq Sportif rooster, Hummel chevrons)
- Color combinations and patterns typical of certain teams/eras
- Collar style, fabric texture, cut (90s baggy vs modern slim)
- Any visible text or numbers

Be CONFIDENT about the team identification — make your best guess even if uncertain. It's better to give a likely team name than to leave it blank.

Reply ONLY with a JSON object (no markdown, no other text):
{
  "team": "best guess of team name (e.g. Arsenal, Barcelona, Brazil, Palmeiras, Parma)",
  "version": "home|away|third|goalkeeper or empty",
  "year": "year (1996) or season (1996-97 or 1996/97) or empty",
  "brand": "Adidas|Nike|Umbro|Kappa|Reebok|Hummel|etc or empty",
  "player": "player name printed on shirt if visible, or empty",
  "number": "shirt number if visible, or empty",
  "query": "best 3-5 word search query combining the above"
}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) || '';

    let parsed;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { query: text.trim() };
    } catch(e) {
      parsed = { query: text.trim().slice(0, 50) };
    }

    return new Response(JSON.stringify(parsed), { headers: corsHeaders });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
