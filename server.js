// CRED testnet demo backend. TEST ONLY - Base Sepolia (84532). No real payments.
const express = require('express'); const fs = require('fs'); const path = require('path');
const { execFile } = require('child_process');
const { getProvider } = require('./providers');
const crypto = require('crypto');
const { createPublicClient, createWalletClient, http, parseAbi, parseUnits, isAddress, hexToString, formatUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts'); const { baseSepolia } = require('viem/chains');

const CONTRACT = process.env.CONTRACT_ADDRESS || '0x744682886a3211554A0CB11bf47B015B0746C021';
const RPC = process.env.RPC_URL || 'https://sepolia.base.org';
// Prices in CRED (1 CRED = $1). Costs from docs.x.ai/developers/pricing (Oct 2026); see PLAN.md.
const RUNS = {
  chat:     { cost: 0.25, label: 'AI chat / Q&A',     kind: 'text',  maxTokens: 8000,  maxChars: 4000,
              system: 'You are a helpful, accurate assistant. Answer clearly and concisely.' },
  writing:  { cost: 0.25, label: 'Writing (posts, emails)', kind: 'text', maxTokens: 8000, maxChars: 4000,
              system: 'You are an expert writer. Write the requested post or email in clear, natural language. Output only the finished text.' },
  research: { cost: 0.5,  label: 'Research summary',  kind: 'text',  maxTokens: 12000, maxChars: 40000,
              system: 'Summarize the provided material or topic: key points, evidence, open questions. Say clearly when you are unsure.' },
  coding:   { cost: 0.5,  label: 'Coding help',       kind: 'text',  maxTokens: 16000, maxChars: 12000,
              system: 'You are a senior software engineer. Give correct, working code with brief explanations.' },
  image:    { cost: 0.25, label: 'Image generation',  kind: 'image', maxChars: 1000 },
  zeros10:  { cost: 0.1,  label: 'Math lab: first 10 zeta zeros', kind: 'math', n: 10 },
  zeros50:  { cost: 0.2,  label: 'Math lab: first 50 zeta zeros', kind: 'math', n: 50 },
};
const MAX_MINT = 10, COOLDOWN_MS = 60_000, DAILY_GLOBAL = 500;
const abi = parseAbi(['function mintCredits(address,uint256,bytes32)', 'event CreditsSpent(address indexed user, uint256 amount, bytes32 indexed runId)']);

// Testnet-only key: from env DEPLOYER_PRIVATE_KEY (Render secret) or the local key file. Never logged or sent.
const key = (process.env.DEPLOYER_PRIVATE_KEY || fs.readFileSync(path.join(__dirname, '..', '.testnet-key'), 'utf8')).trim();
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

const app = express(); app.use(express.json()); app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_, res) => res.json({ ok: true, provider: getProvider().name, contract: CONTRACT }));
app.get('/api/config', (_, res) => res.json({ contract: CONTRACT, chainId: 84532, maxMint: MAX_MINT, provider: getProvider().name, runs: Object.fromEntries(Object.entries(RUNS).map(([k, r]) => [k, { cost: r.cost, label: r.label, kind: r.kind, maxChars: r.maxChars }])) }));

const last = new Map(); let day = new Date().toDateString(), mintedToday = 0, queue = Promise.resolve();
function ownerMint(to, amountStr, tag) {
  const p = queue.then(async () => {
    const orderId = ('0x' + Buffer.from(tag.slice(0, 32).padEnd(32, '\0')).toString('hex'));
    const hash = await wallet.writeContract({ address: CONTRACT, abi, functionName: 'mintCredits', args: [to, parseUnits(amountStr, 18), orderId] });
    await pub.waitForTransactionReceipt({ hash }); return hash;
  }); queue = p.catch(() => {}); return p;
}
app.post('/api/test-mint', async (req, res) => {
  const { address } = req.body || {}; const amount = Number(req.body?.amount);
  if (!isAddress(address)) return res.status(400).json({ error: 'bad address' });
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_MINT) return res.status(400).json({ error: `amount 1-${MAX_MINT}` });
  if (new Date().toDateString() !== day) { day = new Date().toDateString(); mintedToday = 0; }
  if (mintedToday + amount > DAILY_GLOBAL) return res.status(429).json({ error: 'daily demo limit reached' });
  const now = Date.now();
  for (const k of [req.ip, address.toLowerCase()]) if (now - (last.get(k) || 0) < COOLDOWN_MS) return res.status(429).json({ error: 'wait 60s between test mints' });
  last.set(req.ip, now); last.set(address.toLowerCase(), now); mintedToday += amount;
  const p = queue.then(async () => {
    const orderId = ('0x' + Buffer.from(('test-' + now).padEnd(32, '\0')).toString('hex')).slice(0, 66);
    const hash = await wallet.writeContract({ address: CONTRACT, abi, functionName: 'mintCredits', args: [address, parseUnits(String(amount), 18), orderId] });
    await pub.waitForTransactionReceipt({ hash }); return hash;
  }); queue = p.catch(() => {});
  try { res.json({ txHash: await p }); } catch (e) { mintedToday -= amount; console.error('mint failed:', e.shortMessage || 'error'); res.status(500).json({ error: e.shortMessage || 'mint failed' }); }
});

