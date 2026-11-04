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
// Round 4: Token X-Ray (/xray) and Spot the Hallucination (/spot). Browser-only, no AI spend.
module.exports.round4 = (app, ctx) => {
  const { html, limit } = ctx;
  app.get('/xray', limit(60, 60_000), (req, res) => html(res, { title: 'Token X-Ray', desc: 'See your text the way an AI sees it: split into colored tokens, live. Find out why emoji, numbers and other languages cost more.', url: '/xray', body: `
<div class="eyebrow">New · Token X-Ray</div><h1>See your words the way an AI does.</h1>
<p class="sub">AI models don't read letters or words. They read "tokens": chunks of text. Type below and watch your text split into tokens in real time. Hover or tap a chunk to inspect it. It all runs in your browser.</p>
<div class="card" style="padding:18px"><textarea id="xr-in" rows="4" maxlength="4000" style="width:100%" aria-label="Text to x-ray">Unbelievably, the 2026 robots learned to bake croissants 🥐 in Paris!</textarea>
<div class="ctas" id="xr-ex"><button class="btn ghost" data-t="Hello world">Simple English</button><button class="btn ghost" data-t="3.14159265358979 × 1000000 = 3141592.65">Numbers</button><button class="btn ghost" data-t="🚀🔥😂🎉 vibes only ✨">Emoji</button><button class="btn ghost" data-t="مرحبا بالعالم · こんにちは世界 · Привет мир">Other languages</button><button class="btn ghost" data-t="const sum = (a, b) => a + b; // add them">Code</button></div>
<div id="xr-out" class="xr-out" aria-live="polite"></div><p id="xr-tip" class="xr-tip mut">Tap a token to inspect it.</p>
<div id="xr-stats" class="pulsegrid"></div></div>
<p class="mut small">This is an approximate tokenizer that copies how real ones behave (common words stay whole, rare words split, emoji and non-Latin text break into many pieces). Exact splits differ from model to model.</p>`, script: '<script src="/xray.js"></script>' }));
  app.get('/spot', limit(60, 60_000), (req, res) => html(res, { title: 'Spot the Hallucination', desc: 'AI sometimes states made-up facts with total confidence. Can you catch them? A fast, free game: tap the sentence that is false.', url: '/spot', body: `
<div class="eyebrow">New · Spot the Hallucination</div><h1>Can you catch an AI making things up?</h1>
<p class="sub">Each answer below sounds confident, but one sentence in it is false. Tap the sentence you think is invented. Ten rounds. Build a streak and share your score.</p>
<div class="card sp-card"><div class="sp-hud"><span id="sp-round">Round 1/10</span><span id="sp-score">Score 0</span><span id="sp-streak">🔥 0</span></div>
<p class="sp-q" id="sp-q"></p><div id="sp-ans" class="sp-ans"></div><p id="sp-fb" class="sp-fb" aria-live="polite"></p>
<div class="ctas" style="justify-content:center"><button class="btn" id="sp-next" hidden>Next →</button><button class="btn ghost" id="sp-share" hidden>Copy my score</button><button class="btn ghost" id="sp-again" hidden>Play again</button></div></div>
<p class="mut small">Questions are written by us and fact-checked, not generated live. The habit it trains is real: always check specific names, numbers and dates in AI answers.</p>`, script: '<script src="/spot.js"></script>' }));
};
// Round 5: Prompt Slot Machine (/dice) and AI Glossary flip cards (/glossary). Browser-only, no AI spend.
module.exports.round5 = (app, ctx) => {
  const { html, limit } = ctx;
  app.get('/dice', limit(60, 60_000), (req, res) => html(res, { title: 'Prompt Slot Machine', desc: 'Stuck for an idea? Pull the lever: four reels spin up a who, a task, a twist and a format into a fresh creative prompt. Lock the reels you like.', url: '/dice', body: `
<div class="eyebrow">New · Prompt Slot Machine</div><h1>Pull the lever, get a prompt.</h1>
<p class="sub">Four reels: who is speaking, what they make, a twist and a format. Spin until something makes you smile. Tap a reel to lock it, then spin the rest. Press the space bar to spin.</p>
<div class="card dc-card"><div class="dc-reels" id="dc-reels"></div>
<p class="dc-out" id="dc-out" aria-live="polite"></p>
<div class="ctas" style="justify-content:center"><button class="btn lg" id="dc-spin">🎰 Spin</button><button class="btn ghost" id="dc-copy">Copy prompt</button><a class="btn ghost" id="dc-sigil" href="/sigil">See its sigil</a><a class="btn ghost" href="/#account">Run it →</a></div>
<p class="mut" id="dc-odds" style="text-align:center"></p></div>`, script: '<script src="/dice.js"></script>' }));
  app.get('/glossary', limit(60, 60_000), (req, res) => html(res, { title: 'AI Words, Flipped', desc: 'The AI words everyone uses, explained in one sentence each. Flip the cards, search, or test yourself in quiz mode.', url: '/glossary', body: `
<div class="eyebrow">New · AI Words, Flipped</div><h1>AI jargon, one card at a time.</h1>
<p class="sub">Tokens, temperature, RAG, hallucination… Each card has the word on the front and a plain-English answer on the back. Tap to flip, search, or switch to quiz mode and see how many you know.</p>
<div class="gl-bar"><input id="gl-q" type="search" placeholder="Search words…" aria-label="Search the glossary"><button class="btn ghost" id="gl-quiz">🧠 Quiz mode</button><button class="btn ghost" id="gl-all">Flip all</button><span id="gl-count" class="mut"></span></div>
<div id="gl-grid" class="gl-grid"></div>`, script: '<script src="/glossary.js"></script>' }));
};
