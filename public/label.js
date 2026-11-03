(() => { const $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VAGUE = ['thing', 'things', 'stuff', 'good', 'nice', 'some', 'very', 'really', 'basically', 'just', 'etc', 'whatever', 'interesting', 'better', 'kind of', 'sort of', 'a bit', 'somehow', 'maybe'];
  const COST = [['Chat / Q&A', 0.25, 4000], ['Writing', 0.25, 4000], ['Coding help', 0.5, 12000], ['Research summary', 0.5, 40000]];
  const syl = w => Math.max(1, (w.toLowerCase().replace(/e\b/, '').match(/[aeiouy]+/g) || []).length);
  function analyze(t) { const words = t.match(/[A-Za-z']+/g) || [], sents = Math.max(1, (t.match(/[.!?]+(\s|$)/g) || []).length), lc = ' ' + t.toLowerCase() + ' ';
    const grade = words.length ? Math.max(1, Math.round(0.39 * words.length / sents + 11.8 * words.reduce((s, w) => s + syl(w), 0) / words.length - 15.59)) : 0;
    const vague = VAGUE.filter(v => new RegExp('\\b' + v + '\\b').test(lc)), vagueN = VAGUE.reduce((s, v) => s + (lc.match(new RegExp('\\b' + v + '\\b', 'g')) || []).length, 0);
    const ing = { Role: /\b(you are|act as|as an? |pretend|role)\b/.test(lc), Task: /\b(write|explain|summari[sz]e|list|create|generate|draft|translate|analy[sz]e|compare|fix|review|plan|describe|give|make|build|design)\b/.test(lc),
      Format: /\b(bullet|table|json|list|markdown|paragraph|steps|outline|headline|csv|words|sentences|format)\b/.test(lc), Limits: /\d|\b(under|at most|no more than|max|maximum|minimum|avoid|don'?t|do not|never|only|must)\b/.test(lc),
      Audience: /\b(for (a |an |the )?(beginner|kid|child|expert|student|customer|visitor|reader|team|developer|manager|ceo|audience)s?|audience|first-time)\b/.test(lc), Examples: /\b(e\.g\.|for example|example|such as|like this|sample)\b|"/.test(lc) };
    const have = Object.values(ing).filter(Boolean).length; let score = have * 15 + (words.length >= 12 ? 10 : 0) - vagueN * 4 - (words.length > 600 ? 10 : 0); score = Math.max(0, Math.min(100, score));
    const letter = !words.length ? '–' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
    return { chars: t.length, words: words.length, tokens: Math.ceil(t.length / 4), sents, grade, vague, vagueN, ing, have, score, letter }; }
  function render() { const t = $('lb-in').value, a = analyze(t), pct = n => Math.round(n) + '%';
    const row = (k, v, bold, d = '') => `<div class="nr${bold ? ' b' : ''}"><span>${k}</span><span>${v}</span></div>${d}`;
    $('lb-out').innerHTML = `<h2>Prompt Facts</h2><div class="nr"><span>Serving size</span><span>1 prompt</span></div><div class="nthick"></div>
      <div class="nr cal"><span>Tokens</span><span>${a.tokens.toLocaleString()}</span></div><div class="nmid"></div>
      <div class="nr small"><span></span><span>% Daily Value*</span></div>
      ${row('Clarity score', a.score + '/100', 1)}${row('Words', a.words.toLocaleString())}${row('Sentences', a.sents)}${row('Reading level', a.words ? 'Grade ' + a.grade : '–')}
      ${row('Empty words', a.vagueN, 1, a.vague.length ? `<div class="nr ind"><span>${esc(a.vague.slice(0, 5).join(', '))}</span><span></span></div>` : '')}
      <div class="nthick"></div><div class="nr b"><span>Ingredients</span><span>${pct(a.have / 6 * 100)}</span></div>
      ${Object.entries(a.ing).map(([k, v]) => `<div class="nr ind"><span>${k}</span><span>${v ? '✓' : '—'}</span></div>`).join('')}
      <div class="nthick"></div><div class="nr b"><span>Cost to run on ComputeCred</span><span></span></div>
      ${COST.map(([n, c, m]) => `<div class="nr ind"><span>${n}</span><span>${a.chars > m ? 'too long' : c + ' cr'}</span></div>`).join('')}
      <div class="ngrade" aria-label="Prompt grade ${a.letter}">${a.letter}</div><p class="nfoot">* Daily Value is a joke. Grade is a rough guide based on what good prompts usually include. computecred.ai/label</p>`;
    const tips = []; if (a.words) { if (!a.ing.Role) tips.push('Give the AI a role, like "You are a patient math tutor."'); if (!a.ing.Format) tips.push('Say what shape you want: bullets, a table, 100 words…');
      if (!a.ing.Limits) tips.push('Add a limit: a length, a number, or something to avoid.'); if (!a.ing.Audience) tips.push('Say who it\'s for: beginners, a CEO, a 10-year-old.'); if (!a.ing.Examples) tips.push('Show a quick example of what good looks like.');
      if (a.vagueN) tips.push('Swap empty words (' + esc(a.vague.slice(0, 3).join(', ')) + ') for specifics.'); }
    $('lb-tips').innerHTML = tips.slice(0, 4).map(t => `<li>${t}</li>`).join(''); }
  const inp = $('lb-in'); if (location.hash.length > 1) try { inp.value = decodeURIComponent(location.hash.slice(1)); } catch {} if (!inp.value) inp.value = inp.placeholder;
  inp.addEventListener('input', render); render();
  $('lb-share').onclick = () => { const u = location.origin + '/label#' + encodeURIComponent(inp.value.slice(0, 1500)); navigator.clipboard.writeText(u).then(() => $('lb-share').textContent = 'Link copied ✓', () => prompt('Copy this link', u)); };
})();
