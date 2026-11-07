// Pure detector. No network, storage, or telemetry. Pattern matching is intentionally limited.
(function(root) {
  'use strict';
  const luhn = s => {const ds=s.replace(/\D/g,'');if(ds.length<13||ds.length>19||/^(\d)\1+$/.test(ds))return false;let sum=0,even=false;for(let i=ds.length-1;i>=0;i--){let d=+ds[i];if(even){d*=2;if(d>9)d-=9;}sum+=d;even=!even;}return sum%10===0;};
  function detect(text, custom='') {
    const all=[];
    function scan(re,type,priority,check=()=>true) {for(const m of text.matchAll(re)){if(check(m[0])) all.push({start:m.index,end:m.index+m[0].length,value:m[0],type,priority});}}
    scan(/\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+\b/gi,'EMAIL',40);
    scan(/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|(?:ghp|github_pat)_[A-Za-z0-9_]{16,}|AKIA[A-Z0-9]{16})\b/g,'TOKEN',90);
    scan(/\b\d{3}-\d{2}-\d{4}\b/g,'SSN',70);
    scan(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'IP',50,s=>s.split('.').every(n=>+n<=255));
    scan(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g,'CARD',80,luhn);
    scan(/(?<![\w])(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)[ .-]?|\d{3}[ .-])\d{3}[ .-]\d{4}(?!\d)|(?<![\w])\+\d(?:[ .-]?\d){9,14}(?!\d)/g,'PHONE',30,s=>{const n=s.replace(/\D/g,'').length;return n>=10&&n<=15;});
    const phrases=[...new Set(custom.split('\n').map(s=>s.trim()).filter(s=>s.length>0))].sort((a,b)=>b.length-a.length).slice(0,50);
    for(const p of phrases) { const re=new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'); scan(re,'CUSTOM',100); }
    all.sort((a,b)=>b.priority-a.priority||(b.end-b.start)-(a.end-a.start)||a.start-b.start);
    const accepted=[]; for(const x of all) if(!accepted.some(y=>x.start<y.end&&y.start<x.end)) accepted.push(x);
    accepted.sort((a,b)=>a.start-b.start);
    const labels=new Map(), counts={};
    return accepted.map(x=>{ const key=x.type+':'+x.value.toLowerCase();if(!labels.has(key)) labels.set(key,`[${x.type}_${counts[x.type]=(counts[x.type]||0)+1}]`);return {...x,label:labels.get(key),id:`${x.start}:${x.end}:${x.type}`}; });
  }
  function redact(text,matches,skip=new Set()) { let out='',p=0;for(const m of matches){out+=text.slice(p,m.start)+(skip.has(m.id)?m.value:m.label);p=m.end;}return out+text.slice(p); }
  const core={detect,redact,luhn}; if(typeof module!=='undefined'&&module.exports)module.exports=core;else root.RedactCore=core;
})(typeof window!=='undefined'?window:globalThis);
