(async () => { const $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { items } = await (await fetch('/api/menu')).json(), BY = Object.fromEntries(items.map(i => [i.k, i]));
  const ICON = { chat: '💬', writing: '✍️', research: '🔎', coding: '🧩', image: '🎨', zeros10: '∑', zeros50: '∑' }, SECS = { chat: 4, writing: 6, research: 9, coding: 8, image: 7, zeros10: 0.5, zeros50: 1.5 };
  const TPL = [['Blog post factory', [['research', 'Key facts about home solar in 2026'], ['writing', 'Turn the research into an 800-word post'], ['image', 'Hero image: rooftop solar at sunset']]],
    ['Ship a feature', [['chat', 'List edge cases for a signup form'], ['coding', 'Write the validation code'], ['coding', 'Write unit tests for it']]],
    ['Launch kit', [['research', 'Competitor summary'], ['writing', 'Launch tweet thread'], ['writing', 'Launch email'], ['image', 'Launch banner']]], ['Math night', [['zeros50', 'First 50 zeta zeros'], ['chat', 'Explain the Riemann hypothesis simply']]]];
  let flow = []; try { if (location.hash.length > 1) flow = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1))))).filter(s => BY[s[0]]).slice(0, 12); } catch {}
  if (!flow.length) flow = TPL[0][1].map(s => [...s]);
  $('fl-tpl').innerHTML = '<span class="mut">Templates:</span> ' + TPL.map((t, i) => `<button class="chip" data-t="${i}">${t[0]}</button>`).join('');
  $('fl-add').innerHTML = '<span class="mut">Add step:</span> ' + items.map(i => `<button class="chip" data-a="${i.k}">${ICON[i.k] || '•'} ${esc(i.label.replace(/ \(.*\)/, ''))}</button>`).join('');
  $('fl-tpl').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { flow = TPL[b.dataset.t][1].map(s => [...s]); render(); } };
  $('fl-add').onclick = e => { const b = e.target.closest('[data-a]'); if (b && flow.length < 12) { flow.push([b.dataset.a, '']); render(); $('fl-nodes').lastElementChild?.querySelector('input')?.focus(); } };
  function wires() { const svg = $('fl-wires'), box = $('fl-canvas').getBoundingClientRect(), ns = [...$('fl-nodes').children]; svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`); let p = '';
    for (let i = 0; i < ns.length - 1; i++) { const a = ns[i].getBoundingClientRect(), b = ns[i + 1].getBoundingClientRect(); const row = Math.abs(a.top - b.top) < 10;
      const [x1, y1, x2, y2] = row ? [a.right - box.left, a.top + a.height / 2 - box.top, b.left - box.left, b.top + b.height / 2 - box.top] : [a.left + a.width / 2 - box.left, a.bottom - box.top, b.left + b.width / 2 - box.left, b.top - box.top];
      const d = row ? `M${x1} ${y1} C${x1 + 30} ${y1} ${x2 - 30} ${y2} ${x2} ${y2}` : `M${x1} ${y1} C${x1} ${y1 + 40} ${x2} ${y2 - 40} ${x2} ${y2}`; p += `<path d="${d}" class="wire"/><path d="${d}" class="wire-flow"/>`; }
    svg.innerHTML = p; }
  function render() { $('fl-nodes').innerHTML = flow.map(([k, note], i) => { const it = BY[k]; return `<li class="fnode" data-i="${i}"><div class="fn-top"><span class="fn-ic">${ICON[k] || '•'}</span><b>${i + 1}. ${esc(it.label)}</b><span class="fn-cost">${it.cost} cr</span></div>
      <input value="${esc(note)}" maxlength="140" placeholder="What should this step do?" aria-label="Step ${i + 1} instructions"><div class="fn-ctl"><button data-m="-1" aria-label="Move step ${i + 1} earlier" ${i ? '' : 'disabled'}>←</button><button data-m="1" aria-label="Move step ${i + 1} later" ${i < flow.length - 1 ? '' : 'disabled'}>→</button><button data-x aria-label="Remove step ${i + 1}">✕</button></div></li>`; }).join('') || '<li class="mut" style="padding:30px">Add a step or pick a template to start.</li>';
    const cost = flow.reduce((s, [k]) => s + BY[k].cost, 0), secs = flow.reduce((s, [k]) => s + (SECS[k] || 5), 0);
    $('fl-sum').innerHTML = `<div class="pk"><b>${flow.length}</b><span>Steps</span></div><div class="pk"><b>${Math.round(cost * 100) / 100} cr</b><span>Total cost ($${cost.toFixed(2)})</span></div><div class="pk"><b>~${secs < 60 ? Math.round(secs) + ' s' : (secs / 60).toFixed(1) + ' min'}</b><span>Expected run time</span></div><div class="pk"><b>${cost ? Math.floor(25 / cost) : '–'}×</b><span>Runs from a $25 pack</span></div>`;
    requestAnimationFrame(wires); }
  $('fl-nodes').addEventListener('input', e => { const li = e.target.closest('.fnode'); if (li) flow[li.dataset.i][1] = e.target.value; });
  $('fl-nodes').addEventListener('click', e => { const b = e.target.closest('button'), li = e.target.closest('.fnode'); if (!b || !li) return; const i = +li.dataset.i;
    if (b.dataset.x !== undefined) flow.splice(i, 1); else { const j = i + +b.dataset.m; [flow[i], flow[j]] = [flow[j], flow[i]]; } render(); });
  addEventListener('resize', () => requestAnimationFrame(wires));
  $('fl-share').onclick = () => { const u = location.origin + '/flow#' + btoa(unescape(encodeURIComponent(JSON.stringify(flow)))); navigator.clipboard.writeText(u).then(() => $('fl-share').textContent = 'Link copied ✓', () => prompt('Copy this link', u)); };
  $('fl-clear').onclick = () => { flow = []; render(); };
  render(); })();
