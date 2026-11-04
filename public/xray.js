// Token X-Ray: approximate BPE-style tokenizer, colored chips, stats.
(() => { const $ = id => document.getElementById(id), esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COMMON = new Set('the of and to a in is it you that he was for on are with as i his they be at one have this from or had by not word but what some we can out other were all there when up use your how said an each she which do their time if will way about many then them write would like so these her long make thing see him two has look more day could go come did number sound no most people my over know water than call first who may down side been now find any new work part take get place made live where after back little only round man year came show every good me give our under name very through just form great think say help low line differ turn cause much mean before move right boy old too same tell does set three want air well also play small end put home read hand port large spell add even land here must big high such follow act why ask men change went light kind off need house picture try us again animal point mother world near build self earth father robot robots learn learned bake paris hello const sum add them vibes only'.split(' '));
  const SUF = ['ing', 'ed', 'ly', 'tion', 'ness', 'ment', 'able', 'er', 'est', 's', 'ize', 'ful', 'less', 'ity'], PRE = ['un', 're', 'in', 'dis', 'pre', 'over', 'mis', 'non'];
  const H = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; };
  function splitWord(w) { const lw = w.toLowerCase(); if (COMMON.has(lw) || w.length <= 4) return [w]; const out = []; let s = w;
    for (const p of PRE) if (s.toLowerCase().startsWith(p) && s.length > p.length + 3) { out.push(s.slice(0, p.length)); s = s.slice(p.length); break; }
    let tail = []; for (let k = 0; k < 2; k++) for (const x of SUF) if (s.toLowerCase().endsWith(x) && s.length > x.length + 3) { tail.unshift(s.slice(-x.length)); s = s.slice(0, -x.length); break; }
    if (!COMMON.has(s.toLowerCase())) { const n = s.length > 7 ? Math.ceil(s.length / 4) : s.length > 5 ? 2 : 1, step = Math.ceil(s.length / n); for (let i = 0; i < s.length; i += step) out.push(s.slice(i, i + step)); } else out.push(s);
    return out.concat(tail); }
  function tokenize(t) { const toks = [], re = /( ?[A-Za-z]+)|( ?\d{1,3})|(\s+)|( ?[^\sA-Za-z\d])/gu; let m;
    while ((m = re.exec(t))) { const s = m[0];
      if (m[1]) { const sp = s[0] === ' ' ? ' ' : '', parts = splitWord(s.trim()); parts.forEach((p, i) => toks.push((i ? '' : sp) + p)); }
      else if (m[3]) toks.push(...(s.match(/\n|[^\n]+/g)));
      else if (m[4]) { const ch = s.trim(), cp = ch.codePointAt(0); const bytes = new TextEncoder().encode(ch).length;
        if (cp < 128) toks.push(s); else if (bytes >= 4) { for (let i = 0; i < Math.ceil(bytes / 2); i++) toks.push(i ? '·' : s); } else toks.push(s); }
      else toks.push(s); }
    return toks; }
  const KIND = t => /^ ?\d/.test(t) ? 'Number' : /^\s+$/.test(t) ? 'Whitespace' : t === '·' ? 'Byte fragment (part of an emoji)' : /^ ?[A-Za-z]+$/.test(t) ? (COMMON.has(t.trim().toLowerCase()) ? 'Common word' : 'Word piece') : /^ ?[\x21-\x7e]$/.test(t) ? 'Punctuation' : 'Non-Latin or symbol';
  function render() { const t = $('xr-in').value, toks = tokenize(t);
    $('xr-out').innerHTML = toks.map((k, i) => `<span class="xr-t c${H(k) % 8}" tabindex="0" data-i="${i}" title="${esc(KIND(k))}">${k === '\n' ? '↵<br>' : esc(k).replace(/ /g, '<i>·</i>')}</span>`).join('');
    $('xr-out').onclick = $('xr-out').onfocusin = e => { const el = e.target.closest('.xr-t'); if (!el) return; const k = toks[el.dataset.i];
      $('xr-tip').innerHTML = `Token #${+el.dataset.i + 1}: <b>"${esc(k)}"</b> · ${KIND(k)} · id ${H(k) % 100277}`; };
    const words = (t.match(/\S+/g) || []).length, cpt = toks.length ? t.length / toks.length : 0;
    $('xr-stats').innerHTML = [[toks.length, 'Tokens'], [words, 'Words'], [t.length, 'Characters'], [cpt.toFixed(2), 'Characters per token'], [words ? (toks.length / words).toFixed(2) : '–', 'Tokens per word'], [cpt && cpt < 2.5 ? 'Pricey' : cpt > 3.5 ? 'Efficient' : 'Normal', 'Token efficiency']].map(([v, l]) => `<div class="pk"><b>${v}</b><span>${l}</span></div>`).join(''); }
  $('xr-in').oninput = render; $('xr-ex').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { $('xr-in').value = b.dataset.t; render(); } }; render(); })();
