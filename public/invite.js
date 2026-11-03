(async () => { const { $, esc, api } = CC;
  const r = await api('/api/referral');
  if (!r.ok || !r.link) { $('inv').innerHTML = `<p>Sign in to get your personal invite link.</p><a class="btn" href="/#account">Sign in</a>`; return; }
  $('inv').innerHTML = `<label for="rl" class="mut small">Your invite link</label><div class="row"><input id="rl" readonly value="${esc(r.link)}"><button class="btn" id="cp">Copy</button></div>
   <div class="row"><a class="btn ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent('I use @ComputeCred for prepaid AI compute. Join with my link and get a bonus credit with your first pack: ' + r.link)}">Share on X</a></div>
   <p class="mut">${r.joined} joined · ${r.rewarded} rewarded of ${r.max} · ${r.earned} credits earned</p>`;
  $('cp').onclick = async () => { await navigator.clipboard.writeText(r.link).catch(() => {}); $('cp').textContent = 'Copied'; };
})();
