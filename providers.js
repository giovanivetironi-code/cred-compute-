// Provider abstraction: each provider implements text(opts) and image(opts).
// Swap by setting AI_PROVIDER (default 'xai'). API keys come only from env and are never logged.
const XAI_BASE = 'https://api.x.ai/v1';

const xai = {
  name: 'xai',
  available: () => !!process.env.XAI_API_KEY,
  async text({ system, prompt, maxTokens }) {
    const r = await fetch(`${XAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.XAI_TEXT_MODEL || 'grok-4.7', max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) throw new Error(`xAI text error ${r.status}`);
    const d = await r.json();
    return { kind: 'text', text: d.choices?.[0]?.message?.content || '', usage: d.usage, model: d.model };
  },
  async image({ prompt }) {
    const r = await fetch(`${XAI_BASE}/images/generations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.XAI_IMAGE_MODEL || 'grok-imagine-image', prompt, n: 1 }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) throw new Error(`xAI image error ${r.status}`);
    const d = await r.json();
    return { kind: 'image', url: d.data?.[0]?.url, b64: d.data?.[0]?.b64_json, model: 'grok-imagine-image' };
  },
};

// Demo provider: used automatically when no API key is set. Clearly labeled, no external calls.
const demo = {
  name: 'demo',
  available: () => true,
  async text({ prompt, service }) {
    return { kind: 'text', demo: true, model: 'demo',
      text: `[DEMO RESPONSE: no AI provider key configured]\nService: ${service}\nYour prompt: "${prompt.slice(0, 200)}"\nWith XAI_API_KEY set, Grok would answer here.` };
  },
  async image({ prompt }) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="#141823"/><text x="50%" y="45%" fill="#fbbf24" font-family="sans-serif" font-size="28" text-anchor="middle">DEMO IMAGE</text><text x="50%" y="55%" fill="#98a1b5" font-family="sans-serif" font-size="16" text-anchor="middle">${prompt.slice(0, 40).replace(/[<&>"]/g, '')}</text></svg>`;
    return { kind: 'image', demo: true, model: 'demo', url: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') };
  },
};

const registry = { xai, demo };
function getProvider() {
  const p = registry[process.env.AI_PROVIDER || 'xai'];
  return p && p.available() ? p : demo;
}
module.exports = { getProvider, registry };
