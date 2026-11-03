(() => { const $ = id => document.getElementById(id), fmt = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(n);
  const WIN = [['8K', 8192, 'early chatbots'], ['32K', 32768, 'a long report'], ['128K', 131072, 'many current models'], ['200K', 200000, 'large-context models'], ['1M', 1e6, 'frontier long-context'], ['2M', 2e6, 'the biggest today']];
  const CONST = 'We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America. ';
  function render() { const t = $('ru-in').value, chars = t.length, words = (t.match(/\S+/g) || []).length, tok = Math.ceil(chars / 4);
    $('ru-sum').innerHTML = tok ? `<b>${tok.toLocaleString()}</b> tokens · ${words.toLocaleString()} words · ${chars.toLocaleString()} characters` : 'Paste text or choose a file to measure it.';
    $('ru-bars').innerHTML = WIN.map(([n, cap, note]) => { const p = tok / cap * 100, over = p > 100;
      return `<div class="ru-row${over ? ' over' : ''}"><div class="ru-l"><b>${n}</b><span>${note}</span></div><div class="ru-track" role="img" aria-label="${n} window ${over ? 'overflowed' : Math.min(100, p).toFixed(1) + '% full'}"><i style="width:${Math.min(100, Math.max(tok ? .6 : 0, p))}%"></i></div><div class="ru-p">${over ? '✕ ' + (tok / cap).toFixed(1) + '× too big' : p < .1 && tok ? '<0.1%' : p.toFixed(p < 10 ? 1 : 0) + '%'}</div></div>`; }).join('');
    const eq = [['Printed pages', words / 500, 1], ['Tweets', chars / 280, 0], ['Minutes to read', words / 238, 0], ['Novels (90K words)', words / 90000, 2], ['Moby-Dicks', words / 206000, 3], ['Copies fit in a 1M window', tok ? 1e6 / tok : 0, 1]];
    $('ru-eq').innerHTML = eq.map(([l, v, d]) => `<div class="pk"><b>${tok ? (v >= 1000 ? fmt(Math.round(v)) : v.toFixed(v >= 10 ? 0 : d)) : '–'}</b><span>${l}</span></div>`).join('') +
      `<div class="pk"><b>${!tok ? '–' : chars <= 40000 ? '0.5 cr' : Math.ceil(chars / 40000) + ' runs'}</b><span>${chars <= 40000 ? 'To summarize it here' : 'Research runs to summarize it'}</span></div>`; }
  $('ru-in').addEventListener('input', render);
  $('ru-file').onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 20e6) return alert('Please pick a file under 20 MB.'); f.text().then(t => { $('ru-in').value = t; render(); }); };
  $('ru-sample').onclick = () => { $('ru-in').value = CONST.repeat(10 * 140); render(); };
  render(); })();
