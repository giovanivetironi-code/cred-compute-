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
  const adminExtras = [];
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


  // ---------- 2) AI duel ----------
  const CONTENDERS = [{ id: 'grok-4.7', label: 'Grok 4.7' }, { id: 'grok-4.20-0309-non-reasoning', label: 'Grok 4.20 (fast)' }];
  const DUEL_CATS = ['chat', 'writing', 'coding', 'research'];
  setups.push(`CREATE TABLE IF NOT EXISTS duels (id text PRIMARY KEY, user_id integer REFERENCES users(id), category text NOT NULL, prompt text, left_model text, right_model text,
    left_run text, right_run text, vote text, voted_at timestamptz, cost_cents integer, created_at timestamptz DEFAULT now())`);
  async function runSide(runId, model, cat, prompt) {
    const spec = RUNS[cat]; const t0 = Date.now();
    try { const r = await getProvider().text({ system: ABOUT + '\n\nTask: ' + spec.system, prompt, maxTokens: spec.maxTokens, model, service: cat });
      if (!r.model) r.model = model; await finishRun(runId, { result: r, provider: getProvider().name }, t0); }
    catch (e) { await q('UPDATE runs SET error=$2 WHERE id=$1', [runId, String(e.message).slice(0, 200)]); await refundRun(runId, 'run failed'); }
  }
  app.get('/api/duel/config', (req, res) => res.json({ categories: Object.fromEntries(DUEL_CATS.map(c => [c, { label: RUNS[c].label, cost: RUNS[c].cost * 2, maxChars: RUNS[c].maxChars }])) }));
  app.post('/api/duel', auth, limit(6, 60_000), wrap(async (req, res) => {
    const cat = String(req.body?.category || ''); const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : ''; const spec = RUNS[cat];
    if (!DUEL_CATS.includes(cat)) return res.status(400).json({ error: 'Pick a category.' });
    if (!prompt.trim() || prompt.length > spec.maxChars) return res.status(400).json({ error: `Prompt required, max ${spec.maxChars} characters.` });
    const each = Math.round(spec.cost * 100), id = 'duel-' + crypto.randomBytes(8).toString('hex');
    const [L, R] = Math.random() < 0.5 ? CONTENDERS : [CONTENDERS[1], CONTENDERS[0]];
    const ok = await tx(async c => {
      const d = await c.query('UPDATE users SET balance_cents = balance_cents - $1 WHERE id=$2 AND balance_cents >= $1', [each * 2, req.user.id]); if (!d.rowCount) return false;
      for (const side of ['a', 'b']) { await c.query('INSERT INTO ledger (user_id, delta_cents, kind, ref) VALUES ($1,$2,$3,$4)', [req.user.id, -each, 'run', `run-${id}-${side}`]);
        await c.query("INSERT INTO runs (id, user_id, service, prompt, status, cost_cents, meta) VALUES ($1,$2,$3,$4,'running',$5,$6)", [`${id}-${side}`, req.user.id, 'duel:' + cat, prompt.slice(0, 2000), each, JSON.stringify({ duel: id })]); }
      await c.query('INSERT INTO duels (id, user_id, category, prompt, left_model, right_model, left_run, right_run, cost_cents) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, req.user.id, cat, prompt.slice(0, 2000), L.id, R.id, id + '-a', id + '-b', each * 2]);
      return true; });
    if (!ok) return res.status(402).json({ error: 'Not enough credits. Buy a credit pack first.' });
    res.json({ id, cost: each * 2 / 100 });
    await Promise.all([runSide(id + '-a', L.id, cat, prompt), runSide(id + '-b', R.id, cat, prompt)]);
  }));
  const label = m => CONTENDERS.find(c => c.id === m)?.label || m;
  app.get('/api/duel/:id', auth, limit(120, 60_000), wrap(async (req, res) => {
    const d = (await q('SELECT * FROM duels WHERE id=$1 AND user_id=$2', [String(req.params.id), req.user.id])).rows[0]; if (!d) return res.status(404).json({ error: 'Not found' });
    const runs = (await q('SELECT id, status, result, error, cost_cents, created_at, model, latency_ms, tokens FROM runs WHERE id = ANY($1)', [[d.left_run, d.right_run]])).rows;
    const side = (rid, m) => { const r = runs.find(x => x.id === rid) || {}; return { ...r, text: r.result?.text, model: d.vote ? r.model : null, label: d.vote ? label(m) : null }; };
    res.json({ id: d.id, category: d.category, prompt: d.prompt, vote: d.vote, cost: d.cost_cents / 100, left: side(d.left_run, d.left_model), right: side(d.right_run, d.right_model) });
  }));
  app.post('/api/duel/:id/vote', auth, limit(30, 60_000), wrap(async (req, res) => {
    const pick = String(req.body?.pick || ''); if (!['left', 'right', 'tie'].includes(pick)) return res.status(400).json({ error: 'Pick left, right or tie.' });
    const d = (await q('SELECT * FROM duels WHERE id=$1 AND user_id=$2', [String(req.params.id), req.user.id])).rows[0]; if (!d) return res.status(404).json({ error: 'Not found' });
    const st = (await q("SELECT COUNT(*) FILTER (WHERE status='done') n FROM runs WHERE id = ANY($1)", [[d.left_run, d.right_run]])).rows[0];
    if (Number(st.n) < 2) return res.status(409).json({ error: 'Wait for both answers before voting.' });
    const r = await q('UPDATE duels SET vote=$2, voted_at=now() WHERE id=$1 AND vote IS NULL RETURNING id', [d.id, pick]);
    if (!r.rowCount) return res.status(409).json({ error: 'You already voted on this duel.' }); res.json({ ok: true });
  }));
  async function leaderboard() {
    const rows = (await q(`SELECT category, m model, SUM(w) wins, SUM(l) losses, SUM(t) ties FROM (
      SELECT category, left_model m, (vote='left')::int w, (vote='right')::int l, (vote='tie')::int t FROM duels WHERE vote IS NOT NULL
      UNION ALL SELECT category, right_model, (vote='right')::int, (vote='left')::int, (vote='tie')::int FROM duels WHERE vote IS NOT NULL) x GROUP BY 1,2 ORDER BY 1, 3 DESC`)).rows;
    return rows.map(r => { const n = Number(r.wins) + Number(r.losses) + Number(r.ties); return { category: r.category, model: r.model, label: label(r.model), wins: +r.wins, losses: +r.losses, ties: +r.ties, votes: n, winRate: n ? Math.round(100 * (+r.wins + 0.5 * +r.ties) / n) : 0 }; });
  }
  app.get('/api/leaderboard', limit(60, 60_000), wrap(async (req, res) => res.json(enabled() ? await leaderboard() : [])));
  app.get('/duel', limit(60, 60_000), wrap(async (req, res) => {
    const lb = enabled() ? await leaderboard() : [];
    const table = cat => { const r = lb.filter(x => x.category === cat); return `<div class="panel"><h3>${esc(RUNS[cat].label)}</h3>${r.length ? `<div class="table"><table><thead><tr><th>Model</th><th class="r">Win rate</th><th class="r">W / L / T</th></tr></thead><tbody>${r.map(x => `<tr><td>${esc(x.label)}</td><td class="r">${x.winRate}%</td><td class="r">${x.wins} / ${x.losses} / ${x.ties}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mut">No votes yet. Be the first.</p>'}</div>`; };
    html(res, { title: 'AI Duel', desc: 'One prompt, two AI answers side by side. Vote for the better one and see the public leaderboard.', url: '/duel', body: `
<div class="eyebrow">AI duel</div><h1>One prompt. Two answers. You decide.</h1>
<p class="sub">Two models answer the same prompt side by side. Model names stay hidden until you vote, so the leaderboard stays fair.</p>
<div class="panel" id="duelbox"><div id="duel-off" class="mut" hidden>Sign in on the <a href="/#account">account page</a> to start a duel.</div>
 <div id="duel-on" hidden><label class="lbl" for="dcat">Category</label><select id="dcat"></select><label class="lbl" for="dprompt">Prompt</label><textarea id="dprompt" rows="4" placeholder="Write a tagline for a coffee shop run by robots"></textarea>
 <div class="row between"><span class="mut" id="dcost"></span><button class="btn" id="dgo">Start duel</button></div></div></div>
<div id="dres"></div>
<h2 style="margin-top:48px">Leaderboard</h2><p class="sub">Win rate counts a tie as half a win. Votes come from signed-in users, one per duel.</p>
<div class="mgrid">${DUEL_CATS.map(table).join('')}</div>`, script: '<script src="/duel.js"></script>' });
  }));

  // ---------- 3) Pay only if you liked it (one-tap refunds) ----------
  const REFUND = { windowHours: 24, perDay: 3, monthPct: 0.2, monthFloorCents: 100 };
  setups.push(`CREATE TABLE IF NOT EXISTS user_refunds (id serial PRIMARY KEY, user_id integer REFERENCES users(id), run_id text UNIQUE, cents integer NOT NULL, reason text, created_at timestamptz DEFAULT now())`);
  async function refundQuota(uid) {
    const [d, m, sp] = await Promise.all([q("SELECT COUNT(*) n FROM user_refunds WHERE user_id=$1 AND created_at > now() - interval '1 day'", [uid]),
      q("SELECT COALESCE(SUM(cents),0) c FROM user_refunds WHERE user_id=$1 AND created_at >= date_trunc('month', now())", [uid]),
      q("SELECT COALESCE(SUM(cost_cents),0) c FROM runs WHERE user_id=$1 AND status='done' AND created_at >= date_trunc('month', now())", [uid])]);
    const cap = Math.max(Math.floor(Number(sp.rows[0].c) * REFUND.monthPct), REFUND.monthFloorCents);
    return { todayLeft: Math.max(0, REFUND.perDay - Number(d.rows[0].n)), monthRefundedCents: Number(m.rows[0].c), monthCapCents: cap };
  }
  app.get('/api/refunds/quota', auth, limit(60, 60_000), wrap(async (req, res) => res.json({ ...(await refundQuota(req.user.id)), rules: REFUND })));
  app.post('/api/runs/:id/refund', auth, limit(10, 60_000), wrap(async (req, res) => {
    const run = (await q('SELECT * FROM runs WHERE id=$1 AND user_id=$2', [String(req.params.id), req.user.id])).rows[0]; if (!run) return res.status(404).json({ error: 'Run not found.' });
    if (run.status !== 'done' || run.meta?.userRefund) return res.status(409).json({ error: 'This run was already refunded or did not finish.' });
    if (Date.now() - new Date(run.created_at) > REFUND.windowHours * 3600e3) return res.status(403).json({ error: 'Refunds are available for 24 hours after a run.' });
    const cents = run.meta?.baseCents ?? run.cost_cents; // marketplace markup is not refundable
    const qu = await refundQuota(req.user.id);
    if (!qu.todayLeft) return res.status(429).json({ error: 'You can refund up to 3 runs per day.' });
    if (qu.monthRefundedCents + cents > qu.monthCapCents) return res.status(403).json({ error: 'Monthly refund limit reached (20% of this month\'s spend, minimum 1 credit).' });
    const reason = clean(req.body?.reason, 200);
    const ins = await q('INSERT INTO user_refunds (user_id, run_id, cents, reason) VALUES ($1,$2,$3,$4) ON CONFLICT (run_id) DO NOTHING RETURNING id', [req.user.id, run.id, cents, reason]);
    if (!ins.rowCount) return res.status(409).json({ error: 'Already refunded.' });
    await credit(req.user.id, cents, 'userrefund', 'urefund-' + run.id, { reason });
    await q(`UPDATE runs SET meta = COALESCE(meta,'{}'::jsonb) || '{"userRefund":true}'::jsonb WHERE id=$1`, [run.id]);
    res.json({ refunded: cents / 100 });
  }));
  app.get('/api/admin/features', adminOnly, limit(30, 60_000), wrap(async (req, res) => {
    const out = {};
    out.refunds = (await q('SELECT r.created_at, u.email, r.run_id, r.cents, r.reason FROM user_refunds r JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 100')).rows;
    for (const f of adminExtras) Object.assign(out, await f());
    res.json(out);
  }));

  return { page, html, setups, optAuth, adminOnly, esc, clean, filtered, labelOf };
};
