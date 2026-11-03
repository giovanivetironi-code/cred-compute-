// Site-wide "advanced" layer: command palette (Ctrl/Cmd-K), theme toggle, scroll reveal, hero canvas, PWA registration.
(() => { const d = document, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CMDS = [['Home', '/', 'Start page'], ['Services', '/#services', 'What you can run'], ['Pricing', '/#pricing', 'Credit packs'], ['Account & sign in', '/#account', 'Email sign-in, balance, buy credits'],
    ['AI Duel', '/duel', 'Two models, one prompt, you vote'], ['Prompt Market', '/market', 'Prompts made by creators'], ['Math lab', '/lab', 'Verified Riemann zeta zeros'],
    ['Prompt Sigil', '/sigil', 'Turn a prompt into an emblem'], ['Time Capsule', '/capsule', 'Seal a message for the future'], ['Compute Menu', '/menu', 'What your budget buys'],
    ['Prompt Nutrition Label', '/label', 'Grade and dissect a prompt'], ['Context Window Ruler', '/ruler', 'Measure text against AI memory'], ['Flow Planner', '/flow', 'Design an AI pipeline and price it'], ['Keyboard shortcuts', '#keys', 'Press ? anytime'], ['Live pulse', '/live', 'Real-time stats and the compute globe'], ['Invite friends', '/invite', 'Bonus credits for referrals'], ['FAQ', '/#faq', 'Common questions'],
    ['Terms', '/terms.html', 'Terms of service'], ['Privacy', '/privacy.html', 'Privacy policy'], ['Email support', 'mailto:support@computecred.ai', 'support@computecred.ai'], ['Toggle light / dark theme', '#theme', 'Switch colors']];
  // ---------- theme ----------
  const setTheme = t => { d.documentElement.dataset.theme = t; try { localStorage.cc_theme = t; } catch {} const b = d.getElementById('fx-theme'); if (b) { b.textContent = t === 'light' ? '☾' : '☀'; b.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme'); }
    d.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'light' ? '#f4f8fc' : '#06142b'); };
  const toggle = () => setTheme(d.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  // ---------- palette ----------
  let pal, list, inp, sel = 0, shown = [];
  function build() { pal = d.createElement('div'); pal.className = 'fx-pal'; pal.hidden = true; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Search ComputeCred');
    pal.innerHTML = '<div class="fx-box"><input type="search" placeholder="Search pages and actions…" aria-label="Search pages and actions" aria-controls="fx-list" autocomplete="off"><ul id="fx-list" role="listbox"></ul><p class="fx-hint"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p></div>';
    d.body.appendChild(pal); inp = pal.querySelector('input'); list = pal.querySelector('ul');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (SR) { const mic = d.createElement('button'); mic.type = 'button'; mic.className = 'fx-mic'; mic.setAttribute('aria-label', 'Search by voice'); mic.textContent = '🎙';
      pal.querySelector('.fx-box').appendChild(mic); let rec;
      mic.onclick = () => { if (rec) return rec.stop(); rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; mic.classList.add('rec'); inp.placeholder = 'Listening… say "open time capsule" or "dark mode"';
        rec.onresult = e => { const t = [...e.results].map(r => r[0].transcript).join(' ').toLowerCase().replace(/[.?!]/g, '').trim(); const q = t.replace(/^(open|go to|show( me)?|take me to|navigate to)\s+/, '').replace(/^the\s+/, '');
          if (/\b(dark|light) (mode|theme)\b|switch theme|toggle theme/.test(t)) { if (e.results[e.results.length - 1].isFinal) { const want = /light/.test(t) ? 'light' : /dark/.test(t) ? 'dark' : null; want ? setTheme(want) : toggle(); close(); } return; }
          inp.value = q; sel = 0; render(); if (e.results[e.results.length - 1].isFinal && shown.length && q) setTimeout(() => go(0), 350); };
        rec.onend = rec.onerror = () => { mic.classList.remove('rec'); inp.placeholder = 'Search pages and actions…'; rec = null; }; rec.start(); }; }
    pal.addEventListener('click', e => { if (e.target === pal) close(); const li = e.target.closest('li'); if (li) go(+li.dataset.i); });
    inp.addEventListener('input', () => { sel = 0; render(); });
    inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); } else if (e.key === 'Enter') go(sel); else if (e.key === 'Escape') close(); }); }
  function score(c, q) { if (!q) return 1; const s = (c[0] + ' ' + c[2]).toLowerCase(); if (s.includes(q)) return 2 + (c[0].toLowerCase().startsWith(q) ? 1 : 0); let i = 0; for (const ch of s) if (ch === q[i]) i++; return i === q.length ? 1 : 0; }
  function render() { const q = inp.value.trim().toLowerCase(); shown = CMDS.map(c => [score(c, q), c]).filter(x => x[0]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    list.innerHTML = shown.length ? shown.map((c, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel}" id="fx-o${i}"><b>${esc(c[0])}</b><span>${esc(c[2])}</span></li>`).join('') : '<li class="fx-none">No matches</li>';
    inp.setAttribute('aria-activedescendant', 'fx-o' + sel); list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }); }
  function go(i) { const c = shown[i]; if (!c) return; close(); if (c[1] === '#theme') return toggle(); if (c[1] === '#keys') return cheat(); location.href = c[1]; }
  let prevFocus; function open() { if (!pal) build(); prevFocus = d.activeElement; pal.hidden = false; inp.value = ''; sel = 0; render(); inp.focus(); }
  function close() { if (pal) pal.hidden = true; prevFocus?.focus?.(); }
  d.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal && !pal.hidden ? close() : open(); }
    else if (e.key === '/' && !/input|textarea|select/i.test(d.activeElement.tagName) && !d.activeElement.isContentEditable) { e.preventDefault(); open(); } });

  // ---------- Keyboard power-user mode: "?" for the cheat sheet, "g" + key to jump ----------
  const GO = { h: ['/', 'Home'], a: ['/#account', 'Account'], d: ['/duel', 'AI Duel'], m: ['/market', 'Market'], l: ['/lab', 'Math lab'], s: ['/sigil', 'Prompt Sigil'], c: ['/capsule', 'Time Capsule'],
    n: ['/menu', 'Compute Menu'], b: ['/label', 'Prompt Label'], r: ['/ruler', 'Context Ruler'], f: ['/flow', 'Flow Planner'], p: ['/live', 'Live pulse'], i: ['/invite', 'Invite'] };
  let gWait = 0, sheet; const typing = () => /input|textarea|select/i.test(d.activeElement.tagName) || d.activeElement.isContentEditable;
  function cheat() { if (!sheet) { sheet = d.createElement('div'); sheet.className = 'fx-pal'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Keyboard shortcuts');
      sheet.innerHTML = `<div class="fx-box fx-sheet"><h2>Keyboard shortcuts</h2><div class="fx-cols"><div><h3>Anywhere</h3><p><kbd>Ctrl/⌘</kbd><kbd>K</kbd> or <kbd>/</kbd> Search</p><p><kbd>?</kbd> This sheet</p><p><kbd>T</kbd> Light / dark theme</p><p><kbd>Esc</kbd> Close</p><p><kbd>J</kbd><kbd>K</kbd> Next / previous section</p></div>
        <div><h3>Go to: <kbd>G</kbd> then…</h3>${Object.entries(GO).map(([k, [, n]]) => `<p><kbd>${k.toUpperCase()}</kbd> ${n}</p>`).join('')}</div></div><button class="btn ghost" type="button">Close</button></div>`;
      d.body.appendChild(sheet); sheet.addEventListener('click', e => { if (e.target === sheet || e.target.tagName === 'BUTTON') sheet.hidden = true; }); }
    sheet.hidden = false; sheet.querySelector('button').focus(); }
  function hint(t) { let h = d.getElementById('fx-hint'); if (!h) { h = d.createElement('div'); h.id = 'fx-hint'; h.className = 'fx-toast'; h.setAttribute('aria-live', 'polite'); d.body.appendChild(h); } h.textContent = t; h.classList.add('on'); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove('on'), 1400); }
  d.addEventListener('keydown', e => { if (e.metaKey || e.ctrlKey || e.altKey || typing() || (pal && !pal.hidden)) return; const k = e.key.toLowerCase();
    if (e.key === 'Escape' && sheet && !sheet.hidden) { sheet.hidden = true; return; }
    if (gWait && Date.now() - gWait < 1500) { gWait = 0; if (GO[k]) { e.preventDefault(); hint('→ ' + GO[k][1]); location.href = GO[k][0]; } return; }
    if (e.key === '?') { e.preventDefault(); cheat(); } else if (k === 'g') { gWait = Date.now(); hint('Go to… (press a letter, ? for list)'); } else if (k === 't') { toggle(); hint('Theme: ' + d.documentElement.dataset.theme); }
    else if (k === 'j' || k === 'k') { const secs = [...d.querySelectorAll('main h1, main h2, section h2, header h1, .sec > h2')]; if (!secs.length) return; e.preventDefault(); const y = scrollY + 90;
      const t = k === 'j' ? secs.find(s => s.getBoundingClientRect().top + scrollY > y + 5) : [...secs].reverse().find(s => s.getBoundingClientRect().top + scrollY < y - 5); if (t) t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); } });
  // ---------- nav buttons ----------
  const nav = d.querySelector('.navin'); if (nav) { const w = d.createElement('div'); w.className = 'fx-tools';
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    w.innerHTML = `<button class="fx-btn fx-k" type="button" aria-label="Search ${mac ? '⌘' : 'Ctrl'} K"><span aria-hidden="true">⌕</span><kbd>${mac ? '⌘' : 'Ctrl'} K</kbd></button><button class="fx-btn" id="fx-theme" type="button"></button>`;
    const anchor = nav.querySelector('.btn, .burger'); nav.insertBefore(w, anchor); w.querySelector('.fx-k').onclick = open; w.querySelector('#fx-theme').onclick = toggle;
    const L = d.getElementById('links'); if (L) { const a = d.createElement('a'); a.href = '#'; a.className = 'fx-mob'; a.textContent = 'Search'; a.onclick = e => { e.preventDefault(); L.classList.remove('open'); open(); };
      const b = d.createElement('a'); b.href = '#'; b.className = 'fx-mob'; b.textContent = 'Light / dark theme'; b.onclick = e => { e.preventDefault(); toggle(); }; L.append(a, b); } }
  setTheme(d.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  // ---------- scroll reveal ----------
  if (!RM && 'IntersectionObserver' in window) { const els = d.querySelectorAll('.sec h2, .card, .pk, .mrow, .fl'); const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('fx-rv'); io.observe(el); } }); }
  // ---------- hero canvas: drifting compute network ----------
  const hero = d.querySelector('.hero'); if (hero && !RM && window.HTMLCanvasElement) { const cv = d.createElement('canvas'); cv.className = 'fx-hero'; cv.setAttribute('aria-hidden', 'true'); hero.prepend(cv);
    const x = cv.getContext('2d'); let W, H, P = [], run = true, dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { W = hero.clientWidth; H = hero.clientHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); const n = Math.min(70, Math.round(W * H / 16000)); P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 })); };
    size(); addEventListener('resize', size, { passive: true });
    new IntersectionObserver(([e]) => { run = e.isIntersecting; if (run) requestAnimationFrame(tick); }).observe(hero);
    let last = 0; function tick(t) { if (!run || d.hidden) return; if (t - last > 32) { last = t; x.clearRect(0, 0, W, H); const light = d.documentElement.dataset.theme === 'light';
      for (const p of P) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j], dd = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (dd < 18000) { x.strokeStyle = `rgba(20,${light ? 150 : 212},${light ? 170 : 212},${(1 - dd / 18000) * .35})`; x.lineWidth = 1; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); } }
      x.fillStyle = light ? 'rgba(15,143,143,.7)' : 'rgba(20,212,212,.8)'; for (const p of P) { x.beginPath(); x.arc(p.x, p.y, 1.8, 0, 7); x.fill(); } }
      requestAnimationFrame(tick); }
    d.addEventListener('visibilitychange', () => { if (!d.hidden && run) requestAnimationFrame(tick); }); requestAnimationFrame(tick); }
  // ---------- PWA ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();
