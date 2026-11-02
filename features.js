// ComputeCred product features: receipts, AI duel, refunds, gifts, math lab, prompt marketplace.
// All credits are closed-loop store credit (no cash value). Every endpoint is rate limited.
const crypto = require('crypto'); const path = require('path'); const { execFile } = require('child_process');
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NAV = `<a href="/#services">Services</a><a href="/#pricing">Pricing</a><a href="/duel">Duel</a><a href="/market">Market</a><a href="/lab">Math lab</a><a href="/#account">Account</a>`;
const XSVG = '<svg class="xi" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
function page({ title, desc, body, script = '', og = '/images/og.png', url = '', noindex = false }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · ComputeCred</title>
<meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#06142b">${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:title" content="${esc(title)} · ComputeCred"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="https://computecred.ai${esc(og)}"><meta property="og:url" content="https://computecred.ai${esc(url)}"><meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@ComputeCred"><meta name="twitter:creator" content="@ComputeCred"><meta name="twitter:image" content="https://computecred.ai${esc(og)}">
<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/images/icon-180.png"><link rel="stylesheet" href="/style.css"></head><body>
<nav class="nav"><div class="wrap navin"><a href="/" class="brand"><img src="/images/icon-180.png" alt="ComputeCred">Compute<span>Cred</span></a><div class="links" id="links">${NAV}</div><a href="/#account" class="btn navcta">Get started</a><button class="burger" aria-label="Menu" onclick="document.getElementById('links').classList.toggle('open')">☰</button></div></nav>
<main class="wrap sec fpage">${body}</main>
<footer class="foot minifoot"><div class="wrap legal mut"><a href="/">ComputeCred</a> · <a href="/duel">Duel</a> · <a href="/market">Market</a> · <a href="/lab">Math lab</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a> · <a class="xlink" href="https://x.com/ComputeCred" target="_blank" rel="noopener noreferrer" aria-label="ComputeCred on X">${XSVG}@ComputeCred</a><br>Credits are prepaid store credit for AI services. They have no cash value.</div></footer>
<script src="/ui.js"></script>${script}</body></html>`;
}
// Very small content filter for public text (titles, gift messages, prompts on the marketplace).
const BAD = /\b(nigg|fagg|kike|retard|cp\b|child\s*porn|rape|kill\s+yourself|kys\b|nazi|porn|nsfw|nude|bitcoin\s+doubler|guaranteed\s+returns?|seed\s+phrase|private\s+key)\w*/i;
const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const filtered = s => BAD.test(s) || /(https?:\/\/|www\.)/i.test(s);

module.exports = (app, ctx) => {
  const { q, tx, credit, auth, wrap, isAdmin, cookie, enabled, sha, BASE, hooks, RUNS, limit, getProvider, ABOUT, finishRun, refundRun } = ctx;
  const optAuth = async (req, res, next) => { if (!enabled() || !cookie(req).cc_session) return next(); return auth(req, res, next); };
  const adminOnly = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: 'unauthorized' });
  const setups = []; // table setup run after accounts tables exist
  (async () => { await ctx.ready(); if (!enabled()) return; for (const s of setups) await q(s); console.log('features: ready'); })().catch(e => console.error('features init failed:', e.message));
  const html = (res, p, status = 200) => res.status(status).type('html').send(page(p));
  const labelOf = s => RUNS[s]?.label || ({ duel: 'AI duel', market: 'Marketplace prompt' }[String(s).split(':')[0]] || s);

  // ---------- 1) Receipts ----------
  function receiptView(r) {
    const res = r.result || {}; const proof = sha(`${r.prompt || ''}\n${res.text || res.url || JSON.stringify(res.zeros || '')}`);
    return { id: r.id, service: r.service, label: labelOf(r.service), status: r.status, model: r.model, latencyMs: r.latency_ms, tokens: r.tokens, cost: r.cost_cents / 100,
      createdAt: r.created_at, finishedAt: r.finished_at, shared: r.shared, contentHash: proof, refunded: r.status === 'refunded' || !!r.meta?.userRefund,
      prompt: r.shared ? r.prompt : null, result: r.shared ? res : (res.kind === 'math' ? { kind: 'math', count: (res.zeros || []).length } : null) };
  }
  app.get('/api/receipt/:id', limit(60, 60_000), wrap(async (req, res) => {
    if (!enabled()) return res.status(503).json({ error: 'unavailable' });
    const r = (await q('SELECT * FROM runs WHERE id=$1', [String(req.params.id).slice(0, 80)])).rows[0]; if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(receiptView(r));
  }));
  app.post('/api/receipt/:id/share', auth, limit(20, 60_000), wrap(async (req, res) => {
    const on = !!req.body?.shared; const r = await q('UPDATE runs SET shared=$3 WHERE id=$1 AND user_id=$2 RETURNING id', [String(req.params.id), req.user.id, on]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' }); res.json({ shared: on });
  }));
  app.get('/receipt/:id', limit(60, 60_000), wrap(async (req, res) => {
    const r = enabled() && (await q('SELECT * FROM runs WHERE id=$1', [String(req.params.id).slice(0, 80)])).rows[0];
    if (!r) return html(res, { title: 'Receipt not found', desc: 'This receipt does not exist.', noindex: true, body: '<h1>Receipt not found</h1><p class="mut">Check the link and try again.</p><p><a class="btn" href="/">Back to ComputeCred</a></p>' }, 404);
    const v = receiptView(r); const t = v.tokens;
    const out = v.result?.kind === 'image' ? `<img class="rimg" src="${esc(v.result.url)}" alt="AI generated image">` : v.result?.text ? `<div class="out">${esc(v.result.text)}</div>` : v.result?.zeros ? `<div class="out mono">${esc(v.result.zeros.join(', '))}</div>` : '';
    html(res, { title: `Receipt ${v.id}`, desc: `Verified ComputeCred receipt: ${v.label}, ${v.cost} credits.`, url: `/receipt/${v.id}`, noindex: !v.shared, body: `
<div class="eyebrow">Run receipt</div><h1>${esc(v.label)}</h1>
<div class="proof big-proof">
 <div><span>Receipt ID</span><b class="mono">${esc(v.id)}</b></div><div><span>Status</span><b><span class="badge ${esc(v.status)}">${esc(v.refunded ? 'refunded' : v.status)}</span></b></div>
 <div><span>Model</span><b>${esc(v.model || '—')}</b></div><div><span>Latency</span><b>${v.latencyMs != null ? (v.latencyMs / 1000).toFixed(2) + ' s' : '—'}</b></div>
 <div><span>Tokens</span><b>${t ? `${t.prompt ?? '?'} in · ${t.completion ?? '?'} out` : 'n/a'}</b></div><div><span>Cost</span><b>${v.cost} credits ($${v.cost.toFixed(2)})</b></div>
 <div><span>Started</span><b>${new Date(v.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</b></div><div><span>Content hash (SHA-256)</span><b class="mono small">${v.contentHash.slice(0, 32)}…</b></div>
</div>
${v.shared ? `${v.prompt ? `<h3>Prompt</h3><div class="out">${esc(v.prompt)}</div>` : ''}<h3>Result</h3>${out}` : `<p class="mut">The owner kept the prompt and result private. The content hash lets them prove later what was run without revealing it.</p>`}
<p class="mut small">Receipts are issued by ComputeCred for every run. Token counts come from the AI provider. Failed runs are refunded automatically.</p>
<div class="row"><a class="btn" href="/#account">Try ComputeCred</a><a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://x.com/intent/post?text=${encodeURIComponent('My ComputeCred AI receipt ' + BASE() + '/receipt/' + v.id + ' via @ComputeCred')}">Share on X</a></div>` });
  }));

  return { page, html, setups, optAuth, adminOnly, esc, clean, filtered, labelOf };
};
