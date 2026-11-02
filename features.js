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

  // ---------- 4) Giftable credits (email claim links) ----------
  const GIFT = { minCents: 100, maxCents: 2500, perDay: 5, dayMaxCents: 5000, expireDays: 30 };
  setups.push(`CREATE TABLE IF NOT EXISTS gifts (id text PRIMARY KEY, sender_id integer REFERENCES users(id), to_email text NOT NULL, cents integer NOT NULL CHECK (cents > 0), message text,
    from_name text, token_hash text NOT NULL, status text NOT NULL DEFAULT 'sent', claimed_by integer, created_at timestamptz DEFAULT now(), claimed_at timestamptz)`);
  const mask = e => { const [u, d] = String(e).split('@'); return (u.length <= 2 ? u[0] + '*' : u[0] + '***' + u.slice(-1)) + '@' + d; };
  async function expireGifts() { const old = (await q(`UPDATE gifts SET status='expired' WHERE status='sent' AND created_at < now() - interval '${GIFT.expireDays} days' RETURNING id, sender_id, cents`)).rows;
    for (const g of old) await credit(g.sender_id, g.cents, 'gift-return', 'giftret-' + g.id, { gift: g.id }); }
  async function sendMail(to, subject, html) {
    if (!process.env.RESEND_API_KEY) return false;
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'ComputeCred <login@computecred.ai>', to, subject, html }) });
    if (!r.ok) console.error('gift email failed', r.status); return r.ok;
  }
  app.post('/api/gifts', auth, limit(5, 60_000), wrap(async (req, res) => {
    const to = String(req.body?.email || '').trim().toLowerCase(); const cents = Math.round(Number(req.body?.credits) * 100);
    const message = clean(req.body?.message, 140), fromName = clean(req.body?.fromName, 40);
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(to)) return res.status(400).json({ error: 'Enter a valid recipient email.' });
    if (to === req.user.email) return res.status(400).json({ error: "You can't gift credits to yourself." });
    if (!(cents >= GIFT.minCents && cents <= GIFT.maxCents)) return res.status(400).json({ error: 'Gifts must be between 1 and 25 credits.' });
    if ((message && filtered(message)) || (fromName && filtered(fromName))) return res.status(400).json({ error: 'Please remove links or inappropriate words from the message.' });
    const day = (await q("SELECT COUNT(*) n, COALESCE(SUM(cents),0) c FROM gifts WHERE sender_id=$1 AND created_at > now() - interval '1 day'", [req.user.id])).rows[0];
    if (Number(day.n) >= GIFT.perDay || Number(day.c) + cents > GIFT.dayMaxCents) return res.status(429).json({ error: 'Daily gift limit reached (5 gifts or 50 credits per day).' });
    const id = crypto.randomBytes(6).toString('base64url'), tok = crypto.randomBytes(18).toString('base64url');
    const ok = await tx(async c => { const d = await c.query('UPDATE users SET balance_cents = balance_cents - $1 WHERE id=$2 AND balance_cents >= $1', [cents, req.user.id]); if (!d.rowCount) return false;
      await c.query('INSERT INTO ledger (user_id, delta_cents, kind, ref, meta) VALUES ($1,$2,$3,$4,$5)', [req.user.id, -cents, 'gift-sent', 'gift-' + id, JSON.stringify({ to: mask(to) })]);
      await c.query('INSERT INTO gifts (id, sender_id, to_email, cents, message, from_name, token_hash) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, req.user.id, to, cents, message || null, fromName || null, sha(tok)]); return true; });
    if (!ok) return res.status(402).json({ error: 'Not enough credits for this gift.' });
    const link = `${BASE()}/gift/${id}?c=${tok}`; const amt = cents / 100;
    const mailed = await sendMail(to, `${fromName || 'Someone'} sent you ${amt} ComputeCred AI credits`,
      `<div style="font-family:Arial,sans-serif;max-width:520px"><img src="${BASE()}/gift/${id}/card.png" alt="ComputeCred gift card" width="520" style="max-width:100%;border-radius:12px">
       <p>${esc(fromName || 'A ComputeCred user')} sent you <b>${amt} AI credits</b> on ComputeCred.</p>${message ? `<p style="color:#555">&ldquo;${esc(message)}&rdquo;</p>` : ''}
       <p><a href="${link}" style="background:#14d4d4;color:#032230;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Claim your credits</a></p>
       <p style="color:#888;font-size:12px">Sign in with this email address to claim. Unclaimed gifts return to the sender after ${GIFT.expireDays} days. Credits are store credit for AI services with no cash value.</p></div>`);
    res.json({ id, credits: amt, emailed: mailed, shareUrl: `${BASE()}/gift/${id}` });
  }));
  app.get('/api/gifts', auth, limit(60, 60_000), wrap(async (req, res) => { await expireGifts();
    res.json((await q('SELECT id, to_email, cents, message, status, created_at, claimed_at FROM gifts WHERE sender_id=$1 ORDER BY created_at DESC LIMIT 30', [req.user.id])).rows.map(g => ({ ...g, to_email: mask(g.to_email), credits: g.cents / 100 })));
  }));
  app.post('/api/gifts/:id/cancel', auth, limit(10, 60_000), wrap(async (req, res) => {
    const g = (await q("UPDATE gifts SET status='canceled' WHERE id=$1 AND sender_id=$2 AND status='sent' RETURNING id, cents", [String(req.params.id), req.user.id])).rows[0];
    if (!g) return res.status(409).json({ error: 'This gift was already claimed or canceled.' });
    await credit(req.user.id, g.cents, 'gift-return', 'giftret-' + g.id, { gift: g.id, canceled: true }); res.json({ returned: g.cents / 100 });
  }));
  app.post('/api/gifts/:id/claim', auth, limit(10, 60_000), wrap(async (req, res) => {
    await expireGifts(); const g = (await q('SELECT * FROM gifts WHERE id=$1', [String(req.params.id)])).rows[0];
    const tok = String(req.body?.token || ''); if (!g || !tok || sha(tok) !== g.token_hash) return res.status(404).json({ error: 'Gift not found or link invalid.' });
    if (g.status !== 'sent') return res.status(409).json({ error: `This gift was already ${g.status}.` });
    if (g.to_email !== req.user.email) return res.status(403).json({ error: `This gift was sent to ${mask(g.to_email)}. Sign in with that email to claim it.` });
    const u = await q("UPDATE gifts SET status='claimed', claimed_by=$2, claimed_at=now() WHERE id=$1 AND status='sent' RETURNING id", [g.id, req.user.id]); if (!u.rowCount) return res.status(409).json({ error: 'Already claimed.' });
    await credit(req.user.id, g.cents, 'gift-received', 'giftrcv-' + g.id, { gift: g.id }); res.json({ claimed: g.cents / 100 });
  }));
  let logoB64 = null;
  app.get('/gift/:id/card.png', limit(60, 60_000), wrap(async (req, res) => {
    const g = enabled() && (await q('SELECT id, cents, message, from_name, status FROM gifts WHERE id=$1', [String(req.params.id).slice(0, 20)])).rows[0]; if (!g) return res.status(404).end();
    logoB64 = logoB64 || require('fs').readFileSync(path.join(__dirname, 'public', 'images', 'icon-180.png')).toString('base64');
    const wrapTxt = (t, n) => { const w = String(t).split(/\s+/); const lines = ['']; for (const x of w) { if ((lines.at(-1) + ' ' + x).trim().length > n) lines.push(x); else lines[lines.length - 1] = (lines.at(-1) + ' ' + x).trim(); } return lines.slice(0, 2); };
    const msg = g.message ? wrapTxt('“' + g.message + '”', 52) : [];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#06142b"/><stop offset="1" stop-color="#0b2a52"/></linearGradient>
      <linearGradient id="ac" x1="0" x2="1"><stop offset="0" stop-color="#14d4d4"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
      <rect width="1200" height="630" fill="url(#bg)"/><rect x="40" y="40" width="1120" height="550" rx="36" fill="none" stroke="#14d4d4" stroke-opacity=".45" stroke-width="3"/>
      <circle cx="1050" cy="120" r="260" fill="#14d4d4" fill-opacity=".07"/><image href="data:image/png;base64,${logoB64}" x="90" y="88" width="84" height="84"/>
      <text x="196" y="145" font-family="DejaVu Sans" font-weight="bold" font-size="40" fill="#eaf2ff">Compute<tspan fill="#14d4d4">Cred</tspan></text>
      <text x="90" y="250" font-family="DejaVu Sans" font-size="34" fill="#93a6c4">${esc(g.from_name ? g.from_name + ' sent you' : 'You received')}</text>
      <text x="90" y="370" font-family="DejaVu Sans" font-weight="bold" font-size="120" fill="url(#ac)">${g.cents / 100} AI credits</text>
      ${msg.map((l, i) => `<text x="90" y="${440 + i * 44}" font-family="DejaVu Sans" font-style="italic" font-size="32" fill="#eaf2ff">${esc(l)}</text>`).join('')}
      <text x="90" y="555" font-family="DejaVu Sans" font-size="24" fill="#93a6c4">computecred.ai · prepaid credits for AI · no cash value</text></svg>`;
    const png = await require('sharp')(Buffer.from(svg)).png().toBuffer();
    res.set('Cache-Control', 'public, max-age=300').type('png').send(png);
  }));
  app.get('/gift/:id', limit(60, 60_000), wrap(async (req, res) => {
    const g = enabled() && (await q('SELECT id, to_email, cents, message, from_name, status FROM gifts WHERE id=$1', [String(req.params.id).slice(0, 20)])).rows[0];
    if (!g) return html(res, { title: 'Gift not found', desc: 'This gift link is not valid.', noindex: true, body: '<h1>Gift not found</h1><p class="mut">Check the link in your email.</p>' }, 404);
    html(res, { title: `${g.cents / 100} AI credits gift`, desc: `${g.from_name || 'Someone'} sent ${g.cents / 100} ComputeCred AI credits.`, og: `/gift/${g.id}/card.png`, url: `/gift/${g.id}`, noindex: true, body: `
<div class="eyebrow">Gift</div><h1>You've got AI credits</h1><img class="giftcard" src="/gift/${esc(g.id)}/card.png" alt="ComputeCred gift card for ${g.cents / 100} credits" width="1200" height="630">
<div class="panel" style="margin-top:20px" id="gbox" data-id="${esc(g.id)}" data-status="${esc(g.status)}" data-to="${esc(mask(g.to_email))}"><p class="mut">Loading…</p></div>
<p class="mut small">Gift credits are ComputeCred store credit for AI services. They have no cash value and can't be withdrawn. See the <a href="/terms.html">Terms</a>.</p>`, script: '<script src="/gift.js"></script>' });
  }));
  adminExtras.push(async () => ({ gifts: (await q('SELECT g.created_at, u.email sender, g.to_email, g.cents, g.status FROM gifts g JOIN users u ON u.id=g.sender_id ORDER BY g.created_at DESC LIMIT 100')).rows }));

  return { page, html, setups, optAuth, adminOnly, esc, clean, filtered, labelOf };
};
