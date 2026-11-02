(async () => {
  const { $, esc, api, toast } = CC; const box = $('gbox'), id = box.dataset.id;
  const u = new URLSearchParams(location.search); if (u.get('c')) { localStorage['gift_' + id] = u.get('c'); history.replaceState(null, '', '/gift/' + id); }
  const tok = localStorage['gift_' + id];
  if (box.dataset.status !== 'sent') return box.innerHTML = `<h3>This gift was ${esc(box.dataset.status)}.</h3><p><a class="btn" href="/#account">Go to ComputeCred</a></p>`;
  if (!tok) return box.innerHTML = `<h3>Claim this gift</h3><p class="mut">Open the claim link from the email sent to ${esc(box.dataset.to)}.</p><p><a class="btn" href="/#account">Get your own credits</a></p>`;
  const me = await api('/api/account');
  if (!me.ok || me.signedIn === false) {
    box.innerHTML = `<h3>Sign in to claim</h3><p class="mut">This gift was sent to <b>${esc(box.dataset.to)}</b>. Sign in with that email and you'll come right back here.</p>
      <form id="gl" class="row"><input id="ge" type="email" required placeholder="you@company.com" aria-label="Email" style="flex:1;min-width:220px"><button class="btn">Email me a sign-in link</button></form><div id="gm" class="mut" style="margin-top:10px"></div>`;
    $('gl').onsubmit = async e => { e.preventDefault(); const r = await api('/api/auth/start', { email: $('ge').value, next: '/gift/' + id });
      if (!r.ok) return toast(r.error || 'Could not send link'); $('gm').innerHTML = r.devLink ? `Dev: <a href="${esc(r.devLink)}">sign in</a>` : 'Check your inbox for the sign-in link.'; };
    return;
  }
  box.innerHTML = `<h3>Ready to claim</h3><p class="mut">Signed in as ${esc(me.email)}.</p><button class="btn" id="gc">Claim credits</button>`;
  $('gc').onclick = async () => { $('gc').disabled = true; const r = await api(`/api/gifts/${id}/claim`, { token: tok }); $('gc').disabled = false;
    if (!r.ok) return toast(r.error || 'Could not claim'); delete localStorage['gift_' + id];
    box.innerHTML = `<h3>🎉 ${r.claimed} credits added</h3><p><a class="btn" href="/#account">Use them now</a></p>`; };
})();
