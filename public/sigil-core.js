// Deterministic Prompt Sigil generator, shared by the browser and the server (OG images). Input: a prompt or a numeric seed.
(function (root) {
  const A = ['Quiet', 'Velvet', 'Neon', 'Iron', 'Lunar', 'Hollow', 'Golden', 'Feral', 'Crystal', 'Silent', 'Wandering', 'Electric', 'Ancient', 'Tidal', 'Paper', 'Solar'];
  const N = ['Lantern', 'Circuit', 'Oracle', 'Compass', 'Comet', 'Atlas', 'Kraken', 'Prism', 'Engine', 'Cipher', 'Harbor', 'Falcon', 'Garden', 'Tower', 'Signal', 'Mirror'];
  function seedOf(s) { let h = 2166136261 >>> 0; for (const c of String(s).trim().toLowerCase() || 'computecred') { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h || 1; }
  function rng(h) { return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; }; }
  function build(seed) { seed = seed >>> 0 || 1; const r = rng(seed), W = 600, c = W / 2, f = n => n.toFixed(1); let out = '';
    const hue = 170 + r() * 40, h2 = (hue + 120 + r() * 120) % 360, sym = 3 + Math.floor(r() * 9), rings = 3 + Math.floor(r() * 4);
    for (let k = 0; k < rings; k++) { const rad = 40 + k * (200 / rings) + r() * 20, pts = 1 + Math.floor(r() * 4), wob = r() * 40, rot = r() * Math.PI;
      const stroke = `hsla(${f(k % 2 ? h2 : hue)},85%,${55 + k * 5}%,${(0.55 + r() * 0.4).toFixed(2)})`, lw = f(1.5 + r() * 4);
      for (let i = 0; i < sym; i++) { const a = rot + i * 2 * Math.PI / sym; let d = '';
        for (let j = 0; j <= 40; j++) { const u = j / 40, aa = a + (u - 0.5) * (2 * Math.PI / sym) * pts / 2, rr = rad + Math.sin(u * Math.PI * pts) * wob; d += (j ? 'L' : 'M') + f(c + Math.cos(aa) * rr) + ' ' + f(c + Math.sin(aa) * rr); }
        out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${lw}" stroke-linecap="round"/>`;
        if (r() > 0.5) out += `<circle cx="${f(c + Math.cos(a) * rad)}" cy="${f(c + Math.sin(a) * rad)}" r="${f(2 + r() * 5)}" fill="hsl(${f(hue)},90%,70%)"/>`; } }
    out += `<circle cx="${c}" cy="${c}" r="${f(10 + r() * 14)}" fill="#14d4d4"/>`;
    const name = 'The ' + A[Math.floor(r() * A.length)] + ' ' + N[Math.floor(r() * N.length)];
    return { seed, code: seed.toString(36).toUpperCase(), name, inner: out }; }
  function svg(s, { size = 600, label = true } = {}) { const g = s.inner ? s : build(s);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="${size}" height="${size}"><defs><radialGradient id="sgbg"><stop offset="0" stop-color="#12305a"/><stop offset="1" stop-color="#071526"/></radialGradient></defs><rect width="600" height="600" fill="url(#sgbg)"/>${g.inner}${label ? '<text x="300" y="578" text-anchor="middle" font-family="DejaVu Sans, system-ui, sans-serif" font-weight="600" font-size="16" fill="rgba(255,255,255,.55)">computecred.ai/sigil</text>' : ''}</svg>`; }
  const api = { seedOf, build, svg, fromCode: code => parseInt(String(code), 36) >>> 0 };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SigilCore = api;
})(this);
