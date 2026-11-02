(async () => {
  const { $, esc, api, toast, proof } = CC; let cfg, timer;
  const [me, c] = await Promise.all([api('/api/account'), api('/api/duel/config')]); cfg = c.categories;
  if (!me.ok || me.signedIn === false) { $('duel-off').hidden = false; return; } $('duel-on').hidden = false;
  for (const [k, v] of Object.entries(cfg)) $('dcat').add(new Option(v.label, k));
  const cost = () => { const v = cfg[$('dcat').value]; $('dcost').textContent = `Cost: ${v.cost} credits for both answers ($${v.cost.toFixed(2)}). Your balance: ${me.balance}`; }; $('dcat').onchange = cost; cost();
  $('dgo').onclick = async () => { const v = cfg[$('dcat').value];
    if (!confirm(`This duel costs ${v.cost} credits. Continue?`)) return; $('dgo').disabled = true;
    const r = await api('/api/duel', { category: $('dcat').value, prompt: $('dprompt').value }); $('dgo').disabled = false;
    if (!r.ok) return toast(r.error || 'Could not start duel'); me.balance = Math.round((me.balance - r.cost) * 100) / 100; cost(); show(r.id); };
  const side = (s, name, pick, voted, win) => `<div class="panel ${win ? 'win' : ''}"><h3>${voted ? esc(s.label) : name}</h3>
    ${s.status === 'done' ? `<div class="out">${esc(s.text)}</div>${proof(s)}` : s.status === 'refunded' ? `<p class="mut">This side failed and was refunded.</p>` : '<p class="mut"><span class="spin"></span>Thinking…</p>'}
    ${!voted && s.status === 'done' ? `<button class="btn vote" data-pick="${pick}">${name} is better</button>` : ''}</div>`;
  async function show(id) { clearTimeout(timer); const d = await api('/api/duel/' + id); if (!d.ok) return toast(d.error || 'Error');
    const both = d.left.status === 'done' && d.right.status === 'done';
    $('dres').innerHTML = `<div class="cards2" style="margin-top:20px">${side(d.left, 'Answer A', 'left', !!d.vote, d.vote === 'left')}${side(d.right, 'Answer B', 'right', !!d.vote, d.vote === 'right')}</div>
      ${both && !d.vote ? '<p style="text-align:center"><button class="btn ghost vote" data-pick="tie">It\'s a tie</button></p>' : ''}${d.vote ? '<p class="mut" style="text-align:center">Thanks for voting! Models revealed above. Refresh to see the updated leaderboard.</p>' : ''}`;
    $('dres').querySelectorAll('[data-pick]').forEach(b => b.onclick = async () => { const r = await api(`/api/duel/${id}/vote`, { pick: b.dataset.pick }); if (!r.ok) return toast(r.error); show(id); });
    if (['running', 'queued'].includes(d.left.status) || ['running', 'queued'].includes(d.right.status)) timer = setTimeout(() => show(id), 2500); }
})();
