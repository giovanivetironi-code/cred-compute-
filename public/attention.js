(() => {
  'use strict';
  const $ = id => document.getElementById(id), escape = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groups = [['robot','machine','computer','code','circuit'],['artist','painting','paint','art','picture'],['cat','kitten','milk','mouse'],['ship','ocean','sea','sailor','wave'],['garden','flower','tree','leaves','green'],['moon','stars','night','sky']];
  const pronouns = new Set(['she','he','they','it','her','his','their']);
  const articles = new Set(['a','an','the','because','and','to','of','is','was']);
  let words = [], matrix = [], selected = 0;
  function norm(s) { return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
  function score(i,j) {
    const a = norm(words[i]), b = norm(words[j]), distance = Math.abs(i-j), mode = $('at-head').value;
    if ($('at-causal').checked && j > i) return 0;
    let s = .18 + 1/(distance+1);
    if (mode === 'near') s = Math.exp(-distance/1.6) + .015;
    else if (mode === 'echo') { s = .15 + .4/(distance+1); if (a===b) s += 3; else if (a.length>1 && b.length>1 && a.slice(0,2)===b.slice(0,2)) s+=1.8; else if (a.length>2 && b.length>2 && a.slice(-2)===b.slice(-2)) s+=1.1; }
    else { if (groups.some(g => g.includes(a) && g.includes(b))) s += 2.5; if (a === b) s+=1.5; if (pronouns.has(a) && !articles.has(b) && !pronouns.has(b) && j<i) s+=1.1/(1+(i-j)*.12); if (articles.has(b)) s*=.45; }
    return s;
  }
  const rules = { links: 'Connections: a small dictionary links related words (such as artist / painting / art). Pronouns favor earlier content words. This does not resolve pronouns correctly; it shows possible links, including ambiguous ones.', near: 'Nearby words: weights fall exponentially with distance. A simple example of a local-attention pattern.', echo: 'Repeating sounds: identical words and matching first or last two letters attract each other. This is a spelling rule, not a phonetic or language model.' };
  function build() {
    words = ($('at-input').value.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu) || []).slice(0,24); selected = Math.min(selected, Math.max(0,words.length-1));
    const total = ($('at-input').value.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu)||[]).length;
    matrix = words.map((_,i) => { const raw = words.map((_,j)=>score(i,j)), sum = raw.reduce((a,b)=>a+b,0); return raw.map(v=>v/sum); });
    $('at-count').textContent = `${words.length} words shown${total>24?' · first 24 only':''}`;
    $('at-words').innerHTML=words.map((w,i)=>`<button type="button" class="at-word" data-index="${i}" aria-pressed="false">${escape(w)}</button>`).join('');
    $('at-rule').textContent = rules[$('at-head').value];
    const cols=words.length+1;
    $('at-matrix').style.gridTemplateColumns=`90px repeat(${words.length}, 32px)`;
    $('at-matrix').innerHTML=words.length ? '<span></span>'+words.map((w,j)=>`<span class="at-col" title="${escape(w)}">${j+1}</span>`).join('')+words.map((w,i)=>`<span class="at-row-label">${i+1}. ${escape(w)}</span>`+matrix[i].map((p,j)=>`<button type="button" class="at-square" data-row="${i}" data-col="${j}" style="--heat:${p?Math.min(.92,.09+Math.sqrt(p)*.88):0}" aria-label="${escape(w)} to ${escape(words[j])}, ${(p*100).toFixed(1)} percent${p===0?', masked':''}" title="${(p*100).toFixed(1)}%">${p===0?'×':''}</button>`).join('')).join('') : '';
    $('at-cell').textContent=words.length ? 'Column numbers match the word numbers on the left. Tap a cell to inspect.' : 'Type a sentence to begin.';
    render();
  }
  function render() {
    [...$('at-words').children].forEach((el,i)=>{el.setAttribute('aria-pressed',String(i===selected));el.style.setProperty('--weight', matrix[selected]?.[i]||0);});
    const svg=$('at-threads');
    if (!words.length) { svg.innerHTML=''; $('at-readout').textContent='Your words will connect here.'; return; }
    const row=matrix[selected], top=row.map((p,j)=>({p,j})).sort((a,b)=>b.p-a.p).filter(x=>x.p>0).slice(0,5), n=words.length;
    const x=i=>24+(i+.5)*(752/n), xs=x(selected);
    svg.innerHTML=top.map(({p,j})=>{ const xx=x(j), mid=(xs+xx)/2, lift=Math.min(150,35+Math.abs(xs-xx)*.25); return `<path d="M ${xs} 160 Q ${mid} ${160-lift*2} ${xx} 160" fill="none" stroke="var(--acc)" stroke-width="${1+p*12}" opacity="${.25+p*.7}"/><circle cx="${xx}" cy="160" r="${3+p*8}" fill="var(--acc)"/>`; }).join('')+`<circle cx="${xs}" cy="160" r="6" fill="var(--txt)"/>`;
    $('at-readout').innerHTML=`<strong>${escape(words[selected])}</strong><span> looks toward </span>`+top.map(({p,j})=>`<span class="at-pair">${escape(words[j])} <b>${(p*100).toFixed(1)}%</b></span>`).join(' ');
    document.querySelectorAll('.at-square').forEach(el=>el.classList.toggle('at-current',+el.dataset.row===selected));
  }
  $('at-words').onclick=e=>{const b=e.target.closest('[data-index]');if(b){selected=+b.dataset.index;render();}};
  $('at-matrix').onclick=e=>{const b=e.target.closest('[data-row]');if(b){selected=+b.dataset.row;render();$('at-cell').textContent=`${words[selected]} → ${words[+b.dataset.col]}: ${(matrix[selected][+b.dataset.col]*100).toFixed(2)}%${matrix[selected][+b.dataset.col]===0?' · blocked by the causal mask':''}. Illustrative weight, not a real model measurement.`;}};
  $('at-input').addEventListener('input',build); $('at-head').onchange=build; $('at-causal').onchange=build;
  const examples=['The robot gave the artist a painting because she loved art.','The cat watched the kitten while it drank milk.','The sailor saw the ship on the ocean under the stars.','Green leaves grew in the garden beside the green tree.'];let example=0;
  $('at-example').onclick=()=>{$('at-input').value=examples[++example%examples.length];selected=0;build();};
  build(); selected=Math.min(8,words.length-1);render();
})();
