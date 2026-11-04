// Prompt Slot Machine: 4 reels, lockable, animated spin.
(() => { const $ = id => document.getElementById(id), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = [['A retired pirate', 'A nervous robot', 'A medieval chef', 'Your future self', 'A cat who runs a startup', 'A lighthouse keeper', 'An alien tourist', 'A grumpy wizard', 'A kindergarten teacher', 'A time-traveling librarian', 'A detective from 1920', 'A houseplant'],
    ['writes a love letter to', 'explains', 'pitches investors on', 'writes a breakup text to', 'gives a TED talk about', 'writes a recipe for', 'reviews', 'writes a bedtime story about', 'apologizes for', 'teaches a class on', 'writes the instruction manual for', 'argues against'],
    ['Wi-Fi', 'Mondays', 'the Moon', 'a sandwich', 'gravity', 'their own shadow', 'the color blue', 'a lost sock', 'the internet', 'coffee', 'dinosaurs', 'silence'],
    ['as a haiku', 'in exactly 50 words', 'as a rap verse', 'as a shopping list', 'as a breaking news report', 'using only questions', 'as a Shakespearean sonnet', 'as a group chat', 'in the style of a nature documentary', 'as a job posting', 'as an angry Yelp review', 'in emoji first, then words']];
  const lock = [0, 0, 0, 0], cur = R.map(r => Math.floor(Math.random() * r.length)); let spinning = false;
  $('dc-reels').innerHTML = R.map((r, i) => `<button class="dc-reel" data-i="${i}" aria-label="Reel ${i + 1}, tap to lock"><div class="dc-win"><div class="dc-strip"></div></div><span class="dc-lock">🔓</span></button>`).join('');
  const reels = [...document.querySelectorAll('.dc-reel')];
  const text = () => `${R[0][cur[0]]} ${R[1][cur[1]]} ${R[2][cur[2]]}, ${R[3][cur[3]]}.`;
  function setReel(i, idx) { reels[i].querySelector('.dc-strip').innerHTML = `<div>${R[i][idx]}</div>`; }
  function out() { const t = text(); $('dc-out').textContent = '“' + t + '”'; $('dc-sigil').href = '/sigil#' + encodeURIComponent(t); $('dc-odds').textContent = `One of ${R.reduce((a, r) => a * r.length, 1).toLocaleString()} possible prompts.`; }
  function spin() { if (spinning) return; spinning = true; const free = R.map((_, i) => i).filter(i => !lock[i]); if (!free.length) { spinning = false; return; }
    free.forEach((i, k) => { const target = Math.floor(Math.random() * R[i].length), strip = reels[i].querySelector('.dc-strip'), n = RM ? 1 : 14 + k * 6, seq = [];
      for (let j = 0; j < n; j++) seq.push(R[i][Math.floor(Math.random() * R[i].length)]); seq.push(R[i][target]);
      strip.style.transition = 'none'; strip.style.transform = 'translateY(0)'; strip.innerHTML = seq.map(s => `<div>${s}</div>`).join(''); strip.offsetHeight;
      strip.style.transition = `transform ${RM ? 0 : .9 + k * .35}s cubic-bezier(.15,.85,.25,1.05)`; strip.style.transform = `translateY(-${(seq.length - 1) * 100}%)`;
      cur[i] = target; setTimeout(() => { setReel(i, target); strip.style.transition = 'none'; strip.style.transform = 'none'; reels[i].classList.add('dc-hit'); setTimeout(() => reels[i].classList.remove('dc-hit'), 400);
        if (k === free.length - 1) { spinning = false; out(); } }, (RM ? 0 : (.9 + k * .35) * 1000) + 30); }); }
  reels.forEach((el, i) => { setReel(i, cur[i]); el.onclick = () => { lock[i] ^= 1; el.classList.toggle('locked', !!lock[i]); el.querySelector('.dc-lock').textContent = lock[i] ? '🔒' : '🔓'; }; });
  $('dc-spin').onclick = spin; $('dc-copy').onclick = () => { navigator.clipboard?.writeText(text()); $('dc-copy').textContent = 'Copied ✓'; setTimeout(() => $('dc-copy').textContent = 'Copy prompt', 1500); };
  addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); spin(); } }); out(); })();