// Pending requests: created before the user spends; matched to CreditsSpent by runId. Persisted to disk.
const PENDING_FILE = path.join(__dirname, 'requests.json');
let store = fs.existsSync(PENDING_FILE) ? JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')) : {};
if (!store.pending) store = { pending: store, processed: {} }; // migrate old flat format
const pending = new Map(Object.entries(store.pending));
const processed = store.processed; // txHash -> { runId, status, refund? }  (prevents re-running or double refunds after restart)
const savePending = () => fs.writeFileSync(PENDING_FILE, JSON.stringify({ pending: Object.fromEntries(pending), processed }, null, 1));
app.post('/api/requests', (req, res) => {
  const { service, prompt = '', address } = req.body || {}; const spec = RUNS[service];
  if (!spec) return res.status(400).json({ error: 'unknown service' });
  if (!isAddress(address)) return res.status(400).json({ error: 'bad address' });
  if (spec.kind !== 'math' && (!prompt.trim() || prompt.length > spec.maxChars)) return res.status(400).json({ error: `prompt required, max ${spec.maxChars} chars` });
  const runId = `${service}-${crypto.randomBytes(8).toString('hex')}`; // <= 31 bytes, fits bytes32
  pending.set(runId, { service, prompt, user: address.toLowerCase(), createdAt: new Date().toISOString() }); savePending();
  res.json({ runId, cost: spec.cost });
});

const jobs = new Map(); // txHash -> job (public view: no prompt for other users)
// Refund: owner re-mints the burned amount to the spender. NOTE: this consumes lifetime cap (totalMinted).
async function refund(job, reason) {
  job.refund = { reason, amount: job.amount, status: 'pending' };
  processed[job.txHash] = { runId: job.runId, status: job.status, refund: job.refund }; savePending();
  try {
    const hash = await ownerMint(job.user, formatUnits(BigInt(job.amountWei), 18), 'refund-' + job.txHash.slice(2, 20));
    Object.assign(job.refund, { status: 'refunded', txHash: hash });
  } catch (e) { job.refund.status = 'refund_failed'; console.error('refund failed', job.runId, e.shortMessage || 'error'); }
  processed[job.txHash].refund = job.refund; savePending(); console.log('refund', job.refund.status, job.runId, job.refund.txHash || '');
}
async function runJob(job) {
  if (processed[job.txHash]) { Object.assign(job, processed[job.txHash], { status: processed[job.txHash].status + ' (before restart)' }); return; }
  await runJobInner(job);
  if (['rejected', 'failed'].includes(job.status)) await refund(job, job.error);
  else { processed[job.txHash] = { runId: job.runId, status: job.status }; savePending(); }
}
async function runJobInner(job) {
  const req = pending.get(job.runId); const spec = RUNS[job.type];
  if (!req || !spec) { job.status = 'rejected'; job.error = 'no matching request for this runId'; return; }
  if (req.user !== job.user.toLowerCase()) { job.status = 'rejected'; job.error = 'spender does not match requester'; return; }
  if (job.amount < spec.cost) { job.status = 'rejected'; job.error = `paid ${job.amount}, needs ${spec.cost}`; return; }
  pending.delete(job.runId); savePending();
  job.status = 'running'; job.label = spec.label; job.prompt = req.prompt.slice(0, 300);
  try {
    if (spec.kind === 'math') {
      const out = await new Promise((ok, bad) => execFile('python3', [path.join(__dirname, 'zeros.py'), String(spec.n)], { timeout: 120_000 }, (e, o) => e ? bad(e) : ok(o)));
      const r = JSON.parse(out); job.result = { kind: 'math', ...r };
    } else {
      const p = getProvider();
      job.result = spec.kind === 'image' ? await p.image({ prompt: req.prompt, service: job.type })
        : await p.text({ system: spec.system, prompt: req.prompt, maxTokens: spec.maxTokens, service: job.type });
      job.provider = p.name;
      if (job.result.kind === 'image' && !job.result.demo && (job.result.url || job.result.b64)) {
        const buf = job.result.b64 ? Buffer.from(job.result.b64, 'base64') : Buffer.from(await (await fetch(job.result.url)).arrayBuffer());
        const f = `images/${job.runId}.jpg`; fs.mkdirSync(path.join(__dirname, 'public', 'images'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'public', f), buf); job.result = { ...job.result, url: '/' + f, b64: undefined };
      }
    }
    job.status = 'done';
  } catch (e) { job.status = 'failed'; job.error = String(e.message).slice(0, 200); console.error('job failed', job.runId, job.error); }
  job.finishedAt = new Date().toISOString(); console.log('job', job.status, job.runId, job.txHash);
}
let fromBlock;
async function poll() {
  try {
    const head = await pub.getBlockNumber(); if (fromBlock === undefined) fromBlock = head - 150n;
    while (head >= fromBlock) {
      const to = fromBlock + 199n < head ? fromBlock + 199n : head; // public RPC: 200-block getLogs limit
      const logs = await pub.getContractEvents({ address: CONTRACT, abi, eventName: 'CreditsSpent', fromBlock, toBlock: to });
      for (const l of logs) {
        if (jobs.has(l.transactionHash)) continue;
        const runId = hexToString(l.args.runId).replace(/\0+$/, '');
        const job = { txHash: l.transactionHash, user: l.args.user, amount: Number(formatUnits(l.args.amount, 18)), amountWei: l.args.amount.toString(), runId, type: runId.split('-')[0], status: 'queued', seenAt: new Date().toISOString() };
        jobs.set(l.transactionHash, job); console.log('CreditsSpent', runId, job.amount, l.transactionHash); runJob(job);
      }
      fromBlock = to + 1n;
    }
  } catch (e) { console.error('poll error:', e.shortMessage || e.message); }
  setTimeout(poll, 4000);
}
poll();
app.get('/api/jobs', (req, res) => {
  const u = String(req.query.user || '').toLowerCase();
  res.json([...jobs.values()].filter(j => !u || j.user.toLowerCase() === u).reverse().slice(0, 20));
});
console.log('AI provider:', getProvider().name); // name only, never the key
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`CRED demo on :${PORT} (minter ${account.address})`));
