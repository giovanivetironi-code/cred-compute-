(async () => {
  const { $, esc, api, toast, proof } = CC; let data, me;
  [me, data] = await Promise.all([api('/api/account'), api('/api/market')]); const signed = me.ok && me.signedIn !== false;
  if (signed) { $('mpub-off').hidden = true; $('mform').hidden = false; if (data.myEarnings) $('mearn').textContent = `You've earned ${data.myEarnings} credits from your prompts.`; }
  const draw = () => { const c = $('mcat').value; const list = data.prompts.filter(p => !c || p.category === c);
    $('mlist').innerHTML = list.length ? list.map(p => `<div class="mcard"><span class="pill" style="align-self:flex-start">${esc(p.categoryLabel)}</span><h3 style="margin:4px 0">${esc(p.title)}</h3><p class="mut">${esc(p.description || '')}</p>
      <div class="mut small">by ${esc(p.creator || 'Anonymous')} · ${p.runs} run${p.runs === 1 ? '' : 's'}${p.mine ? ' · yours' : ''}</div><div class="row between" style="margin-top:auto"><b>${p.mine ? (p.price - p.markup).toFixed(2) : p.price.toFixed(2)} credits</b>
      <span><button class="btn sm" data-run="${esc(p.id)}">Run</button>${signed && !p.mine ? ` <button class="btn ghost sm" data-report="${esc(p.id)}" title="Report">⚑</button>` : ''}</span></div></div>`).join('') : '<p class="mut">No prompts here yet. Publish the first one below.</p>'; };
  $('mcat').onchange = draw; draw();
  $('mlist').onclick = async e => { const rp = e.target.closest('[data-report]'); if (rp) { if (!confirm('Report this prompt as inappropriate?')) return; await api(`/api/market/${rp.dataset.report}/report`, {}); return toast('Thanks, we will review it.', 'ok'); }
    const b = e.target.closest('[data-run]'); if (!b) return; const p = data.prompts.find(x => x.id === b.dataset.run); const box = $('mrun'); box.hidden = false;
    if (!signed) { box.innerHTML = `<h3>${esc(p.title)}</h3><p class="mut">Sign in on the <a href="/#account">account page</a> to run this prompt.</p>`; return box.scrollIntoView({ behavior: 'smooth' }); }
    const price = p.mine ? p.price - p.markup : p.price;
    box.innerHTML = `<h3>${esc(p.title)}</h3><label class="lbl" for="mi">Your input</label><textarea id="mi" rows="4"></textarea><div class="row between"><span class="mut">Cost: ${price.toFixed(2)} credits (AI ${(p.price - p.markup).toFixed(2)} + creator ${p.mine ? 0 : p.markup})</span><button class="btn" id="mgo">Run · ${price.toFixed(2)} credits</button></div><div id="mout"></div>`;
    box.scrollIntoView({ behavior: 'smooth' });
    $('mgo').onclick = async () => { $('mgo').disabled = true; $('mout').innerHTML = '<p class="mut"><span class="spin"></span>Running…</p>';
      const r = await api(`/api/market/${p.id}/run`, { input: $('mi').value }); if (!r.ok) { $('mgo').disabled = false; $('mout').innerHTML = ''; return toast(r.error || 'Run failed'); }
      const poll = async () => { const a = await api('/api/account'); const x = (a.runs || []).find(y => y.id === r.runId); if (!x || x.status === 'running') return setTimeout(poll, 2000);
        $('mgo').disabled = false; $('mout').innerHTML = x.status === 'done' ? `<div class="out">${esc(x.result?.text)}</div>${proof(x)}` : '<p class="mut">The run failed and was refunded.</p>'; }; poll(); };
  };
  $('mform').onsubmit = async e => { e.preventDefault(); const r = await api('/api/market', { title: $('mt').value, description: $('md').value, category: $('mc').value, template: $('mp').value, markup: Number($('mm').value) });
    if (!r.ok) return toast(r.error || 'Could not publish'); toast('Published!', 'ok'); $('mform').reset(); data = await api('/api/market'); draw(); };
})();
