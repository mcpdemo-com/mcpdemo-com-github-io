/**
 * MCP Demo — Shopify Product Search Worker
 * Calls mcpcio MCP tool directly — no Claude middleman for search
 */

const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const MCP_URL        = 'https://api.mcpcio.com/mcp';

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

// Call the mcpcio MCP server directly via JSON-RPC
async function searchProducts(token, query) {
  const resp = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept':        'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      1,
      method:  'tools/call',
      params: {
        name:      'productsearch_search_products',
        arguments: { query, limit: 4 }
      }
    })
  });

  return resp;
}

// Format raw MCP offers into clean product cards
function formatProducts(offers, query) {
  if (!offers || offers.length === 0) {
    return { summary: 'No products found. Try a more specific search.', products: [] };
  }

  // Deduplicate by product title — take first variant per unique product
  const seen = new Set();
  const products = [];

  for (const offer of offers) {
    if (products.length >= 4) break;
    if (seen.has(offer.title)) continue;
    seen.add(offer.title);

    const variant  = offer.variants?.[0];
    const price    = variant?.price?.amount
      ? `$${(variant.price.amount / 100).toFixed(2)}`
      : offer.priceRange?.min?.amount
        ? `$${(offer.priceRange.min.amount / 100).toFixed(2)}`
        : null;

    const rating = offer.rating?.count > 0
      ? `${offer.rating.rating.toFixed(1)}/5 (${offer.rating.count} reviews)`
      : null;

    const image  = offer.media?.[0]?.url || variant?.media?.[0]?.url || null;
    const seller = variant?.shop?.name || null;

    products.push({
      title:       offer.title,
      price,
      rating,
      seller,
      description: offer.description?.slice(0, 120) || null,
      image,
    });
  }

  return {
    summary:  `Found ${products.length} product${products.length !== 1 ? 's' : ''} matching your search`,
    products,
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, origin); }

    const query = (body.query || '').trim();
    if (!query) return json({ error: 'Missing query' }, 400, origin);

    if (!env.MCPCIO_TOKEN) return json({ error: 'MCPCIO_TOKEN not set' }, 500, origin);

    // Call mcpcio MCP directly
    let mcpResp, mcpText;
    try {
      mcpResp = await searchProducts(env.MCPCIO_TOKEN, query);
      mcpText = await mcpResp.text();
    } catch (err) {
      return json({ error: 'Search service unavailable. Please try again.', detail: err.message }, 502, origin);
    }

    // Handle SSE response (text/event-stream)
    let mcpData;
    const contentType = mcpResp.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      // Parse SSE — find the data line with the result
      const lines = mcpText.split('\n');
      let jsonStr = null;
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          jsonStr = line.slice(6).trim();
        }
      }
      if (!jsonStr) {
        return json({ error: 'No data in SSE response', raw: mcpText.slice(0, 300) }, 502, origin);
      }
      try { mcpData = JSON.parse(jsonStr); }
      catch { return json({ error: 'Could not parse SSE data', raw: jsonStr.slice(0, 300) }, 502, origin); }
    } else {
      try { mcpData = JSON.parse(mcpText); }
      catch { return json({ error: 'Could not parse MCP response', raw: mcpText.slice(0, 300) }, 502, origin); }
    }

    // Check for JSON-RPC error
    if (mcpData.error) {
      return json({ error: mcpData.error.message || 'MCP tool error', code: mcpData.error.code }, 502, origin);
    }

    // Extract offers from result
    let offers = [];
    try {
      const resultContent = mcpData.result?.content;
      if (Array.isArray(resultContent)) {
        // MCP returns content blocks
        for (const block of resultContent) {
          if (block.type === 'text') {
            const parsed = JSON.parse(block.text);
            offers = parsed.offers || parsed.products || parsed || [];
            break;
          }
        }
      } else if (mcpData.result?.offers) {
        offers = mcpData.result.offers;
      }
    } catch (e) {
      return json({ error: 'Could not parse product data', detail: e.message, raw: JSON.stringify(mcpData).slice(0, 300) }, 502, origin);
    }

    const result = formatProducts(offers, query);
    return json({ result, source: 'live', sponsored: true });
  }
};
