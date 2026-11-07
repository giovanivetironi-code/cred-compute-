const assert = require('node:assert/strict');
const { detect, redact, luhn } = require('../public/redact-core');
let cases=0;
function test(name, fn) {fn();cases++;console.log('PASS',name);}
test('email consistent placeholders and preserving surrounding text',()=>{
  const text='Ask a@example.com; send a@example.com the summary.'; const m=detect(text);assert.equal(m.length,2);assert.equal(redact(text,m),'Ask [EMAIL_1]; send [EMAIL_1] the summary.');
});
test('synthetic phone and IP',()=>{const m=detect('+1 (415) 555-0136 at 192.0.2.42.');assert.deepEqual(m.map(x=>x.type),['PHONE','IP']);});
test('reject invalid IPv4',()=>assert.equal(detect('999.2.0.1').length,0));
test('SSN wins overlapping phone patterns',()=>assert.deepEqual(detect('000-00-0000').map(m=>m.type),['SSN']));
test('Luhn validity and invalid lengths',()=>{assert(luhn('4242 4242 4242 4242'));assert(!luhn('4242 4242 4242 4243'));assert(!luhn('1111111111111111'));});
test('card outranks number and phone',()=>assert.deepEqual(detect('4242 4242 4242 4242').map(m=>m.type),['CARD']));
test('token-format fictional dummy',()=>assert.equal(detect('sk-'+'x'.repeat(24))[0].type,'TOKEN'));
test('custom escapes regex and handles case',()=>{const t='Maya [Example] + MAYA [EXAMPLE]'; const m=detect(t,'Maya [Example]'); assert.equal(redact(t,m),'[CUSTOM_1] + [CUSTOM_1]');});
test('custom overlaps select longer whole phrase',()=>{const t='Maya Example at a@example.com';const m=detect(t,'Maya\nMaya Example\na@example.com');assert.equal(redact(t,m),'[CUSTOM_1] at [CUSTOM_2]');});
test('review checkbox preserves selected original only',()=>{const t='a@example.com and b@example.com';const m=detect(t);assert.equal(redact(t,m,new Set([m[0].id])),'a@example.com and [EMAIL_2]');});
test('unchanged plain text and empty string',()=>{assert.equal(redact('a harmless sentence',detect('a harmless sentence')),'a harmless sentence');assert.deepEqual(detect(''),[]);});
test('unicode custom phrase',()=>{assert.equal(redact('مرحبا سرّي',detect('مرحبا سرّي','سرّي')),'مرحبا [CUSTOM_1]');});
test('long input bounded and no overlapping matches',()=>{const t=('a@example.com 4242 4242 4242 4242 hello ').repeat(400);const m=detect(t);assert.equal(m.length,800);assert(m.every((x,i)=>!i||x.start>=m[i-1].end));});
// Render each route with the real production page wrapper, without starting DB/auth services.
const fs=require('fs'), vm=require('vm');
const source=fs.readFileSync(require.resolve('../features'),'utf8');
const pageSource=source.slice(source.indexOf('const esc ='),source.indexOf('// Very small content filter'))+'\npage;';
const page=vm.runInNewContext(pageSource);
const routes={};require('../creative-next')({get:(url,...handlers)=>routes[url]=handlers.pop()}, {limit:()=>()=>{}, html:(res,spec)=>{res.html=page(spec);}});
test('both routes, meaningful metadata and full site navigation',()=>{for(const url of ['/attention','/redact']){const res={};routes[url]({},res);assert(res.html.includes('<h1>'));assert(res.html.includes('href="/attention"'));assert(res.html.includes('href="/redact"'));assert(res.html.includes('creative-next.css'));}});
if(process.env.PREVIEW_DIR){fs.mkdirSync(process.env.PREVIEW_DIR,{recursive:true});for(const url of ['/attention','/redact']){const res={};routes[url]({},res);fs.writeFileSync(process.env.PREVIEW_DIR+url+'.html',res.html);}}
console.log(`${cases} checks passed`);
