(() => { const $ = id => document.getElementById(id), S = window.SigilCore, box = $('sg'), fixed = box.dataset.code;
  let cur;
  function draw(seed) { cur = S.build(seed); box.innerHTML = S.svg(cur); $('sg-name').textContent = cur.name + ' · #' + cur.code; }
  if (fixed) { draw(S.fromCode(fixed)); } else { const inp = $('sg-in'); if (location.hash.length > 1) try { inp.value = decodeURIComponent(location.hash.slice(1)); } catch {}
    inp.addEventListener('input', () => draw(S.seedOf(inp.value))); draw(S.seedOf(inp.value)); }
  $('sg-dl').onclick = () => { const img = new Image(), cv = document.createElement('canvas'); cv.width = cv.height = 1200;
    img.onload = () => { cv.getContext('2d').drawImage(img, 0, 0, 1200, 1200); const a = document.createElement('a'); a.download = 'prompt-sigil-' + cur.code + '.png'; a.href = cv.toDataURL('image/png'); a.click(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(S.svg(cur, { size: 1200 })); };
  const sh = $('sg-share'); if (sh) sh.onclick = async () => { const u = location.origin + '/sigil/s/' + cur.code;
    try { if (navigator.share && matchMedia('(pointer:coarse)').matches) return await navigator.share({ title: cur.name + ' · Prompt Sigil', url: u }); await navigator.clipboard.writeText(u); sh.textContent = 'Link copied ✓'; } catch { prompt('Copy this link', u); } };
})();
