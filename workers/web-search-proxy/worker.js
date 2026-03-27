/**
 * MCP Demo — Web Search Worker
 * Calls mcpcio websearch_web_search tool directly — no Claude middleman
 */

const ALLOWED_ORIGIN = 'https://mcpdemo.com';
const MCP_URL        = 'https://api.mcpcio.com/mcp';

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

async function callWebSearch(token, query) {
  return fetch(MCP_URL, {
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
        name:      'websearch_web_search',
        arguments: { query, num_results: 5 }
      }
    })
  });
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
      mcpResp = await callWebSearch(env.MCPCIO_TOKEN, query);
      mcpText = await mcpResp.text();
    } catch (err) {
      return json({ error: 'Search service unavailable. Please try again.', detail: err.message }, 502, origin);
    }

    // Handle SSE response (text/event-stream)
    let mcpData;
    const contentType = mcpResp.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
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

    if (mcpData.error) {
      return json({ error: mcpData.error.message || 'MCP tool error', code: mcpData.error.code }, 502, origin);
    }

    // Extract the tool result content
    let toolResult = null;
    try {
      const resultContent = mcpData.result?.content;
      if (Array.isArray(resultContent)) {
        for (const block of resultContent) {
          if (block.type === 'text') {
            toolResult = JSON.parse(block.text);
            break;
          }
        }
      } else if (mcpData.result) {
        toolResult = mcpData.result;
      }
    } catch (e) {
      return json({ error: 'Could not parse search result', detail: e.message, raw: JSON.stringify(mcpData).slice(0, 300) }, 502, origin);
    }

    if (!toolResult) {
      return json({ error: 'Empty result from search tool' }, 502, origin);
    }

    // toolResult shape: { success, data: { answer, sources, cached, model_used, ... } }
    const data = toolResult.data || toolResult;
    const answer  = data.answer  || null;
    const sources = (data.sources || []).map(s => s.display_name || s.collection);
    const cached  = data.cached  || false;

    if (!answer) {
      return json({ error: 'No answer returned from search' }, 502, origin);
    }

    return json({
      result: { answer, sources, cached },
      source: 'live'
    });
  }
};
