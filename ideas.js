// Creative features: Prompt Sigil (/sigil), Time Capsule (/capsule), Compute Menu (/menu). No AI spend, no money movement.
const crypto = require('crypto');
module.exports = (app, ctx) => {
  const { q, wrap, limit, html, setups, esc, RUNS } = ctx;
  setups.push(`CREATE TABLE IF NOT EXISTS capsules (id text PRIMARY KEY, title text, body text NOT NULL, open_at timestamptz NOT NULL, ip_hash text, created_at timestamptz DEFAULT now())`);
  const ipH = req => crypto.createHash('sha256').update('cc-cap:' + (req.ip || '')).digest('hex').slice(0, 32);

  // ---------- Prompt Sigil: every prompt gets a unique, deterministic emblem (rendered in the browser) ----------
  app.get('/sigil', limit(60, 60_000), (req, res) => html(res, { title: 'Prompt Sigil', desc: 'Turn any prompt into a one-of-a-kind emblem. Same words, same sigil, forever. Free and private: it never leaves your browser.', url: '/sigil', body: `
<div class="eyebrow">New · Prompt Sigil</div><h1>Every prompt has a face.</h1>
<p class="sub">Type a prompt and watch it become a unique emblem. The same words always draw the same sigil, and one changed letter draws a new one. It runs in your browser, so your words never leave your device.</p>
<div class="card" style="padding:18px"><textarea id="sg-in" rows="3" maxlength="500" style="width:100%" placeholder="Write a haiku about a lighthouse that learned to code"></textarea>
<div class="sg-wrap"><canvas id="sg" width="600" height="600" aria-label="Your prompt sigil"></canvas></div>
<p id="sg-name" class="mut" style="text-align:center;font-weight:600"></p>
<div class="ctas" style="justify-content:center"><button class="btn" id="sg-dl">Download PNG</button><button class="btn ghost" id="sg-share">Copy share link</button><a class="btn ghost" href="/#account">Run this prompt →</a></div></div>
<p class="mut small">Share links put the prompt in the link after the # sign, which browsers never send to our server.</p>`,
    script: '<script src="/sigil.js"></script>' }));

  // ---------- Time Capsule: seal a prompt or note that can't be read until a future date ----------
  app.post('/api/capsule', limit(5, 3600_000), wrap(async (req, res) => {
    const title = String(req.body?.title || '').slice(0, 80).trim(), body = String(req.body?.body || '').trim();
    const open = new Date(req.body?.openAt); const now = Date.now();
    if (body.length < 3 || body.length > 2000) return res.status(400).json({ error: 'Write 3 to 2,000 characters.' });
    if (isNaN(open) || open - now < 3600_000 || open - now > 5 * 366 * 86400_000) return res.status(400).json({ error: 'Pick an opening date between 1 hour and 5 years from now.' });
    const id = crypto.randomBytes(9).toString('base64url');
    await q('INSERT INTO capsules (id,title,body,open_at,ip_hash) VALUES ($1,$2,$3,$4,$5)', [id, title || null, body, open.toISOString(), ipH(req)]);
    res.json({ id, url: '/capsule/' + id });
  }));
  app.get('/api/capsule/:id', limit(60, 60_000), wrap(async (req, res) => {
    const c = (await q('SELECT * FROM capsules WHERE id=$1', [String(req.params.id).slice(0, 20)])).rows[0]; if (!c) return res.status(404).json({ error: 'not found' });
    const opened = new Date(c.open_at) <= new Date();
    res.json({ id: c.id, title: c.title, openAt: c.open_at, createdAt: c.created_at, opened, body: opened ? c.body : null });
  }));
  app.get('/capsule', limit(60, 60_000), (req, res) => html(res, { title: 'Prompt Time Capsule', desc: 'Seal a prompt, a prediction or a note to your future self. Nobody, not even you, can read it until the date you pick.', url: '/capsule', body: `
<div class="eyebrow">New · Time Capsule</div><h1>Seal a message for the future.</h1>
<p class="sub">Write a prediction about AI, a prompt to re-run in a year, or a note to your future self. Pick a date. Until then, the link shows only a countdown. Our server won't reveal the words early to anyone, not even you.</p>
<form class="card" id="cap-f" style="padding:18px;display:grid;gap:10px">
<label>Title (shown on the countdown)<input id="cap-t" maxlength="80" placeholder="My 2027 AI prediction"></label>
<label>Sealed message<textarea id="cap-b" rows="5" maxlength="2000" required placeholder="By the time you read this, AI models will..."></textarea></label>
<label>Opens on<input type="datetime-local" id="cap-d" required></label>
<div class="ctas" id="cap-quick"><button type="button" class="btn ghost" data-d="30">1 month</button><button type="button" class="btn ghost" data-d="365">1 year</button><button type="button" class="btn ghost" data-d="1826">5 years</button></div>
<button class="btn lg" type="submit">Seal capsule 🔒</button><p id="cap-msg" class="mut"></p></form>
<p class="mut small">Free. Capsules can't be edited or opened early once sealed. Don't put passwords or private data in them: anyone with the link can read the message after it opens.</p>`,
    script: '<script src="/capsule.js"></script>' }));
  app.get('/capsule/:id', limit(60, 60_000), (req, res) => html(res, { title: 'A sealed time capsule', desc: 'Someone sealed a message on ComputeCred. It opens on a set date. Seal your own.', url: '/capsule', noindex: true, body: `
<div class="eyebrow">Time Capsule</div><div id="cap-view" class="capview"><p class="mut">Loading…</p></div>
<p style="text-align:center"><a class="btn ghost" href="/capsule">Seal your own capsule</a></p>`, script: '<script src="/capsule.js"></script>' }));

  // ---------- Compute Menu: what a budget buys, printed as a restaurant-style menu ----------
  const items = Object.entries(RUNS).map(([k, r]) => ({ k, label: r.label, cost: r.cost }));
  app.get('/api/menu', (_, res) => res.json({ items }));
  app.get('/menu', limit(60, 60_000), (req, res) => html(res, { title: 'The Compute Menu', desc: 'What does $5 of AI actually buy? Order from the ComputeCred menu: chats, images, code reviews and zeta zeros, priced by the credit.', url: '/menu', body: `
<div class="eyebrow">New · The Compute Menu</div><h1>What does your budget buy?</h1>
<p class="sub">Slide to set a budget and we'll lay out a full menu of what it gets you. Then build your own order, like a dinner bill, and share it.</p>
<div class="card" style="padding:18px"><label>Budget: <b id="mn-bv">$5</b><input type="range" id="mn-b" min="1" max="50" value="5" style="width:100%"></label></div>
<div class="menu-paper" id="mn-paper"></div>
<div class="ctas" style="justify-content:center"><button class="btn ghost" id="mn-share">Copy link to this menu</button><a class="btn" href="/#pricing">See credit packs</a></div>`,
    script: '<script src="/menu.js"></script>' }));

  // ---------- Prompt Nutrition Label: an FDA-style facts panel for any prompt (runs in the browser) ----------
  app.get('/label', limit(60, 60_000), (req, res) => html(res, { title: 'Prompt Nutrition Label', desc: 'Paste a prompt and get a nutrition-facts label for it: tokens, clarity, ingredients, empty words and what it costs to run. Free, private, in your browser.', url: '/label', body: `
<div class="eyebrow">New · Prompt Nutrition Label</div><h1>What's actually in your prompt?</h1>
<p class="sub">Paste any prompt and get a nutrition-facts label: its size, its key ingredients (role, task, format, limits, examples), its "empty words", and a grade from A to F. It updates as you type and runs in your browser, so the prompt stays on your device.</p>
<div class="lbl-grid"><div class="card" style="padding:18px"><textarea id="lb-in" rows="10" maxlength="40000" style="width:100%" aria-label="Your prompt" placeholder="You are a travel writer. Write a 150-word post about Lisbon for first-time visitors. Use 3 bullet points and end with one tip. Avoid clichés."></textarea>
<div class="ctas"><button class="btn ghost" id="lb-share">Copy share link</button><a class="btn" href="/#account">Run it on ComputeCred →</a></div><ul id="lb-tips" class="lb-tips"></ul></div>
<div class="nfl" id="lb-out" aria-live="polite"></div></div>`, script: '<script src="/label.js"></script>' }));

  // ---------- Context Window Ruler: lay any text on a ruler of AI memory sizes ----------
  app.get('/ruler', limit(60, 60_000), (req, res) => html(res, { title: 'Context Window Ruler', desc: 'How much of an AI model\'s memory does your document fill? Paste text or drop a file and see it measured against 8K to 2M token context windows, in novels, tweets and reading time.', url: '/ruler', body: `
<div class="eyebrow">New · Context Window Ruler</div><h1>How big is your text to an AI?</h1>
<p class="sub">AI models can only "hold" a certain amount of text at once, called the context window. Paste text or drop a file and see how much of each window it fills, plus what that means in pages, tweets, novels and reading time. Files are read in your browser and never uploaded.</p>
<div class="card" style="padding:18px"><textarea id="ru-in" rows="6" style="width:100%" aria-label="Text to measure" placeholder="Paste an article, a contract, a chapter…"></textarea>
<div class="ctas"><label class="btn ghost" style="cursor:pointer">Choose a .txt or .md file<input type="file" id="ru-file" accept=".txt,.md,.csv,.json,.html,text/*" hidden></label><button class="btn ghost" type="button" id="ru-sample">Try: the US Constitution × 10</button></div>
<p id="ru-sum" class="ru-sum" aria-live="polite"></p></div>
<div id="ru-bars" class="ru-bars"></div><div id="ru-eq" class="pulsegrid"></div>
<p class="mut small">Token counts are estimates (about 4 characters per token for English). Real counts vary by model.</p>`, script: '<script src="/ruler.js"></script>' }));
};
