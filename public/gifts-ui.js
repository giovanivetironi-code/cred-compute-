(() => { let bound = false;
  window.CC_GIFTS = async () => { const { $, esc, api, toast } = CC;
    if (!bound) { bound = true; $('giftf').onsubmit = async e => { e.preventDefault(); const amt = Number($('gamt').value);
      if (!confirm(`Send ${amt} credits to ${$('gto').value}? They leave your balance now.`)) return; $('gsend').disabled = true;
      const r = await api('/api/gifts', { email: $('gto').value, credits: amt, fromName: $('gfrom').value, message: $('gmsg').value }); $('gsend').disabled = false;
      if (!r.ok) return toast(r.error || 'Could not send gift'); toast(r.emailed ? `Gift sent! We emailed a claim link.` : 'Gift created, but the email could not be sent. Share the gift page instead.', 'ok');
      $('giftf').reset(); window.CC_RELOAD && window.CC_RELOAD(); };
      $('glist').onclick = async e => { const b = e.target.closest('[data-cancel]'); if (!b || !confirm('Cancel this gift and return the credits?')) return;
        const r = await api(`/api/gifts/${b.dataset.cancel}/cancel`, {}); if (!r.ok) return toast(r.error); toast(`${r.returned} credits returned.`, 'ok'); window.CC_RELOAD && window.CC_RELOAD(); }; }
    const g = await api('/api/gifts'); const list = Array.isArray(g) ? g : Object.values(g).filter(x => x && x.id);
    $('glist').innerHTML = list.length ? list.map(x => `<div class="job"><b>${x.credits} credits</b> to ${esc(x.to_email)} · <span class="badge ${x.status === 'claimed' ? 'done' : ''}">${esc(x.status)}</span> · <a href="/gift/${esc(x.id)}" target="_blank" rel="noopener">gift card</a> · <a target="_blank" rel="noopener noreferrer" href="https://x.com/intent/post?text=${encodeURIComponent('I just sent AI credits on @ComputeCred 🎁 https://computecred.ai/gift/' + x.id)}">share on X</a>${x.status === 'sent' ? ` · <a href="#" data-cancel="${esc(x.id)}">cancel</a>` : ''}</div>`).join('') : 'No gifts sent yet.';
  };
})();
