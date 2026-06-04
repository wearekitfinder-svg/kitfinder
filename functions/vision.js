export async function onRequest(context) {
  const { request, env } = context;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: cors });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: cors });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: cors });
  }

  const { imageData, mediaType } = body;
  if (!imageData) {
    return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400, headers: cors });
  }

  const prompt = `You are an expert in football/soccer shirts from all eras and countries.

Analyze this image carefully. The shirt may be:
- Full or partial view, worn or laid flat
- Vintage (1970s-2000s) or modern
- Any quality or lighting

Use every clue available:
- Club badge or crest (even partial)
- Sponsor text (Sharp, Opel, JVC, Carlsberg, Parmalat, SEAT, Teka, etc.)
- Kit manufacturer (Adidas, Nike, Umbro, Kappa, Hummel, Le Coq Sportif, Reebok, etc.)
- Colors, patterns, collar style
- Player name or number if visible
- Era clues (fabric, cut, badge style)

Always give your best guess for the team — it is better to guess than leave blank.

Reply ONLY with a valid JSON object, no markdown, no explanation:
{
  "team": "team name (e.g. Arsenal, Real Madrid, Brazil)",
  "version": "home or away or third or goalkeeper or empty string",
  "year": "year like 1994 or season like 1994-95 or empty string",
  "brand": "manufacturer name or empty string",
  "player": "player name if printed on shirt or empty string",
  "number": "shirt number if visible or empty string",
  "query": "3-5 word search query combining the best clues"
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageData,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `Anthropic error ${res.status}`;
      return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: cors });
    }

    const text = (data.content && data.content[0] && data.content[0].text) || '';

    let parsed;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { query: text.trim().slice(0, 60) };
    } catch (e) {
      parsed = { query: text.trim().slice(0, 60) };
    }

    return new Response(JSON.stringify(parsed), { headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
