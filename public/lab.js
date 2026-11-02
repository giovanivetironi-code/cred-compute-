(async () => {
  const { $, esc, api, toast } = CC; const box = $('labbox'); const me = await api('/api/account');
  if (!me.ok || me.signedIn === false) return box.innerHTML = `<h3>Join the lab</h3><p class="mut">Sign in to run the lab. Each run costs 0.1 credits and computes the next 10 zeros.</p><a class="btn" href="/#account">Sign in</a>`;
  box.innerHTML = `<div class="row between"><div><h3>Compute the next 10 zeros</h3><p class="mut">Costs 0.1 credits ($0.10). Balance: <b id="lbal">${me.balance}</b> credits.</p></div><button class="btn" id="lgo">Run lab · 0.1 credits</button></div>
   <div id="lmsg" class="status" role="status"></div><div class="divider"></div>
   <form id="pf" class="row"><input id="pn" maxlength="30" placeholder="Display name or @handle" aria-label="Display name" value="${esc(me.displayName || '')}" style="flex:1;min-width:200px">
   <label class="mut"><input type="checkbox" id="pp" ${me.publicName ? 'checked' : ''}> Show my name on finds</label><button class="btn ghost">Save</button></form>
   <p class="mut small">Handles are shown as you type them and are not verified.</p>`;
  $('pf').onsubmit = async e => { e.preventDefault(); const r = await api('/api/profile', { displayName: $('pn').value, public: $('pp').checked }); r.ok ? toast('Saved.', 'ok') : toast(r.error || 'Could not save'); };
  $('lgo').onclick = async () => { $('lgo').disabled = true; $('lmsg').innerHTML = '<span class="spin"></span>Computing…';
    const r = await api('/api/lab/run', {}); if (!r.ok) { $('lgo').disabled = false; $('lmsg').textContent = ''; return toast(r.error || 'Failed'); }
    $('lmsg').textContent = `Computing zeros #${r.range[0]}–${r.range[1]}…`;
    const poll = async () => { const x = await api('/api/receipt/' + r.runId); if (x.status === 'running') return setTimeout(poll, 2000);
      $('lgo').disabled = false; $('lmsg').innerHTML = x.status === 'done' ? `Done! <a href="/receipt/${esc(r.runId)}">See your receipt</a>. Reloading…` : 'The run failed and was refunded.'; if (x.status === 'done') setTimeout(() => location.reload(), 1500); }; poll(); };
})();
