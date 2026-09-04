/**
 * Fill out the public AI Visibility Index so each category is a real leaderboard.
 *
 * The bootstrap seed scanned one company per category, so every category page
 * showed a single brand and the "leaderboards" ranked nobody against nobody.
 * This scans the competitors that were already named in the seed universe, each
 * as its own entry in the same category, using the same scoring path the admin
 * page uses so the numbers are comparable.
 *
 * Resumable on purpose. A Coolify scheduled task is killed at 300 seconds and a
 * full sweep is far longer than that, so each run takes the next few unscanned
 * companies and exits. Re-running until it prints "nothing left" completes the
 * sweep. Companies already in index_entries are never rescanned, so a fresher
 * scan is never clobbered.
 *
 * Usage:
 *   node scripts/index-expand.mjs            # scan the next batch
 *   node scripts/index-expand.mjs --list     # show what remains, scan nothing
 *   node scripts/index-expand.mjs --limit 1  # smaller batch
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const ROOT = process.cwd()
// Local runs read .env.local; on the server the variables are already present.
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const LIST_ONLY = process.argv.includes('--list')
const LIMIT = Number(arg('limit', '2'))

/**
 * --out writes results to a file instead of the database. The database only
 * accepts connections from the server itself, and the scan needs tsx to import
 * the TypeScript scoring code, which is a devDependency and so is not reliably
 * present in the production image. Scanning where tsx exists and importing where
 * Postgres is reachable keeps each half on a machine that can do it.
 */
const OUT = arg('out', null)

const url = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL
if (!url && !OUT) {
  console.error('Neither DATABASE_URL_ADMIN nor DATABASE_URL is set, and no --out file given')
  process.exit(1)
}

/**
 * Each category's peer set. Taken from the competitors the seed file already
 * named, so this widens the existing categories rather than inventing new ones.
 */
const CATEGORIES = [
  { industry: 'CRM software', brands: ['HubSpot', 'Salesforce', 'Pipedrive', 'Zoho CRM', 'ActiveCampaign'] },
  { industry: 'issue tracking software', brands: ['Linear', 'Jira', 'Asana', 'ClickUp', 'Shortcut'] },
  { industry: 'team communication software', brands: ['Slack', 'Microsoft Teams', 'Discord', 'Mattermost', 'Zulip'] },
  { industry: 'note-taking and workspace software', brands: ['Notion', 'Coda', 'Obsidian', 'Confluence', 'Evernote'] },
  { industry: 'frontend hosting platform', brands: ['Vercel', 'Netlify', 'Cloudflare Pages', 'Render', 'Railway'] },
  { industry: 'workflow automation software', brands: ['Zapier', 'Make', 'n8n', 'Workato', 'IFTTT'] },
  { industry: 'design and prototyping software', brands: ['Figma', 'Sketch', 'Framer', 'Canva', 'Adobe XD'] },
  { industry: 'payment processing platform', brands: ['Stripe', 'PayPal', 'Adyen', 'Square', 'Paddle'] },
  { industry: 'no-code database software', brands: ['Airtable', 'Smartsheet', 'Monday.com', 'Coda', 'Baserow'] },
  { industry: 'email client software', brands: ['Superhuman', 'Gmail', 'Outlook', 'Spark', 'Missive'] },
]

/** One scan target per brand: its peers in the same category are its competitors. */
function targets() {
  const out = []
  const seen = new Set()
  for (const c of CATEGORIES) {
    for (const name of c.brands) {
      // A brand appearing in two categories (Coda, Notion) is scanned once, in
      // the first category that claims it, because company is UNIQUE.
      if (seen.has(name)) continue
      seen.add(name)
      out.push({ name, industry: c.industry, competitors: c.brands.filter((b) => b !== name) })
    }
  }
  return out
}

// In --out mode the set of already-done companies comes from the output file,
// so an interrupted run resumes instead of rescanning what it already paid for.
let client = null
let existing = new Set()
let collected = []

