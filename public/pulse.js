(() => { const { $, esc } = CC, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ago = t => { const s = Math.max(1, (Date.now() - new Date(t)) / 1000); return s < 60 ? Math.round(s) + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
  let prevTotal = null;
  function show(p) { const k = [['AI runs, 24h', p.runsToday], ['AI runs, all time', p.runsTotal], ['Zeta zeros verified', p.zeros], ['Duel votes', p.votes], ['Gifts claimed', p.gifts], ['Market prompts', p.prompts]];
    $('pg').innerHTML = k.map(([l, v]) => `<div class="pk"><b>${Number(v).toLocaleString()}</b><span>${l}</span></div>`).join(''); $('g-runs').textContent = Number(p.runsToday).toLocaleString();
    const m = Math.max(1, ...p.hours); $('spark').innerHTML = p.hours.map(n => `<i style="height:${Math.max(4, n / m * 100)}%" title="${n} runs"></i>`).join('');
    $('feed').innerHTML = p.recent.length ? p.recent.map(r => `<li><span class="dot"></span>${esc(r.label)}<span class="mut">${[r.latencyMs != null ? (r.latencyMs / 1000).toFixed(1) + ' s' : '', r.at ? ago(r.at) : ''].filter(Boolean).map(x => ' · ' + x).join('')}</span></li>`).join('') : '<li class="mut">No runs yet.</li>';
    if (prevTotal != null && p.runsTotal > prevTotal) for (let i = 0; i < Math.min(6, p.runsTotal - prevTotal); i++) setTimeout(() => arc(true), i * 400); prevTotal = p.runsTotal; }
  const st = (t, ok) => { const e = $('stream-st'); e.textContent = '● ' + t; e.className = 'livebadge' + (ok ? ' on' : ''); };
  // Real-time stream with polling fallback
  let poll; const startPoll = () => { if (poll) return; st('Updating every minute', false); const f = () => fetch('/api/pulse').then(r => r.json()).then(show).catch(() => {}); f(); poll = setInterval(f, 60000); };
  if ('EventSource' in window) { const es = new EventSource('/api/pulse/stream'); let fails = 0;
    es.addEventListener('pulse', e => { fails = 0; st('Live stream', true); show(JSON.parse(e.data)); });
    es.onerror = () => { st('Reconnecting…', false); if (++fails > 3) { es.close(); startPoll(); } }; } else startPoll();
  // ---------- Holographic globe (canvas, no libraries) ----------
  const cv = $('globe'), x = cv.getContext('2d'), S = 640, R = 250, C = S / 2; cv.width = cv.height = S * Math.min(2, devicePixelRatio || 1); x.scale(cv.width / S, cv.width / S);
  const N = 900, pts = Array.from({ length: N }, (_, i) => { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), t = i * 2.39996; return [Math.cos(t) * r, y, Math.sin(t) * r]; });
  let rot = 0, tilt = -.35, vel = RM ? 0 : .003, arcs = [];
  const proj = ([px, py, pz]) => { const c = Math.cos(rot), s = Math.sin(rot), X = px * c + pz * s, Z = -px * s + pz * c, ct = Math.cos(tilt), stt = Math.sin(tilt), Y = py * ct - Z * stt, Z2 = py * stt + Z * ct; return [C + X * R, C + Y * R, Z2]; };
  function arc(real) { const a = pts[Math.random() * N | 0], b = pts[Math.random() * N | 0]; arcs.push({ a, b, t: 0, real }); if (arcs.length > 30) arcs.shift(); }
  function slerp(a, b, t, lift) { const v = a.map((ai, i) => ai * (1 - t) + b[i] * t), l = Math.hypot(...v) || 1, h = 1 + lift * Math.sin(Math.PI * t); return v.map(c => c / l * h); }
  function draw() { const light = document.documentElement.dataset.theme === 'light', col = light ? '10,122,126' : '20,212,212';
    x.clearRect(0, 0, S, S); const g = x.createRadialGradient(C, C, R * .2, C, C, R * 1.25); g.addColorStop(0, `rgba(${col},.10)`); g.addColorStop(.8, `rgba(${col},.03)`); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = `rgba(${col},.35)`; x.lineWidth = 1.5; x.beginPath(); x.arc(C, C, R, 0, 7); x.stroke();
    for (const p of pts) { const [sx, sy, z] = proj(p); if (z < -0.05) { x.fillStyle = `rgba(${col},${.08})`; x.fillRect(sx, sy, 1.2, 1.2); } else { x.fillStyle = `rgba(${col},${.25 + z * .65})`; x.beginPath(); x.arc(sx, sy, .8 + z * 1.4, 0, 7); x.fill(); } }
    for (const A of arcs) { A.t += .012; const end = Math.min(1, A.t), start = Math.max(0, A.t - .45); if (start >= 1) continue; x.beginPath(); let first = true;
      for (let u = start; u <= end; u += .02) { const [sx, sy, z] = proj(slerp(A.a, A.b, u, .25)); if (z < -.2) { first = true; continue; } first ? x.moveTo(sx, sy) : x.lineTo(sx, sy); first = false; }
      x.strokeStyle = A.real ? (light ? 'rgba(37,99,235,.9)' : 'rgba(96,165,250,.95)') : `rgba(${col},.55)`; x.lineWidth = A.real ? 2.5 : 1.4; x.shadowColor = `rgba(${col},.8)`; x.shadowBlur = 8; x.stroke(); x.shadowBlur = 0;
      if (A.t >= 1 && A.t < 1.3) { const [sx, sy, z] = proj(A.b); if (z > 0) { x.strokeStyle = `rgba(${col},${1.3 - A.t})`; x.beginPath(); x.arc(sx, sy, (A.t - 1) * 60, 0, 7); x.stroke(); } } }
    arcs = arcs.filter(a => a.t < 1.5); }
  let vis = true, dragging = false, lx = 0, ly = 0;
  new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(cv);
  (function loop() { if (vis && !document.hidden) { if (!dragging) rot += vel; if (!RM && Math.random() < .03) arc(false); draw(); } requestAnimationFrame(loop); })();
  cv.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; rot += (e.clientX - lx) * .008; tilt = Math.max(-1.2, Math.min(1.2, tilt + (e.clientY - ly) * .006)); lx = e.clientX; ly = e.clientY; if (RM) draw(); });
  cv.addEventListener('pointerup', () => dragging = false); if (RM) { for (let i = 0; i < 5; i++) arc(false); arcs.forEach(a => a.t = .8); draw(); }
})();
