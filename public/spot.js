// Spot the Hallucination: hand-written, fact-checked rounds. The false sentence index is f.
(() => { const $ = id => document.getElementById(id);
  const Q = [
    ['Tell me about the Eiffel Tower.', ['It was completed in 1889 for the World\'s Fair in Paris.', 'It was designed by the engineering company of Gustave Eiffel.', 'It was originally painted bright green to blend in with the park.', 'It is made mostly of wrought iron.'], 2, 'Its first colour was a reddish-brown ("Venetian red"), not bright green.'],
    ['What is special about octopuses?', ['Octopuses have three hearts.', 'Their blood is blue because it uses copper-based hemocyanin.', 'Most of their neurons are located in their arms.', 'Octopuses live for around 50 years in the wild.'], 3, 'Most octopuses live only one to two years.'],
    ['Give me facts about the Moon.', ['The same side of the Moon always faces Earth.', 'Twelve astronauts have walked on the Moon.', 'The Moon is slowly moving away from Earth, a few centimeters a year.', 'The Moon has a thick atmosphere of nitrogen and argon.'], 3, 'The Moon has only an extremely thin exosphere, essentially no atmosphere.'],
    ['Summarize the history of the World Wide Web.', ['Tim Berners-Lee proposed the Web in 1989 while working at CERN.', 'The first website went online in the early 1990s.', 'The Web and the internet are the same thing invented at the same time.', 'HTML, URLs and HTTP were the Web\'s founding building blocks.'], 2, 'The internet came decades earlier; the Web is a service that runs on it.'],
    ['Tell me about honey.', ['Honeybees make honey from flower nectar.', 'Edible honey has been found in ancient Egyptian tombs.', 'Honey never contains any sugar, which is why it doesn\'t spoil.', 'Its low water content and acidity help it resist spoiling.'], 2, 'Honey is mostly sugar (fructose and glucose).'],
    ['What do you know about Mount Everest?', ['Mount Everest is the highest mountain above sea level.', 'It sits on the border between Nepal and China (Tibet).', 'Edmund Hillary and Tenzing Norgay first reached the summit in 1953.', 'Its summit is just over 4,000 meters high.'], 3, 'The summit is about 8,849 meters high.'],
    ['Explain a few facts about the human body.', ['An adult human has 206 bones.', 'The femur, in the thigh, is the longest bone.', 'Humans use only 10% of their brains.', 'The skin is the body\'s largest organ.'], 2, 'The 10% claim is a myth; brain scans show activity throughout the brain.'],
    ['Tell me about the Great Wall of China.', ['It was built and rebuilt over many centuries by different dynasties.', 'Much of the wall seen today dates from the Ming dynasty.', 'It is easily visible to the naked eye from the Moon.', 'Its total length with all branches is thousands of kilometers.'], 2, 'It is not visible to the naked eye from the Moon; it\'s far too narrow.'],
    ['What are some facts about Python, the programming language?', ['Python was created by Guido van Rossum.', 'Its first release was in 1991.', 'It is named after the snake because it was first used for zoology research.', 'Indentation is part of Python\'s syntax.'], 2, 'It is named after the comedy group Monty Python, not the snake.'],
    ['Tell me about bananas.', ['Bananas are botanically classified as berries.', 'Bananas contain potassium.', 'Most bananas sold worldwide for export are the Cavendish variety.', 'Banana plants are a type of tree with a woody trunk.'], 3, 'The banana plant is a giant herb; its "trunk" is made of tightly packed leaf stalks.']];
  let order, r, score, streak, best, done;
  const shuffle = a => a.map(x => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  function start() { order = shuffle(Q); r = 0; score = 0; streak = 0; best = 0; show(); }
  function show() { const [q, ss] = order[r]; done = false; $('sp-q').textContent = '“' + q + '”';
    $('sp-ans').innerHTML = ss.map((s, i) => `<button class="sp-s" data-i="${i}">${s}</button>`).join(''); $('sp-fb').textContent = '';
    $('sp-round').textContent = `Round ${r + 1}/${Q.length}`; $('sp-score').textContent = `Score ${score}`; $('sp-streak').textContent = `🔥 ${streak}`; ['sp-next', 'sp-share', 'sp-again'].forEach(id => $(id).hidden = true); }
  $('sp-ans').onclick = e => { const b = e.target.closest('.sp-s'); if (!b || done) return; done = true; const [, , f, why] = order[r], ok = +b.dataset.i === f;
    $('sp-ans').querySelectorAll('.sp-s').forEach((x, i) => { x.disabled = true; x.classList.add(i === f ? 'bad' : 'good'); }); b.classList.add('picked');
    if (ok) { score++; streak++; best = Math.max(best, streak); } else streak = 0;
    $('sp-fb').innerHTML = (ok ? '✅ <b>Caught it!</b> ' : '❌ <b>That one was true.</b> ') + why; $('sp-score').textContent = `Score ${score}`; $('sp-streak').textContent = `🔥 ${streak}`;
    if (r + 1 < Q.length) $('sp-next').hidden = false; else { const rank = score >= 9 ? 'Fact-check legend' : score >= 7 ? 'Sharp skeptic' : score >= 4 ? 'Getting there' : 'Easily convinced';
      $('sp-fb').innerHTML += `<br><br><b class="sp-final">${score}/${Q.length} · ${rank}</b> · best streak ${best}`; $('sp-share').hidden = $('sp-again').hidden = false; } };
  $('sp-next').onclick = () => { r++; show(); }; $('sp-again').onclick = start;
  $('sp-share').onclick = () => { navigator.clipboard?.writeText(`I caught ${score}/${Q.length} AI hallucinations 🕵️ (best streak ${best}). Can you beat me? https://computecred.ai/spot`); $('sp-share').textContent = 'Copied ✓'; };
  start(); })();
