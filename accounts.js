// Card-paid accounts: email magic-link login, off-chain credit balance (1 credit = $1, stored in cents),
// Stripe Checkout + webhook, server-side AI runs, usage history, admin revenue view.
// Needs DATABASE_URL (Postgres). Login needs RESEND_API_KEY + EMAIL_FROM. Payments need STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET.
const crypto = require('crypto'); const express = require('express');
const PACKS = { p5: { usd: 5, credits: 5 }, p10: { usd: 10, credits: 10 }, p25: { usd: 25, credits: 26 }, p50: { usd: 50, credits: 53 } };
// Estimated worst-case provider cost per run in cents (xAI grok-4.7 $2/$6 per 1M tokens, image $0.02; checked Oct 2026).
const EST_COST_CENTS = { chat: 5, writing: 5, research: 9, coding: 10, image: 2, zeros10: 0, zeros50: 0 };
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const BASE = () => process.env.PUBLIC_URL || 'https://computecred.ai';

module.exports = (app, { RUNS, execute, db, limit }) => {
  const q = (...a) => db.pool().query(...a);
  const enabled = () => !!db.pool();
  const flags = () => ({ accounts: enabled(), login: enabled() && (!!process.env.RESEND_API_KEY || process.env.DEV_LOGIN === '1'), payments: enabled() && !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET, stripeMode: (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live') ? 'live' : 'test' });
  let ready = (async () => { // wait for db.init() to create the pool
    for (let i = 0; i < 100 && !db.pool(); i++) await new Promise(r => setTimeout(r, 200));
    if (!db.pool()) return console.log('accounts: disabled (no DATABASE_URL)');
    await q(`CREATE TABLE IF NOT EXISTS users (id serial PRIMARY KEY, email text UNIQUE NOT NULL, balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0), created_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS ledger (id serial PRIMARY KEY, user_id integer REFERENCES users(id), delta_cents integer NOT NULL, kind text NOT NULL, ref text UNIQUE, meta jsonb, created_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS login_tokens (token_hash text PRIMARY KEY, email text NOT NULL, expires_at timestamptz NOT NULL, used boolean DEFAULT false);
      CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id integer REFERENCES users(id), expires_at timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS runs (id text PRIMARY KEY, user_id integer REFERENCES users(id), service text, prompt text, status text, result jsonb, error text, cost_cents integer, created_at timestamptz DEFAULT now(), finished_at timestamptz);`);
    // Runs interrupted by a restart: refund them.
    const st = await q("SELECT id FROM runs WHERE status IN ('queued','running')"); for (const r of st.rows) await refundRun(r.id, 'interrupted by restart');
    console.log('accounts: enabled', JSON.stringify(flags()));
  })().catch(e => console.error('accounts init failed:', e.message));

  async function tx(fn) { const c = await db.pool().connect(); try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } }
  async function credit(userId, cents, kind, ref, meta) { // idempotent by ref
    return tx(async c => { const ins = await c.query('INSERT INTO ledger (user_id, delta_cents, kind, ref, meta) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (ref) DO NOTHING RETURNING id', [userId, cents, kind, ref, meta || null]);
      if (ins.rowCount) await c.query('UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2', [cents, userId]); return ins.rowCount > 0; });
  }
  async function refundRun(runId, why) {
    const r = (await q('SELECT user_id, cost_cents FROM runs WHERE id=$1', [runId])).rows[0]; if (!r) return;
    await credit(r.user_id, r.cost_cents, 'refund', 'refund-' + runId, { reason: why });
    await q("UPDATE runs SET status=CASE WHEN status='done' THEN status ELSE 'refunded' END, error=COALESCE(error,$2), finished_at=now() WHERE id=$1", [runId, why]);
  }
  const cookie = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
  async function auth(req, res, next) {
    if (!enabled()) return res.status(503).json({ error: 'Accounts are not enabled yet.' });
    const t = cookie(req).cc_session; if (!t) return res.status(401).json({ error: 'Please sign in.' });
    const s = (await q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [sha(t)])).rows[0];
    if (!s) return res.status(401).json({ error: 'Session expired. Please sign in again.' }); req.user = s; next();
  }
  const wrap = f => (req, res) => f(req, res).catch(e => { console.error('api error', e.message); res.status(500).json({ error: 'Server error' }); });

  app.get('/api/account/flags', (_, res) => res.json({ ...flags(), packs: PACKS }));
  app.post('/api/auth/start', limit(5, 600_000), wrap(async (req, res) => {
    if (!flags().login) return res.status(503).json({ error: 'Email sign-in is not enabled yet.' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(email)) return res.status(400).json({ error: 'Enter a valid email.' });
    const tok = crypto.randomBytes(24).toString('base64url');
    await q("INSERT INTO login_tokens (token_hash, email, expires_at) VALUES ($1,$2, now() + interval '20 minutes')", [sha(tok), email]);
    const link = `${BASE()}/api/auth/verify?t=${tok}`;
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_FROM || 'ComputeCred <login@computecred.ai>', to: email, subject: 'Your ComputeCred sign-in link',
          html: `<p>Click to sign in to ComputeCred:</p><p><a href="${link}">Sign in</a></p><p>This link expires in 20 minutes. If you didn't request it, ignore this email.</p>` }) });
      if (!r.ok) { console.error('email send failed', r.status); return res.status(502).json({ error: 'Could not send email. Try again.' }); }
      return res.json({ sent: true });
    }
    res.json({ sent: true, devLink: link }); // DEV_LOGIN=1 only (local testing)
  }));
  app.get('/api/auth/verify', wrap(async (req, res) => {
    const t = String(req.query.t || '');
    const r = (await q("UPDATE login_tokens SET used=true WHERE token_hash=$1 AND NOT used AND expires_at>now() RETURNING email", [sha(t)])).rows[0];
    if (!r) return res.redirect('/?login=expired#account');
    const u = (await q('INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email RETURNING id', [r.email])).rows[0];
    const s = crypto.randomBytes(32).toString('base64url');
    await q("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '30 days')", [sha(s), u.id]);
    res.setHeader('Set-Cookie', `cc_session=${s}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`); res.redirect('/#account');
  }));
  app.post('/api/auth/logout', wrap(async (req, res) => { const t = cookie(req).cc_session; if (t && enabled()) await q('DELETE FROM sessions WHERE token_hash=$1', [sha(t)]);
    res.setHeader('Set-Cookie', 'cc_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'); res.json({ ok: true }); }));

  app.get('/api/account', auth, wrap(async (req, res) => {
    const runs = (await q('SELECT id, service, prompt, status, result, error, cost_cents, created_at, finished_at FROM runs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [req.user.id])).rows;
    const ledger = (await q('SELECT delta_cents, kind, created_at FROM ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [req.user.id])).rows;
    res.json({ email: req.user.email, balance: req.user.balance_cents / 100, runs, ledger });
  }));
  app.post('/api/account/run', auth, limit(10, 60_000), wrap(async (req, res) => {
    const service = String(req.body?.service || ''); const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : ''; const spec = RUNS[service];
    if (!spec) return res.status(400).json({ error: 'Unknown service.' });
    if (spec.kind !== 'math' && (!prompt.trim() || prompt.length > spec.maxChars)) return res.status(400).json({ error: `Prompt required, max ${spec.maxChars} characters.` });
    const cents = Math.round(spec.cost * 100); const runId = `${service}-${crypto.randomBytes(8).toString('hex')}`;
    const ok = await tx(async c => { const d = await c.query('UPDATE users SET balance_cents = balance_cents - $1 WHERE id=$2 AND balance_cents >= $1 RETURNING balance_cents', [cents, req.user.id]);
      if (!d.rowCount) return false;
      await c.query('INSERT INTO ledger (user_id, delta_cents, kind, ref) VALUES ($1,$2,$3,$4)', [req.user.id, -cents, 'run', 'run-' + runId]);
      await c.query("INSERT INTO runs (id, user_id, service, prompt, status, cost_cents) VALUES ($1,$2,$3,$4,'running',$5)", [runId, req.user.id, service, prompt.slice(0, 2000), cents]); return true; });
    if (!ok) return res.status(402).json({ error: 'Not enough credits. Buy a credit pack first.' });
    res.json({ runId, cost: spec.cost });
    try { const out = await execute(service, prompt, runId); await q("UPDATE runs SET status='done', result=$2, finished_at=now() WHERE id=$1", [runId, JSON.stringify(out.result)]); }
    catch (e) { await q('UPDATE runs SET error=$2 WHERE id=$1', [runId, String(e.message).slice(0, 200)]); await refundRun(runId, 'run failed'); }
  }));

  // Stripe Checkout (REST API, no SDK).
  const stripe = (p, form) => fetch('https://api.stripe.com/v1/' + p, { method: 'POST', headers: { authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) }).then(r => r.json());
  app.post('/api/checkout', auth, wrap(async (req, res) => {
    if (!flags().payments) return res.status(503).json({ error: 'Card payments are not enabled yet.' });
    const id = String(req.body?.pack || ''); const p = PACKS[id]; if (!p) return res.status(400).json({ error: 'Unknown pack.' });
    const s = await stripe('checkout/sessions', { mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(p.usd * 100), 'line_items[0][price_data][product_data][name]': `ComputeCred · ${p.credits} AI credits`,
      customer_email: req.user.email, client_reference_id: String(req.user.id), 'metadata[user_id]': String(req.user.id), 'metadata[pack]': id, 'metadata[credits]': String(p.credits),
      success_url: `${BASE()}/?paid=1#account`, cancel_url: `${BASE()}/?canceled=1#account` });
    if (!s.url) { console.error('stripe session error', s.error?.message); return res.status(502).json({ error: 'Payment provider error.' }); }
    res.json({ url: s.url });
  }));
  app.post('/api/stripe/webhook', express.raw({ type: '*/*', limit: '1mb' }), wrap(async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET; if (!secret || !enabled()) return res.status(503).end();
    const sig = String(req.headers['stripe-signature'] || ''); const parts = Object.fromEntries(sig.split(',').map(x => x.split('=')));
    const t = parts.t, v1s = sig.split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3));
    const exp = crypto.createHmac('sha256', secret).update(`${t}.${req.body}`).digest('hex');
    const good = v1s.some(v => v.length === exp.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(exp)));
    if (!good || Math.abs(Date.now() / 1000 - Number(t)) > 300) return res.status(400).send('bad signature');
    const ev = JSON.parse(req.body);
    if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
      const s = ev.data.object;
      if (s.payment_status === 'paid') {
        const p = PACKS[s.metadata?.pack]; const uid = Number(s.metadata?.user_id);
        if (p && uid && s.amount_total === p.usd * 100) await credit(uid, p.credits * 100, 'purchase', 'stripe-' + s.id, { usd: p.usd, livemode: ev.livemode, pack: s.metadata.pack });
        else console.error('webhook: pack/amount mismatch', s.id);
      }
    }
    res.json({ received: true });
  }));

  // Admin revenue view: header x-admin-token must equal ADMIN_TOKEN.
  app.get('/api/admin/stats', wrap(async (req, res) => {
    const want = process.env.ADMIN_TOKEN || '', got = String(req.headers['x-admin-token'] || '');
    if (!want || got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) return res.status(401).json({ error: 'unauthorized' });
    if (!enabled()) return res.json({ accounts: false });
    const [rev, users, runs, recent] = await Promise.all([
      q(`SELECT COALESCE(SUM((meta->>'usd')::numeric),0) usd, COUNT(*) n, COALESCE(SUM(delta_cents),0) credits_cents FROM ledger WHERE kind='purchase' AND COALESCE((meta->>'livemode')::boolean,false)=$1`, [!(req.query.mode === 'test')]),
      q('SELECT COUNT(*) n, COALESCE(SUM(balance_cents),0) outstanding FROM users'),
      q('SELECT service, status, COUNT(*) n, SUM(cost_cents) cents FROM runs GROUP BY 1,2 ORDER BY 1'),
      q("SELECT l.created_at, u.email, l.meta->>'usd' usd, l.meta->>'livemode' live FROM ledger l JOIN users u ON u.id=l.user_id WHERE kind='purchase' ORDER BY l.id DESC LIMIT 25")]);
    const byService = runs.rows.map(r => ({ ...r, est_cost_usd: r.status === 'done' ? (EST_COST_CENTS[r.service] || 0) * r.n / 100 : 0 }));
    const spent = byService.filter(r => r.status === 'done').reduce((a, r) => a + Number(r.cents), 0) / 100, cost = byService.reduce((a, r) => a + r.est_cost_usd, 0);
    res.json({ mode: req.query.mode === 'test' ? 'test' : 'live', revenue_usd: Number(rev.rows[0].usd), purchases: Number(rev.rows[0].n), users: Number(users.rows[0].n),
      outstanding_credits: users.rows[0].outstanding / 100, credits_spent: spent, est_provider_cost_usd: cost, est_gross_margin_usd: spent - cost, byService, recentPurchases: recent.rows });
  }));
};
