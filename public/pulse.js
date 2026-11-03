(async () => { const { $, esc } = CC;
  const ago = t => { const s = Math.max(1, (Date.now() - new Date(t)) / 1000); return s < 60 ? Math.round(s) + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
  async function load() { const p = await (await fetch('/api/pulse')).json();
    const k = [['AI runs, 24h', p.runsToday], ['AI runs, all time', p.runsTotal], ['Zeta zeros verified', p.zeros], ['Duel votes', p.votes], ['Gifts claimed', p.gifts], ['Market prompts', p.prompts]];
    $('pg').innerHTML = k.map(([l, v]) => `<div class="pk"><b>${Number(v).toLocaleString()}</b><span>${l}</span></div>`).join('');
    const m = Math.max(1, ...p.hours); $('spark').innerHTML = p.hours.map(n => `<i style="height:${Math.max(4, n / m * 100)}%" title="${n} runs"></i>`).join('');
    $('feed').innerHTML = p.recent.length ? p.recent.map(r => `<li><span class="dot"></span>${esc(r.label)}<span class="mut"> · ${r.latencyMs != null ? (r.latencyMs / 1000).toFixed(1) + ' s' : ''} · ${r.at ? ago(r.at) : ''}</span></li>`).join('') : '<li class="mut">No runs yet.</li>'; }
  await load(); setInterval(load, 60000);
})();
