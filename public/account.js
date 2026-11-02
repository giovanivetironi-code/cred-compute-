(() => {
const $ = id => document.getElementById(id), esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast = (t, k = 'err') => { const d = document.createElement('div'); d.className = 'toast ' + k; d.innerHTML = t; $('toasts').append(d); setTimeout(() => d.remove(), 6000); };
const api = async (p, b) => { const r = await fetch(p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {}); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, ...j }; };
let flags, runs, timer;
const q = new URLSearchParams(location.search);
if (q.get('paid')) toast('Payment received. Your credits will appear in a few seconds.', 'ok');
if (q.get('canceled')) toast('Checkout canceled.', 'ok');
if (q.get('login') === 'expired') toast('That sign-in link expired. Request a new one.');
function show(id) { for (const x of ['acct-off', 'acct-login', 'acct-in']) $(x).hidden = x !== id; }
const acts = r => `<div class="jacts"><button class="btn ghost sm" data-share="${esc(r.id)}" data-on="${r.shared ? 0 : 1}">${r.shared ? 'Make private' : 'Share publicly'}</button>${r.meta?.userRefund ? '<span class="badge refunded">refunded</span>' : (Date.now() - new Date(r.created_at) < 864e5 ? `<button class="btn ghost sm" data-refund="${esc(r.id)}">Didn't like it? Refund</button>` : '')}</div>`;
function render(a) {
  show('acct-in'); $('aemail').textContent = a.email; $('abal').textContent = a.balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
  $('ahist').innerHTML = a.runs.length ? a.runs.map(r => { const res = r.result || {};
    const body = res.kind === 'math' ? `${res.zeros.length} zeros in ${res.seconds}s. First: <code>${esc(res.zeros.slice(0, 5).join(', '))}…</code>`
      : res.kind === 'image' ? `<img src="${esc(res.url || '')}" alt="">` : res.text ? `<div class="out">${esc(res.text)}</div>` : r.error ? `<div class="mut">${esc(r.error)}</div>` : '';
    return `<div class="job"><div class="jh"><b>${esc(runs[r.service]?.label || ({ duel: 'AI duel', market: 'Marketplace prompt' })[r.service.split(':')[0]] || r.service)}</b><span class="badge ${esc(r.status)}">${esc(r.status)}</span><span class="mut">${r.cost_cents / 100} credits · ${new Date(r.created_at).toLocaleString()}</span></div>${r.prompt ? `<div class="mut">“${esc(r.prompt.slice(0, 200))}”</div>` : ''}${body}${r.status === 'done' ? CC.proof(r) + acts(r) : ''}</div>`; }).join('') : 'No runs yet.';
  window.CC_GIFTS && window.CC_GIFTS();
  clearTimeout(timer); if (a.runs.some(r => r.status === 'running') || q.get('paid')) timer = setTimeout(load, 3000);
}
async function load() { const a = await api('/api/account'); if (a.ok && a.signedIn !== false) render(a); else show(flags.login ? 'acct-login' : 'acct-off'); }
async function init() {
  [flags, { runs }] = await Promise.all([api('/api/account/flags'), api('/api/config')]);
  if (!flags.accounts || !flags.login) { $('acct-off-msg').textContent = 'Card accounts are being set up and will open soon. Until then, you can try the wallet app on testnet below.'; return show('acct-off'); }
  for (const [k, r] of Object.entries(runs)) $('arun').add(new Option(`${r.label} · ${r.cost} credits`, k));
  $('arun').onchange = () => { const r = runs[$('arun').value], m = r.kind === 'math'; $('aprompt').style.display = $('aplbl').style.display = m ? 'none' : 'block'; $('acost').textContent = `Cost: ${r.cost} credits ($${r.cost.toFixed(2)})`; }; $('arun').onchange();
  $('packs').innerHTML = Object.entries(flags.packs).map(([k, p]) => `<button class="pack" data-k="${k}"><b>$${p.usd}</b><span>${p.credits} credits</span>${p.credits > p.usd ? ` <em>+${p.credits - p.usd} bonus</em>` : ''}</button>`).join('');
  document.querySelectorAll('.pack').forEach(b => b.onclick = async () => {
    if (!flags.payments) return toast('Card payments open soon. Check back shortly.');
    b.disabled = true; const r = await api('/api/checkout', { pack: b.dataset.k }); b.disabled = false; r.url ? location.href = r.url : toast(esc(r.error || 'Checkout failed')); });
  $('loginf').onsubmit = async e => { e.preventDefault(); $('loginb').disabled = true; const r = await api('/api/auth/start', { email: $('email').value }); $('loginb').disabled = false;
    if (!r.ok) return toast(esc(r.error || 'Could not send link'));
    $('loginmsg').innerHTML = r.devLink ? `Dev mode: <a href="${esc(r.devLink)}">sign in</a>` : 'Check your inbox for a sign-in link. It expires in 20 minutes.'; };
  $('logout').onclick = async e => { e.preventDefault(); await api('/api/auth/logout', {}); show('acct-login'); };
  $('astart').onclick = async () => { $('astart').disabled = true; $('amsg').innerHTML = '<span class="spin"></span>Running…';
    const r = await api('/api/account/run', { service: $('arun').value, prompt: $('aprompt').value }); $('astart').disabled = false; $('amsg').innerHTML = '';
    if (!r.ok) return toast(esc(r.error || 'Run failed')); toast(`Started. ${r.cost} credits charged; refunded automatically if it fails.`, 'ok'); load(); };
  $('ahist').onclick = async e => { const f = e.target.closest('[data-refund]');
    if (f) { if (!confirm('Refund this run? Limits: within 24 hours, up to 3 per day and 20% of this month\'s spend (minimum 1 credit).')) return; f.disabled = true;
      const r = await api(`/api/runs/${f.dataset.refund}/refund`, {}); f.disabled = false; if (!r.ok) return toast(esc(r.error || 'Refund failed')); toast(`Refunded ${r.refunded} credits.`, 'ok'); return load(); }
    const b = e.target.closest('[data-share]'); if (!b) return; b.disabled = true;
    const r = await api(`/api/receipt/${b.dataset.share}/share`, { shared: b.dataset.on === '1' }); b.disabled = false;
    if (!r.ok) return toast(esc(r.error || 'Could not update')); toast(r.shared ? 'Receipt is public. Anyone with the link can see the prompt and result.' : 'Receipt is private again.', 'ok'); load(); };
  window.CC_RELOAD = load;
  load();
}
init().catch(() => show('acct-off'));
})();
