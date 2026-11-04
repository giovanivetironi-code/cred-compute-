// Temperature Lab: hand-made next-word distributions, real softmax(T) + top-p sampling, animated.
(() => { const $ = id => document.getElementById(id), esc = t => String(t).replace(/[&<>]/g, '');
  const SEEDS = { 'The robot opened the door and saw': [['a', 3.2], ['the', 2.9], ['its', 1.6], ['nothing', 1.4], ['light', 1.1], ['another', 1], ['stars', .6], ['grandma', -.2], ['spaghetti', -1.2], ['infinity', -.6]],
    'My favorite thing about mornings is': [['the', 3.3], ['coffee', 3], ['waking', 1.8], ['silence', 1.4], ['sunlight', 1.5], ['breakfast', 1.3], ['birds', .8], ['nothing', .4], ['dragons', -1.4], ['taxes', -1.8]],
    'The best way to learn to code is': [['to', 3.6], ['by', 3.1], ['practice', 1.9], ['building', 1.7], ['reading', .9], ['failing', .6], ['patience', .5], ['asking', .4], ['vibes', -1], ['osmosis', -1.6]] };
  const NEXT = ['small', 'quiet', 'glowing', 'world', 'friend', 'and', 'then', 'it', 'felt', 'like', 'home', 'forever', 'every', 'day', 'with', 'wonder', 'of', 'new', 'ideas', 'together', 'strange', 'machines', 'dancing', 'softly', 'purple', 'thunder', 'whispered', 'banana', 'quantum', 'socks'];
  const H = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  let ctx = [], cands;
  function logits(text) { if (!ctx.length) return SEEDS[$('tl-seed').value]; const h = H(text); // later words: pseudo-model, common words favored, odd words in the tail
    return NEXT.map((w, i) => [w, (i < 20 ? 2.6 - i * .11 : -1 - (i - 20) * .2) + ((H(w + h) % 100) / 100) * 1.6]).sort((a, b) => b[1] - a[1]).slice(0, 10); }
  function dist(L, T, P) { const ps = T < .01 ? L.map((_, i) => +(i === L.reduce((bi, x, j) => x[1] > L[bi][1] ? j : bi, 0))) : (() => { const m = Math.max(...L.map(x => x[1])), e = L.map(x => Math.exp((x[1] - m) / T)), s = e.reduce((a, b) => a + b); return e.map(x => x / s); })();
    const ord = ps.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]); let c = 0; const keep = new Set(); for (const [p, i] of ord) { if (c < P || !keep.size) keep.add(i); c += p; }
    const s = ps.reduce((a, p, i) => a + (keep.has(i) ? p : 0), 0); return L.map((x, i) => ({ w: x[0], p: keep.has(i) ? ps[i] / s : 0, cut: !keep.has(i) })); }
  const text = () => $('tl-seed').value + ' ' + ctx.join(' ');
  function render(pick) { const T = +$('tl-t').value, P = +$('tl-p').value; $('tl-tv').textContent = T.toFixed(2); $('tl-pv').textContent = P.toFixed(2);
    cands = dist(logits(text()), T, P); $('tl-text').innerHTML = esc($('tl-seed').value) + ' ' + ctx.map((w, i) => `<mark class="${i === ctx.length - 1 && pick ? 'new' : ''}">${esc(w)}</mark>`).join(' ') + '<span class="tl-caret">▍</span>';
    $('tl-bars').innerHTML = cands.map(c => `<div class="tl-row${c.cut ? ' cut' : ''}${pick === c.w ? ' hit' : ''}"><span>${esc(c.w)}</span><div class="tl-track"><i style="width:${(c.p * 100).toFixed(1)}%"></i></div><b>${c.cut ? 'cut' : (c.p * 100).toFixed(c.p < .01 ? 2 : 1) + '%'}</b></div>`).join('');
    $('tl-note').textContent = T < .01 ? 'Temperature 0: the model always takes the top word. Predictable.' : T > 1.4 ? 'Very hot: unlikely words get real chances. Expect chaos.' : 'Balanced: the favorite usually wins, but not always.'; }
  function sample(cs) { let r = Math.random(), a = 0; for (const c of cs) { a += c.p; if (r < a) return c.w; } return cs[0].w; }
  function step() { if (ctx.length >= 12) ctx = []; const w = sample(cands); ctx.push(w); render(w); }
  let timer; function auto() { if (timer) { clearInterval(timer); timer = null; $('tl-auto').textContent = '▶ Write a sentence'; return; } ctx = []; render(); $('tl-auto').textContent = '■ Stop';
    timer = setInterval(() => { step(); if (ctx.length >= 10) auto(); }, 550); }
  function race() { const box = $('tl-racebox'); box.hidden = false; const P = +$('tl-p').value;
    box.innerHTML = [0, .8, 1.8].map(T => { const save = ctx; ctx = []; for (let i = 0; i < 9; i++) ctx.push(sample(dist(logits(text()), T, P))); const s = ctx.join(' '); ctx = save; return `<div class="pk"><b>T = ${T}</b><span>${esc($('tl-seed').value)} <em>${esc(s)}</em></span></div>`; }).join(''); }
  $('tl-seed').innerHTML = Object.keys(SEEDS).map(s => `<option>${s}</option>`).join('');
  $('tl-seed').onchange = () => { ctx = []; render(); }; $('tl-t').oninput = () => render(); $('tl-p').oninput = () => render();
  $('tl-step').onclick = step; $('tl-auto').onclick = auto; $('tl-race').onclick = race; $('tl-reset').onclick = () => { ctx = []; $('tl-racebox').hidden = true; render(); }; render(); })();
