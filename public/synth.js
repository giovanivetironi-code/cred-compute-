// Prompt Synth: deterministic text -> melody with WebAudio + canvas visualizer. Offline render for .wav export.
(() => { const $ = id => document.getElementById(id), cv = $('sy-cv'), g = cv.getContext('2d');
  const SCALES = { bright: [0, 2, 4, 7, 9], calm: [0, 2, 4, 5, 7, 9, 11], dark: [0, 2, 3, 5, 7, 8, 10], dreamy: [0, 2, 4, 6, 7, 9, 11] };
  const MOODS = { dark: /\b(dark|sad|fear|afraid|night|death|lost|alone|cold|storm|war|pain|cry)\w*/gi, bright: /\b(happy|joy|fun|sun|bright|love|party|laugh|win|play|hope)\w*/gi, dreamy: /\b(dream|space|star|magic|float|cloud|moon|ocean|imagine|wonder)\w*/gi };
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  function compose(text) { let mood = 'calm', best = 0; for (const [m, re] of Object.entries(MOODS)) { const n = (text.match(re) || []).length; if (n > best) { best = n; mood = m; } }
    const sc = SCALES[mood], root = 48 + hash(text) % 7, notes = [], words = [], toks = text.match(/[\w'’]+|[.,!?;:]/g) || []; let t = 0;
    for (const w of toks) { if (/^[.,;:]$/.test(w)) { t += w === '.' ? 1 : .5; continue; } if (/[!?]/.test(w)) { if (notes.length) notes.push({ m: notes[notes.length - 1].m + (w === '?' ? 5 : 12), t, d: 1, v: .5, wi: words.length - 1 }); t += 1; continue; }
      const h = hash(w.toLowerCase()), deg = h % (sc.length * 2), oct = Math.floor(deg / sc.length), m = root + 12 + oct * 12 + sc[deg % sc.length], d = w.length > 7 ? 1 : w.length > 3 ? .5 : .25;
      words.push({ w, t }); notes.push({ m, t, d, v: .35 + (h >>> 8) % 40 / 100, wi: words.length - 1 });
      if (words.length % 4 === 1) notes.push({ m: root + sc[(h >>> 4) % sc.length], t, d: 2, v: .25, bass: 1, wi: -1 }); t += d; }
    return { notes, words, mood, len: t + 2 }; }
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function voice(ac, out, n, at, beat, kind) { const o = ac.createOscillator(), e = ac.createGain(), f = hz(n.m), dur = n.d * beat;
    o.type = { bell: 'sine', pluck: 'triangle', pad: 'sawtooth', chip: 'square' }[kind]; o.frequency.value = f;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'pad' ? 1400 : kind === 'chip' ? 3000 : 6000;
    const peak = n.v * (kind === 'chip' || kind === 'pad' ? .12 : .3), atk = kind === 'pad' ? .15 : .005, rel = kind === 'bell' ? 1.6 : kind === 'pluck' ? .5 : .3;
    e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(peak, at + atk); e.gain.exponentialRampToValueAtTime(.0001, at + dur + rel);
    o.connect(lp).connect(e).connect(out); o.start(at); o.stop(at + dur + rel + .05);
    if (kind === 'bell') { const o2 = ac.createOscillator(), e2 = ac.createGain(); o2.frequency.value = f * 2.76; e2.gain.setValueAtTime(peak * .3, at); e2.gain.exponentialRampToValueAtTime(.0001, at + .6); o2.connect(e2).connect(out); o2.start(at); o2.stop(at + .7); } }
  function graph(ac) { const master = ac.createGain(); master.gain.value = .8; const dl = ac.createDelay(); dl.delayTime.value = .28; const fb = ac.createGain(); fb.gain.value = .3;
    master.connect(ac.destination); master.connect(dl); dl.connect(fb).connect(dl); dl.connect(ac.destination); return master; }
  let ac, playing = null, an;
  function words(s) { $('sy-words').innerHTML = s.words.map((w, i) => `<span data-i="${i}">${w.w.replace(/[<&]/g, '')}</span>`).join(' '); }
  function play() { if (playing) return stop(); const s = compose($('sy-in').value); if (!s.notes.length) return; words(s);
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); const beat = 60 / $('sy-bpm').value, kind = $('sy-wave').value, out = graph(ac);
    an = ac.createAnalyser(); an.fftSize = 512; out.connect(an); const t0 = ac.currentTime + .1; s.notes.forEach(n => voice(ac, out, n, t0 + n.t * beat, beat, kind));
    playing = { s, t0, beat, out }; $('sy-play').textContent = '■ Stop'; $('sy-info').textContent = `Mood: ${s.mood} · ${s.words.length} words · ${Math.round(s.len * beat)} seconds`; }
  function stop() { if (playing) { playing.out.disconnect(); playing = null; } $('sy-play').textContent = '▶ Play'; document.querySelectorAll('.sy-words span.on').forEach(e => e.classList.remove('on')); }
  function draw() { const w = cv.width = cv.clientWidth * devicePixelRatio, h = cv.height = 220 * devicePixelRatio, acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#14d4d4';
    g.clearRect(0, 0, w, h); const s = playing ? playing.s : compose($('sy-in').value), now = playing ? (ac.currentTime - playing.t0) / playing.beat : -1;
    const ms = s.notes.map(n => n.m), lo = Math.min(...ms, 40) - 2, hi = Math.max(...ms, 80) + 2, X = t => t / Math.max(s.len, 1) * w, Y = m => h - (m - lo) / (hi - lo) * h;
    for (const n of s.notes) { const on = now >= n.t && now < n.t + n.d + .3; g.globalAlpha = on ? 1 : n.bass ? .25 : .55; g.fillStyle = n.bass ? '#3b82f6' : acc;
      g.shadowBlur = on ? 24 * devicePixelRatio : 0; g.shadowColor = acc; g.beginPath(); g.roundRect(X(n.t), Y(n.m) - 4 * devicePixelRatio, Math.max(X(n.d) - 2, 4), 8 * devicePixelRatio, 4 * devicePixelRatio); g.fill(); }
    g.shadowBlur = 0; g.globalAlpha = 1;
    if (playing) { g.strokeStyle = acc; g.lineWidth = 2 * devicePixelRatio; g.beginPath(); g.moveTo(X(now), 0); g.lineTo(X(now), h); g.stroke();
      const d = new Uint8Array(an.frequencyBinCount); an.getByteTimeDomainData(d); g.globalAlpha = .5; g.beginPath(); d.forEach((v, i) => { const x = i / d.length * w, y = h / 2 + (v - 128) / 128 * h * .4; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.globalAlpha = 1;
      const cur = s.notes.filter(n => n.wi >= 0 && now >= n.t).pop(); document.querySelectorAll('.sy-words span').forEach(e => e.classList.toggle('on', cur && +e.dataset.i === cur.wi));
      if (now > s.len) stop(); }
    requestAnimationFrame(draw); }
  async function wav() { const s = compose($('sy-in').value); if (!s.notes.length) return; const beat = 60 / $('sy-bpm').value, sr = 44100, oac = new OfflineAudioContext(1, Math.ceil((s.len * beat + 2) * sr), sr), out = graph(oac);
    s.notes.forEach(n => voice(oac, out, n, .1 + n.t * beat, beat, $('sy-wave').value)); const b = (await oac.startRendering()).getChannelData(0), buf = new DataView(new ArrayBuffer(44 + b.length * 2));
    const str = (o, t) => [...t].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0))); str(0, 'RIFF'); buf.setUint32(4, 36 + b.length * 2, true); str(8, 'WAVEfmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true); buf.setUint32(24, sr, true); buf.setUint32(28, sr * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); str(36, 'data'); buf.setUint32(40, b.length * 2, true);
    b.forEach((v, i) => buf.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true)); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })); a.download = 'prompt-synth.wav'; a.click(); }
  $('sy-play').onclick = play; $('sy-rec').onclick = wav; $('sy-in').oninput = () => { stop(); words(compose($('sy-in').value)); }; $('sy-wave').onchange = stop;
  words(compose($('sy-in').value)); $('sy-info').textContent = 'Press play (turn your sound on).'; draw(); })();
