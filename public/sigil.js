(() => { const $ = id => document.getElementById(id), cv = $('sg'), x = cv.getContext('2d');
  // FNV-style seeded PRNG from the prompt text
  function seed(s) { let h = 2166136261 >>> 0; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h || 1; }
  function rng(h) { return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
  const A = ['Quiet', 'Velvet', 'Neon', 'Iron', 'Lunar', 'Hollow', 'Golden', 'Feral', 'Crystal', 'Silent', 'Wandering', 'Electric', 'Ancient', 'Tidal', 'Paper', 'Solar'];
  const N = ['Lantern', 'Circuit', 'Oracle', 'Compass', 'Comet', 'Atlas', 'Kraken', 'Prism', 'Engine', 'Cipher', 'Harbor', 'Falcon', 'Garden', 'Tower', 'Signal', 'Mirror'];
  function draw(t) { const s = t.trim().toLowerCase() || 'computecred', r = rng(seed(s)), W = 600, c = W / 2;
    const hue = 170 + r() * 40, h2 = (hue + 120 + r() * 120) % 360;
    const g = x.createRadialGradient(c, c, 20, c, c, c); g.addColorStop(0, '#12305a'); g.addColorStop(1, '#071526'); x.fillStyle = g; x.fillRect(0, 0, W, W);
    const sym = 3 + Math.floor(r() * 9), rings = 3 + Math.floor(r() * 4); x.lineCap = 'round';
    for (let k = 0; k < rings; k++) { const rad = 40 + k * (200 / rings) + r() * 20, pts = 1 + Math.floor(r() * 4), wob = r() * 40, rot = r() * Math.PI;
      x.strokeStyle = `hsla(${k % 2 ? h2 : hue},85%,${55 + k * 5}%,${0.55 + r() * 0.4})`; x.lineWidth = 1.5 + r() * 4;
      for (let i = 0; i < sym; i++) { const a = rot + i * 2 * Math.PI / sym; x.beginPath();
        for (let j = 0; j <= 40; j++) { const u = j / 40, aa = a + (u - 0.5) * (2 * Math.PI / sym) * pts / 2, rr = rad + Math.sin(u * Math.PI * pts) * wob; const px = c + Math.cos(aa) * rr, py = c + Math.sin(aa) * rr; j ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke(); if (r() > 0.5) { x.fillStyle = `hsl(${hue},90%,70%)`; x.beginPath(); x.arc(c + Math.cos(a) * rad, c + Math.sin(a) * rad, 2 + r() * 5, 0, 7); x.fill(); } } }
    x.fillStyle = '#14d4d4'; x.beginPath(); x.arc(c, c, 10 + r() * 14, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '600 16px system-ui'; x.textAlign = 'center'; x.fillText('computecred.ai/sigil', c, W - 22);
    $('sg-name').textContent = 'The ' + A[Math.floor(r() * A.length)] + ' ' + N[Math.floor(r() * N.length)] + ' · #' + seed(s).toString(36).toUpperCase(); }
  const inp = $('sg-in'); if (location.hash.length > 1) try { inp.value = decodeURIComponent(location.hash.slice(1)); } catch {}
  inp.addEventListener('input', () => draw(inp.value)); draw(inp.value);
  $('sg-dl').onclick = () => { const a = document.createElement('a'); a.download = 'prompt-sigil.png'; a.href = cv.toDataURL('image/png'); a.click(); };
  $('sg-share').onclick = async () => { const u = location.origin + '/sigil#' + encodeURIComponent(inp.value); try { await navigator.clipboard.writeText(u); $('sg-share').textContent = 'Link copied ✓'; } catch { prompt('Copy this link', u); } };
})();
