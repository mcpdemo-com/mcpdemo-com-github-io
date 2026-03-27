/**
 * MCP Demo — Web Search Worker
 * Calls websearch_query (text answer) + websearch_video_search in parallel
 * No Claude middleman — direct MCP tool calls only
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

async function callTool(token, toolName, args) {
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
      params:  { name: toolName, arguments: args }
    })
  });
  return resp;
}

async function parseToolResponse(resp) {
  const text        = await resp.text();
  const contentType = resp.headers.get('content-type') || '';
  let mcpData;

  if (contentType.includes('text/event-stream')) {
    const lines = text.split('\n');
    let jsonStr = null;
    for (const line of lines) {
      if (line.startsWith('data: ')) jsonStr = line.slice(6).trim();
    }
    if (!jsonStr) throw new Error('No data in SSE response');
    mcpData = JSON.parse(jsonStr);
  } else {
    mcpData = JSON.parse(text);
  }

  if (mcpData.error) throw new Error(mcpData.error.message || 'MCP tool error');

  // Extract content block
  const resultContent = mcpData.result?.content;
  if (Array.isArray(resultContent)) {
    for (const block of resultContent) {
      if (block.type === 'text') return JSON.parse(block.text);
    }
  }
  return mcpData.result || null;
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

    // Fire both calls in parallel
    let textResp, videoResp;
    try {
      [textResp, videoResp] = await Promise.all([
        callTool(env.MCPCIO_TOKEN, 'websearch_query',        { query, search_mode: 'text' }),
        callTool(env.MCPCIO_TOKEN, 'websearch_video_search', { query, limit: 5 })
      ]);
    } catch (err) {
      return json({ error: 'Search service unavailable. Please try again.', detail: err.message }, 502, origin);
    }

    // Parse text answer (required)
    let textResult;
    try {
      textResult = await parseToolResponse(textResp);
    } catch (e) {
      return json({ error: 'Could not parse search answer: ' + e.message }, 502, origin);
    }

    const data    = textResult?.data || textResult || {};
    const answer  = data.answer  || null;
    const sources = (data.sources || []).map(s => s.display_name || s.collection);
    const cached  = data.cached  || false;

    if (!answer) return json({ error: 'No answer returned from search' }, 502, origin);

    // Parse video results (optional — don't fail if missing)
    let videos = [];
    try {
      const videoResult = await parseToolResponse(videoResp);
      const raw = videoResult?.data || videoResult || {};
      // Shape: { videos: [ { title, channel, thumbnail, url, duration, ... } ] }
      if (Array.isArray(raw.videos)) {
        videos = raw.videos.slice(0, 5).map(v => ({
          title:     v.title     || '',
          channel:   v.channel   || v.author || '',
          thumbnail: v.thumbnail || v.thumbnail_url || '',
          url:       v.url       || v.link || '',
          duration:  v.duration  || '',
          mentions:  v.mentions  || null,
        }));
      }
    } catch (_) {
      // Videos are best-effort — silently skip on error
    }

    return json({
      result: { answer, sources, cached, videos },
      source: 'live'
    });
  }
};
