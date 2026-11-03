(() => { const $ = id => document.getElementById(id), O = location.origin;
  const sig = c => `<iframe src="${O}/embed/sigil/${c}" width="340" height="400" style="border:0" title="Prompt Sigil" loading="lazy"></iframe>`;
  const upd = () => { const c = ($('em-code').value || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 7) || 'SX4LGA'; $('em-sig-code').textContent = sig(c); clearTimeout(upd.t); upd.t = setTimeout(() => $('em-sig').src = '/embed/sigil/' + c, 400); };
  $('em-code').addEventListener('input', upd); upd();
  $('em-lb-code').textContent = `<iframe src="${O}/embed/label" width="360" height="640" style="border:0" title="Prompt Nutrition Label" loading="lazy"></iframe>`;
  $('em-bd-code').textContent = `[![ComputeCred](${O}/badge/runs.svg)](${O})`;
  document.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => navigator.clipboard.writeText($(b.dataset.copy).textContent).then(() => { b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = 'Copy code', 1500); }));
})();
