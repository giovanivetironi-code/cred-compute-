(async () => { const $ = id => document.getElementById(id); const { items } = await (await fetch('/api/menu')).json();
  const blurb = { chat: 'A thoughtful answer to anything', writing: 'A polished post or email', research: 'Key points, evidence, open questions', coding: 'Working code, explained', image: 'One original picture', zeros10: 'Ten verified zeros of the zeta function', zeros50: 'Fifty zeros, for the serious mathematician' };
  const b = $('mn-b'), q = new URLSearchParams(location.search); if (+q.get('b')) b.value = Math.min(50, Math.max(1, +q.get('b')));
  const order = {}; items.forEach(i => order[i.k] = 0); (q.get('o') || '').split(',').forEach(p => { const [k, n] = p.split(':'); if (k in order) order[k] = Math.max(0, +n || 0); });
  function render() { const B = +b.value; $('mn-bv').textContent = '$' + B;
    const spent = items.reduce((s, i) => s + order[i.k] * i.cost, 0), left = Math.round((B - spent) * 100) / 100;
    $('mn-paper').innerHTML = `<h2>ComputeCred · Today's Menu</h2><p class="mut" style="text-align:center">Your table budget: ${B} credits ($${B})</p>` +
      items.map(i => `<div class="mrow"><div><b>${i.label}</b><i>${blurb[i.k] || ''}</i><small>Your budget alone buys ${Math.floor(B / i.cost).toLocaleString()} of these</small></div><span class="dots"></span><span class="mp">${i.cost} cr</span>
      <span class="mq"><button data-k="${i.k}" data-d="-1" aria-label="less">−</button><b>${order[i.k]}</b><button data-k="${i.k}" data-d="1" aria-label="more" ${left < i.cost ? 'disabled' : ''}>+</button></span></div>`).join('') +
      `<div class="mbill"><span>Your order</span><b>${Math.round(spent * 100) / 100} cr</b></div><div class="mbill"><span>Left on the table</span><b>${left} cr</b></div><p class="mut small" style="text-align:center">No tips required. Failed runs refund automatically.</p>`;
    document.querySelectorAll('.mq button').forEach(x => x.onclick = () => { order[x.dataset.k] = Math.max(0, order[x.dataset.k] + +x.dataset.d); render(); }); }
  b.oninput = () => { const B = +b.value; let s = items.reduce((t, i) => t + order[i.k] * i.cost, 0); for (const i of [...items].reverse()) while (s > B && order[i.k]) { order[i.k]--; s -= i.cost; } render(); };
  $('mn-share').onclick = () => { const o = Object.entries(order).filter(([, n]) => n).map(([k, n]) => k + ':' + n).join(','); const u = location.origin + '/menu?b=' + b.value + (o ? '&o=' + o : '');
    navigator.clipboard.writeText(u).then(() => $('mn-share').textContent = 'Link copied ✓', () => prompt('Copy this link', u)); };
  render(); })();
