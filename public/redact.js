(() => {
  'use strict';
  const $=id=>document.getElementById(id),core=window.RedactCore;let skip=new Set(),matches=[];
  function render(reset=true){if(reset)skip.clear();const text=$('rd-input').value;matches=core.detect(text,$('rd-custom').value);$('rd-output').value=core.redact(text,matches,skip);$('rd-copy').disabled=!text.length;
    const hidden=matches.filter(m=>!skip.has(m.id)).length;
    $('rd-summary').textContent=!text?'No text entered. Start with the fictional sample.':matches.length?`${matches.length} potential match${matches.length===1?'':'es'} · ${hidden} replaced · ${matches.length-hidden} left visible. Review the preview before copying.`:'No supported patterns found. This does NOT mean your text is safe to share. Review names, addresses and confidential context yourself.';
    $('rd-findings').replaceChildren();
    for(const m of matches){const row=document.createElement('label');row.className='rd-finding';const box=document.createElement('input');box.type='checkbox';box.checked=!skip.has(m.id);box.setAttribute('aria-label',`Replace ${m.type} at character ${m.start+1}`);box.onchange=()=>{box.checked?skip.delete(m.id):skip.add(m.id);render(false);};const detail=document.createElement('span');detail.textContent=`${m.type} · characters ${m.start+1}–${m.end}`;const label=document.createElement('code');label.textContent=m.label;row.append(box,detail,label);$('rd-findings').append(row);}
    $('rd-message').textContent='';
  }
  $('rd-input').oninput=$('rd-custom').oninput=()=>render();
  $('rd-sample').onclick=()=>{$('rd-input').value='Please summarize this fictional support note.\n\nMaya Example (maya@example.com) called from +1 (415) 555-0136 about Project Firefly. The server address is 192.0.2.42. Contact maya@example.com with the result.\n\nKeep the dates and the technical issue, but remove identifying details.';$('rd-custom').value='Maya Example\nProject Firefly';render();};
  $('rd-clear').onclick=()=>{$('rd-input').value=$('rd-custom').value=$('rd-output').value='';skip.clear();matches=[];render();$('rd-input').focus();};
  $('rd-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('rd-output').value);$('rd-message').textContent='Redacted preview copied. Review it once more before sharing.';}catch{$('rd-output').focus();$('rd-output').select();$('rd-message').textContent='Clipboard unavailable. The redacted preview is selected; use your device’s Copy command.';}};
  render();
})();
