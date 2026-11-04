// Creative round 3: Prompt Synth (/synth) and Temperature Lab (/temperature). Pure browser features: no AI spend, no data stored.
module.exports = (app, ctx) => {
  const { html, limit } = ctx;
  app.get('/synth', limit(60, 60_000), (req, res) => html(res, { title: 'Prompt Synth', desc: 'Hear your prompt. Every word becomes a note, every sentence a phrase: a generative synthesizer that turns text into music, right in your browser.', url: '/synth', body: `
<div class="eyebrow">New · Prompt Synth</div><h1>What does your prompt sound like?</h1>
<p class="sub">Every letter picks a note, long words hold longer, punctuation adds rests and questions end on a rising note. The mood of your words picks the scale. It all plays in your browser, so nothing is uploaded.</p>
<div class="card" style="padding:18px"><textarea id="sy-in" rows="3" maxlength="600" style="width:100%" aria-label="Prompt to play">Write a lullaby for a robot who is afraid of the dark. Make it gentle, hopeful and short.</textarea>
<canvas id="sy-cv" class="sy-cv" height="220" role="img" aria-label="Animated visualizer of the melody"></canvas>
<div id="sy-words" class="sy-words" aria-live="off"></div>
<div class="ctas" style="justify-content:center;align-items:center"><button class="btn lg" id="sy-play">▶ Play</button><button class="btn ghost" id="sy-rec">Download .wav</button>
<label class="mut">Tempo <input type="range" id="sy-bpm" min="60" max="200" value="120" aria-label="Tempo"></label>
<label class="mut">Sound <select id="sy-wave" aria-label="Instrument"><option value="bell">Glass bell</option><option value="pluck">Pluck</option><option value="pad">Warm pad</option><option value="chip">8-bit</option></select></label></div>
<p id="sy-info" class="mut" style="text-align:center"></p></div>
<p class="mut small">Same words, same song, every time. Try changing one word and listen to the melody shift.</p>`, script: '<script src="/synth.js"></script>' }));

  app.get('/temperature', limit(60, 60_000), (req, res) => html(res, { title: 'Temperature Lab', desc: 'See how AI picks its next word. Drag the temperature dial and watch the probabilities reshape, then let a simulated model write a sentence live.', url: '/temperature', body: `
<div class="eyebrow">New · Temperature Lab</div><h1>How does an AI choose its next word?</h1>
<p class="sub">A language model doesn't pick one word. It scores every possible next word, then rolls weighted dice. "Temperature" decides how bold that roll is. Drag the dial and watch it happen. This is a small built-in simulator, so it's free and instant.</p>
<div class="card tl-card"><div class="tl-top"><label class="mut">Starting phrase <select id="tl-seed" aria-label="Starting phrase"></select></label>
<label class="tl-dial">Temperature <b id="tl-tv">0.8</b><input type="range" id="tl-t" min="0" max="2" step="0.05" value="0.8" aria-label="Temperature"></label>
<label class="mut">Top-p <b id="tl-pv">1.00</b><input type="range" id="tl-p" min="0.1" max="1" step="0.05" value="1" aria-label="Top-p"></label></div>
<p class="tl-text" id="tl-text" aria-live="polite"></p>
<div id="tl-bars" class="tl-bars"></div>
<div class="ctas" style="justify-content:center"><button class="btn" id="tl-step">Pick next word</button><button class="btn ghost" id="tl-auto">▶ Write a sentence</button><button class="btn ghost" id="tl-race">Race 3 temperatures</button><button class="btn ghost" id="tl-reset">Reset</button></div>
<div id="tl-racebox" class="tl-race" hidden></div>
<p id="tl-note" class="mut" style="text-align:center"></p></div>
<div class="pulsegrid"><div class="pk"><b>0</b><span>Always the top word. Safe, repetitive. Good for facts and code.</span></div><div class="pk"><b>0.7–1</b><span>Balanced. Most chat answers live here.</span></div><div class="pk"><b>1.5+</b><span>Wild. Surprising, then nonsense. Fun for brainstorming.</span></div></div>
<p class="mut small">The word probabilities are a hand-made demo, not a real model, but the math (softmax with temperature, then top-p) is exactly what real models use. <a href="/#account">Run a real model →</a></p>`, script: '<script src="/temperature.js"></script>' }));
};
