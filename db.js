// State persistence: Postgres when DATABASE_URL is set, else a local JSON file (ephemeral on Render free).
const fs = require('fs'); const path = require('path');
const FILE = path.join(__dirname, 'requests.json');
let pool = null;
async function init() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('render.com') || process.env.PGSSL ? { rejectUnauthorized: false } : undefined, max: 3 });
    await pool.query('CREATE TABLE IF NOT EXISTS kv (k text PRIMARY KEY, v jsonb NOT NULL, updated_at timestamptz DEFAULT now())');
    const r = await pool.query("SELECT v FROM kv WHERE k='state'");
    console.log('db: postgres'); return r.rows[0]?.v || {};
  }
  console.log('db: file fallback'); return fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
}
let timer = null, latest = null, chain = Promise.resolve();
function save(state) { // debounced, serialized writes
  latest = state; if (timer) return; timer = setTimeout(() => { timer = null; const s = JSON.stringify(latest);
    chain = chain.then(() => pool ? pool.query("INSERT INTO kv (k,v) VALUES ('state',$1) ON CONFLICT (k) DO UPDATE SET v=$1, updated_at=now()", [s]) : fs.promises.writeFile(FILE, s))
      .catch(e => console.error('db save failed:', e.message)); }, 300);
}
module.exports = { init, save, backend: () => pool ? 'postgres' : 'file', pool: () => pool };
