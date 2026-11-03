// Growth features: live pulse (anonymous aggregate stats), welcome credit (email-verified, rate limited), referral bonuses (paid only after referee's first LIVE purchase).
const crypto = require('crypto');
const WELCOME = { cents: 25, perIp30d: 2, globalDay: 100 };
const REF = { refereeCents: 100, referrerCents: 200, maxRewards: 10 };
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable|maildrop|fakeinbox|throwawaymail|mintemail|emailondeck)\./i;
const canon = e => { let [u, d] = String(e).toLowerCase().split('@'); u = u.split('+')[0]; if (d === 'gmail.com' || d === 'googlemail.com') { u = u.replace(/\./g, ''); d = 'gmail.com'; } return u + '@' + d; };

module.exports = (app, ctx) => {
  const { q, credit, auth, wrap, enabled, sha, BASE, hooks, RUNS, limit, html, setups, esc, cookie, labelOf, isAdmin } = ctx;
  const ipHash = req => sha('cc-ip:' + (req.ip || ''));
  setups.push(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code text UNIQUE; ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_ip text;
    CREATE TABLE IF NOT EXISTS welcome_grants (canon_email text PRIMARY KEY, user_id integer, ip_hash text, created_at timestamptz DEFAULT now());
    CREATE TABLE IF NOT EXISTS referrals (referee_id integer PRIMARY KEY REFERENCES users(id), referrer_id integer REFERENCES users(id), status text NOT NULL DEFAULT 'pending', created_at timestamptz DEFAULT now(), rewarded_at timestamptz)`);

  // ---------- Welcome credit + referral attach, on first email-verified sign-in ----------
  hooks.onSignup = async (uid, req) => {
    const u = (await q('SELECT email FROM users WHERE id=$1', [uid])).rows[0]; const ih = ipHash(req);
    await q('UPDATE users SET signup_ip=$2 WHERE id=$1', [uid, ih]);
    // Referral: cookie set by /r/:code. Not self, not same signup network as referrer.
    const code = String(cookie(req).cc_ref || '');
    if (/^[A-Za-z0-9_-]{8}$/.test(code)) {
      const r = (await q('SELECT id, signup_ip FROM users WHERE ref_code=$1', [code])).rows[0];
      if (r && r.id !== uid && r.signup_ip !== ih) await q('INSERT INTO referrals (referee_id, referrer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid, r.id]);
    }
    if (DISPOSABLE.test(u.email)) return;
    const [ipN, dayN] = (await Promise.all([q("SELECT COUNT(*) n FROM welcome_grants WHERE ip_hash=$1 AND created_at > now() - interval '30 days'", [ih]),
      q("SELECT COUNT(*) n FROM welcome_grants WHERE created_at > now() - interval '1 day'")])).map(x => Number(x.rows[0].n));
    if (ipN >= WELCOME.perIp30d || dayN >= WELCOME.globalDay) return;
    const ins = await q('INSERT INTO welcome_grants (canon_email, user_id, ip_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [canon(u.email), uid, ih]);
    if (ins.rowCount) await credit(uid, WELCOME.cents, 'welcome', 'welcome-' + uid, null);
  };
  // Referral reward: only on the referee's first real (live-mode) purchase. Test-mode purchases never pay out.
  hooks.afterPurchase = async (uid, livemode) => {
    if (!livemode && process.env.REFERRAL_TEST !== '1') return;
    const r = (await q("UPDATE referrals SET status='processing' WHERE referee_id=$1 AND status='pending' RETURNING referrer_id", [uid])).rows[0]; if (!r) return;
    await credit(uid, REF.refereeCents, 'referral', 'ref-in-' + uid, { referrer: r.referrer_id });
    const n = Number((await q("SELECT COUNT(*) n FROM referrals WHERE referrer_id=$1 AND status='rewarded'", [r.referrer_id])).rows[0].n);
    if (n < REF.maxRewards) await credit(r.referrer_id, REF.referrerCents, 'referral', 'ref-out-' + uid, { referee: uid });
    await q("UPDATE referrals SET status=$2, rewarded_at=now() WHERE referee_id=$1", [uid, n < REF.maxRewards ? 'rewarded' : 'capped']);
  };
  app.get('/r/:code', limit(30, 60_000), (req, res) => {
    const c = String(req.params.code); if (/^[A-Za-z0-9_-]{8}$/.test(c)) res.setHeader('Set-Cookie', `cc_ref=${c}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`);
    res.redirect('/?invited=1#account');
  });
  app.get('/api/referral', (req, res, next) => !cookie(req).cc_session ? res.json({ signedIn: false }) : next());
  app.get('/api/referral', auth, limit(30, 60_000), wrap(async (req, res) => {
    let code = req.user.ref_code;
    if (!code) { code = crypto.randomBytes(6).toString('base64url'); await q('UPDATE users SET ref_code=$2 WHERE id=$1 AND ref_code IS NULL', [req.user.id, code]); code = (await q('SELECT ref_code FROM users WHERE id=$1', [req.user.id])).rows[0].ref_code; }
    const s = (await q("SELECT status, COUNT(*) n FROM referrals WHERE referrer_id=$1 GROUP BY 1", [req.user.id])).rows; const by = Object.fromEntries(s.map(x => [x.status, Number(x.n)]));
    res.json({ link: `${BASE()}/r/${code}`, joined: (by.pending || 0) + (by.processing || 0) + (by.rewarded || 0) + (by.capped || 0), rewarded: by.rewarded || 0, earned: (by.rewarded || 0) * REF.referrerCents / 100,
      max: REF.maxRewards, refereeBonus: REF.refereeCents / 100, referrerBonus: REF.referrerCents / 100 });
  }));
  app.get('/api/welcome', (_, res) => res.json({ credits: WELCOME.cents / 100 }));

  // ---------- Live pulse: anonymous aggregates only, cached 60 s ----------
  let cache = { t: 0, v: null };
  async function pulse() {
    if (Date.now() - cache.t < 60_000 && cache.v) return cache.v;
    if (!enabled()) return { runsToday: 0, runsTotal: 0, zeros: 0, votes: 0, gifts: 0, prompts: 0, recent: [] };
    const one = async (s) => Number((await q(s)).rows[0].n);
    const [runsToday, runsTotal, zeros, votes, gifts, prompts, recent, byHour] = await Promise.all([
      one("SELECT COUNT(*) n FROM runs WHERE status='done' AND created_at > now() - interval '24 hours'"), one("SELECT COUNT(*) n FROM runs WHERE status='done'"),
      one('SELECT COUNT(*) n FROM lab_zeros'), one('SELECT COUNT(*) n FROM duels WHERE vote IS NOT NULL'), one("SELECT COUNT(*) n FROM gifts WHERE status='claimed'"),
      one('SELECT COUNT(*) n FROM prompts WHERE NOT hidden'),
      q("SELECT service, latency_ms, finished_at FROM runs WHERE status='done' ORDER BY finished_at DESC NULLS LAST LIMIT 8"),
      q("SELECT date_trunc('hour', created_at) h, COUNT(*) n FROM runs WHERE status='done' AND created_at > now() - interval '24 hours' GROUP BY 1")]);
    const hours = Array.from({ length: 24 }, (_, i) => { const h = new Date(Math.floor(Date.now() / 3600e3) * 3600e3 - (23 - i) * 3600e3).getTime(); return Number(byHour.rows.find(r => new Date(r.h).getTime() === h)?.n || 0); });
    cache = { t: Date.now(), v: { runsToday, runsTotal, zeros, votes, gifts, prompts, hours, recent: recent.rows.map(r => ({ label: labelOf(r.service), latencyMs: r.latency_ms, at: r.finished_at })) } };
    return cache.v;
  }
  app.get('/api/pulse', limit(60, 60_000), wrap(async (req, res) => { res.setHeader('Cache-Control', 'public, max-age=30'); res.json(await pulse()); }));
  app.get('/live', limit(60, 60_000), wrap(async (req, res) => html(res, { title: 'Live pulse', desc: 'Live, anonymous stats from ComputeCred: AI runs today, zeta zeros verified, duel votes and more.', url: '/live', body: `
<div class="eyebrow">Live pulse</div><h1>What's happening on ComputeCred right now</h1>
<p class="sub">Anonymous totals, updated every minute. No prompts, names or emails are ever shown here.</p>
<div class="pulsegrid" id="pg" aria-live="polite"></div>
<h2 class="h3">AI runs, last 24 hours</h2><div class="spark" id="spark" role="img" aria-label="Runs per hour over the last 24 hours"></div>
<h2 class="h3">Latest finished runs</h2><ul class="feed" id="feed"></ul>
<p class="mut small">Want to add to these numbers? <a href="/#account">Sign in</a> and get a free welcome credit to try any service.</p>`,
    script: '<script src="/pulse.js"></script>' })));

  // ---------- Invite page ----------
  app.get('/invite', limit(60, 60_000), (req, res) => html(res, { title: 'Invite friends', desc: `Invite a friend to ComputeCred. When they buy their first credit pack, they get ${REF.refereeCents / 100} bonus credit and you get ${REF.referrerCents / 100}.`, url: '/invite', body: `
<div class="eyebrow">Referral program</div><h1>Give ${REF.refereeCents / 100} credit, get ${REF.referrerCents / 100} credits</h1>
<p class="sub">Share your link. When a friend signs up with it and buys their first credit pack, they get <b>${REF.refereeCents / 100} bonus credit</b> and you get <b>${REF.referrerCents / 100} credits</b>. Up to ${REF.maxRewards} rewarded invites per account.</p>
<div class="card" id="inv"><p class="mut">Loading…</p></div>
<h2 class="h3">Rules</h2><ul class="mut"><li>Bonuses are paid only after your friend's first paid purchase, not at sign-up.</li><li>Your friend must be a new account. Self-referrals and referrals from the same network don't count.</li>
<li>Bonus credits are store credit with no cash value. We can reverse bonuses tied to fraud, chargebacks or abuse. See the <a href="/terms.html">Terms</a>.</li></ul>`,
    script: '<script src="/invite.js"></script>' }));
};
