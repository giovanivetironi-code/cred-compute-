(() => { const $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const local = d => new Date(d - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const f = $('cap-f');
  if (f) { $('cap-d').value = local(new Date(Date.now() + 365 * 864e5)); $('cap-d').min = local(new Date(Date.now() + 3700e3));
    document.querySelectorAll('#cap-quick [data-d]').forEach(b => b.onclick = () => $('cap-d').value = local(new Date(Date.now() + b.dataset.d * 864e5)));
    f.onsubmit = async e => { e.preventDefault(); $('cap-msg').textContent = 'Sealing…';
      const r = await fetch('/api/capsule', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: $('cap-t').value, body: $('cap-b').value, openAt: new Date($('cap-d').value).toISOString() }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) return $('cap-msg').textContent = j.error || 'Something went wrong.'; location.href = j.url; }; }
  const v = $('cap-view'); if (!v) return; const id = location.pathname.split('/').pop();
  fetch('/api/capsule/' + encodeURIComponent(id)).then(r => r.ok ? r.json() : null).then(c => {
    if (!c) return v.innerHTML = '<h1>Capsule not found</h1><p class="mut">Check the link and try again.</p>';
    const head = `<h1>${esc(c.title || 'A sealed time capsule')}</h1><p class="mut">Sealed ${new Date(c.createdAt).toLocaleDateString()} · opens ${new Date(c.openAt).toLocaleString()}</p>`;
    if (c.opened) return v.innerHTML = head + `<div class="capopen">🔓<blockquote>${esc(c.body).replace(/\n/g, '<br>')}</blockquote></div>`;
    v.innerHTML = head + `<div class="caplock">🔒</div><div class="capcount" id="cc"></div><p class="mut">The message stays sealed on our server until then.</p><button class="btn ghost" id="cap-copy">Copy link</button>`;
    $('cap-copy').onclick = () => navigator.clipboard.writeText(location.href).then(() => $('cap-copy').textContent = 'Link copied ✓');
    const tick = () => { let s = Math.max(0, (new Date(c.openAt) - Date.now()) / 1000); if (!s) return location.reload();
      const p = [[Math.floor(s / 86400), 'days'], [Math.floor(s % 86400 / 3600), 'hours'], [Math.floor(s % 3600 / 60), 'min'], [Math.floor(s % 60), 'sec']];
      $('cc').innerHTML = p.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join(''); }; tick(); setInterval(tick, 1000); });
})();
