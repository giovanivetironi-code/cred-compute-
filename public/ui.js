// Shared helpers for ComputeCred feature pages.
window.CC = (() => {
  const $ = id => document.getElementById(id);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (p, b) => { const r = await fetch(p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {}); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, ...j }; };
  const toast = (t, k = 'err') => { let box = $('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.append(box); }
    const d = document.createElement('div'); d.className = 'toast ' + k; d.textContent = t; box.append(d); setTimeout(() => d.remove(), 6000); };
  const proof = r => { const t = r.tokens; return `<div class="proof">
    <div><span>Model</span><b>${esc(r.model || '—')}</b></div><div><span>Latency</span><b>${r.latency_ms != null ? (r.latency_ms / 1000).toFixed(2) + ' s' : '—'}</b></div>
    <div><span>Tokens</span><b>${t ? `${t.prompt ?? '?'} in · ${t.completion ?? '?'} out` : 'n/a'}</b></div><div><span>Cost</span><b>${(r.cost_cents / 100)} credits</b></div>
    <div><span>Time</span><b>${new Date(r.created_at).toLocaleString()}</b></div><div><span>Receipt</span><b><a class="mono" href="/receipt/${esc(r.id)}" target="_blank" rel="noopener">${esc(r.id)}</a></b></div></div>`; };
  return { $, esc, api, toast, proof };
})();
