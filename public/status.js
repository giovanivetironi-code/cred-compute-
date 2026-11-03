(() => { const $ = id => document.getElementById(id), esc = CC.esc;
  async function load() { let s; try { s = await (await fetch('/api/status', { cache: 'no-store' })).json(); } catch { $('st-head').textContent = 'Status unavailable'; return; }
    const bad = s.comps.filter(c => !c.ok); $('st-head').innerHTML = bad.length ? `<span class="st-dot warn"></span>${bad.length} system${bad.length > 1 ? 's' : ''} need attention` : '<span class="st-dot ok"></span>All systems operational';
    $('st-sub').textContent = 'Last checked ' + new Date(s.at).toLocaleTimeString() + '. Every part of ComputeCred is checked automatically each minute.';
    $('st-list').innerHTML = s.comps.map(c => `<div class="st-row"><span class="st-dot ${c.ok ? 'ok' : 'warn'}"></span><b>${esc(c.name)}</b><span class="mut">${esc(c.note)}</span><span class="st-tag ${c.ok ? 'ok' : 'warn'}">${c.ok ? 'Operational' : 'Degraded'}</span></div>`).join('');
    $('st-bars').innerHTML = s.buckets.map((b, i) => { const t = new Date(Date.now() - (48 - i) * 18e5).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); return `<i class="${!b ? 'nd' : b.ok === 1 ? 'ok' : b.ok > .9 ? 'part' : 'bad'}" title="${t}: ${!b ? 'no data' : Math.round(b.ok * 100) + '% healthy, db ' + b.ms + ' ms'}"></i>`; }).join('');
    const up = Math.round((Date.now() - new Date(s.uptimeSince)) / 36e5 * 10) / 10;
    $('st-kpi').innerHTML = [[s.uptimePct != null ? s.uptimePct + '%' : '–', 'Healthy checks'], [s.checks.toLocaleString(), 'Checks run'], [(s.dbMs ?? '–') + ' ms', 'Database response'], [up < 48 ? up + ' h' : Math.round(up / 24) + ' d', 'Since last update']].map(([v, l]) => `<div class="pk"><b>${v}</b><span>${l}</span></div>`).join(''); }
  load(); setInterval(load, 30000); })();
