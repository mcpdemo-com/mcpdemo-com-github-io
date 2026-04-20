export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    let query;
    try {
      const body = await request.json();
      query = body.query?.trim();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Fetch channel list from Slack
    async function slackGet(method, params = {}) {
      const url = new URL(`https://slack.com/api/${method}`);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` }
      });
      return r.json();
    }

    // Build workspace context for Claude
    let workspaceContext = '';
    try {
      const channelsRes = await slackGet('conversations.list', { limit: '50', exclude_archived: 'true' });
      if (channelsRes.ok && channelsRes.channels) {
        const channels = channelsRes.channels.slice(0, 20);
        workspaceContext = 'Available public channels:\n' +
          channels.map(c => `- #${c.name} (ID: ${c.id}, members: ${c.num_members || 0})`).join('\n');

        // If query mentions a channel by name, fetch its recent history
        const mentionedChannel = channels.find(c =>
          query.toLowerCase().includes(c.name.toLowerCase()) ||
          query.toLowerCase().includes('general') && c.name === 'general'
        );
        if (mentionedChannel) {
          const histRes = await slackGet('conversations.history', {
            channel: mentionedChannel.id,
            limit: '15'
          });
          if (histRes.ok && histRes.messages) {
            const msgs = histRes.messages
              .filter(m => m.type === 'message' && m.text)
              .slice(0, 15)
              .reverse()
              .map(m => `[${new Date(parseFloat(m.ts) * 1000).toISOString().slice(0, 16).replace('T', ' ')}] ${m.text}`)
              .join('\n');
            workspaceContext += `\n\nRecent messages in #${mentionedChannel.name}:\n${msgs}`;
          }
        }
      }
    } catch (e) {
      workspaceContext = 'Could not fetch workspace data.';
    }

    const systemPrompt = `You are Claude, connected to a Slack workspace via Model Context Protocol (MCP). You have read-only access to public channels and message history.

${workspaceContext}

Answer the user's question using the workspace data above. Be specific — cite channel names, message content, and timestamps where relevant. If the user asks about a channel not in the list, explain it may be private or archived. Keep responses concise and well-formatted. Never fabricate messages or channel names not present in the data provided.`;

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: query }]
        })
      });

      const anthropicData = await anthropicRes.json();

      if (!anthropicRes.ok || !anthropicData.content) {
        return new Response(JSON.stringify({ error: 'Claude API error' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const result = anthropicData.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      return new Response(JSON.stringify({ result }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