if (OUT) {
  if (fs.existsSync(OUT)) {
    collected = JSON.parse(fs.readFileSync(OUT, 'utf8'))
    existing = new Set(collected.map((r) => r.company))
  }
} else {
  client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 })
  await client.connect()
  const { rows: existingRows } = await client.query('SELECT company FROM public.index_entries')
  existing = new Set(existingRows.map((r) => r.company))
}

const all = targets()
const todo = all.filter((t) => !existing.has(t.name))

console.log(`already have ${existing.size} · target universe ${all.length} · remaining ${todo.length}`)

if (todo.length === 0) {
  console.log('nothing left to scan')
  if (client) await client.end()
  process.exit(0)
}

if (LIST_ONLY) {
  for (const t of todo) console.log(`  ${t.name.padEnd(20)} ${t.industry}`)
  if (client) await client.end()
  process.exit(0)
}

const { scanIndexCompany, resultToRow } = await import('../src/lib/index-scan.ts')
const { getAvailableEngines } = await import('../src/lib/engines.ts')
const engines = getAvailableEngines()
console.log(`engines: ${engines.join(', ') || 'none configured'}`)

const batch = todo.slice(0, Math.max(1, LIMIT))
for (const t of batch) {
  const started = Date.now()
  try {
    // Two samples per prompt: single-run numbers are not stable enough to
    // publish, and every figure on the index is meant to survive someone
    // re-running the query.
    const { result, rows } = await scanIndexCompany(t, engines, undefined, 2)
    const row = resultToRow(result, rows)

    // jsonb columns must be sent as JSON text; text[] columns as JS arrays. The
    // distinction is by column type, not by whether the value is an array:
    // competitor_breakdown is jsonb and engines is text[], and both arrive here
    // as arrays, so guessing from the value sends a Postgres array literal where
    // JSON was expected.
    if (OUT) {
      collected.push({ ...row, competitors: t.competitors })
      fs.writeFileSync(OUT, JSON.stringify(collected, null, 0))
      console.log(`  OK  ${t.name.padEnd(20)} score ${String(result.score).padStart(3)}  ${Math.round((Date.now() - started) / 1000)}s`)
      continue
    }

    const cols = Object.keys(row)
    const jsonCols = new Set(['competitor_breakdown', 'missed_prompts', 'raw_rows', 'winnability'])
    const values = cols.map((c) => (jsonCols.has(c) ? JSON.stringify(row[c]) : row[c]))

    const placeholders = cols.map((_, i) => `$${i + 1}`)
    await client.query(
      `INSERT INTO public.index_entries (${cols.map((c) => `"${c}"`).join(', ')}, competitors, scanned_at, updated_at)
       VALUES (${placeholders.join(', ')}, $${cols.length + 1}, now(), now())
       ON CONFLICT (company) DO UPDATE SET
         score = EXCLUDED.score, label = EXCLUDED.label, mentions = EXCLUDED.mentions,
         scored_prompts = EXCLUDED.scored_prompts, discovery_prompts = EXCLUDED.discovery_prompts,
         discovery_mentions = EXCLUDED.discovery_mentions, top_competitor = EXCLUDED.top_competitor,
         top_competitor_mentions = EXCLUDED.top_competitor_mentions,
         competitor_breakdown = EXCLUDED.competitor_breakdown, missed_prompts = EXCLUDED.missed_prompts,
         raw_rows = EXCLUDED.raw_rows, status = EXCLUDED.status, scanned_at = now(), updated_at = now()`,
      [...values, t.competitors]
    )
    console.log(`  OK  ${t.name.padEnd(20)} score ${String(result.score).padStart(3)}  ${Math.round((Date.now() - started) / 1000)}s`)
  } catch (e) {
    // Keep going: one failing brand must not block the rest of the sweep.
    console.error(`  !!  ${t.name}: ${e.message}`)
  }
}

if (OUT) {
  console.log(`wrote ${collected.length} companies to ${OUT} (${todo.length - batch.length} still queued)`)
} else {
  const { rows: after } = await client.query('SELECT count(*)::int AS n FROM public.index_entries')
  console.log(`index_entries now holds ${after[0].n} companies (${todo.length - batch.length} still queued)`)
  await client.end()
}
