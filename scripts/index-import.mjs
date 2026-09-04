/**
 * Import scanned index entries into the public AI Visibility Index.
 *
 * Deliberately pure Postgres with no TypeScript imports, so it runs on the
 * server with plain `node`. The scanning half needs tsx to load the scoring
 * code and tsx is a devDependency that the production image does not reliably
 * carry; the database, meanwhile, only accepts connections from the server
 * itself. So the scan happens where tsx exists and this runs where Postgres is
 * reachable, with src/data/index-expansion.json passed between them.
 *
 * Safe to re-run: entries are upserted by company, and re-running simply
 * rewrites the same values.
 *
 * Usage:
 *   node scripts/index-import.mjs           # import
 *   node scripts/index-import.mjs --dry     # report what would change
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const ROOT = process.cwd()
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const url = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL
if (!url) {
  console.error('Neither DATABASE_URL_ADMIN nor DATABASE_URL is set')
  process.exit(1)
}

const DRY = process.argv.includes('--dry')
const file = path.join(ROOT, 'src/data/index-expansion.json')
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}`)
  process.exit(1)
}

const entries = JSON.parse(fs.readFileSync(file, 'utf8'))
console.log(`payload holds ${entries.length} companies`)

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 })
await client.connect()

const { rows: before } = await client.query('SELECT company, score FROM public.index_entries')
const known = new Map(before.map((r) => [r.company, r.score]))
console.log(`index_entries currently holds ${known.size} companies`)

// jsonb columns must be sent as JSON text; text[] columns as JS arrays. The
// distinction is by column type, not by whether the value happens to be an
// array — competitor_breakdown is jsonb and engines is text[], and both arrive
// here as arrays.
const JSON_COLS = new Set(['competitor_breakdown', 'missed_prompts', 'winnability'])

let inserted = 0
let updated = 0

for (const e of entries) {
  const cols = Object.keys(e).filter((c) => e[c] !== undefined)
  const values = cols.map((c) => (JSON_COLS.has(c) ? JSON.stringify(e[c]) : e[c]))

  if (DRY) {
    const prev = known.get(e.company)
    console.log(`  ${prev === undefined ? 'INSERT' : `UPDATE ${prev} ->`} ${String(e.score).padStart(3)}  ${e.company}`)
    if (prev === undefined) inserted++
    else updated++
    continue
  }

  const updates = cols
    .filter((c) => c !== 'company')
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(', ')

  await client.query(
    `INSERT INTO public.index_entries (${cols.map((c) => `"${c}"`).join(', ')}, scanned_at, updated_at)
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}, now(), now())
     ON CONFLICT (company) DO UPDATE SET ${updates}, scanned_at = now(), updated_at = now()`,
    values
  )
  if (known.has(e.company)) updated++
  else inserted++
}

const { rows: after } = await client.query(
  `SELECT industry, count(*)::int AS n, max(score) AS top
   FROM public.index_entries WHERE status = 'completed' GROUP BY industry ORDER BY industry`
)
console.log(`\n${DRY ? 'would insert' : 'inserted'} ${inserted}, ${DRY ? 'would update' : 'updated'} ${updated}`)
console.log('\ncategories now:')
for (const r of after) console.log(`  ${String(r.n).padStart(2)} brands  top ${String(r.top).padStart(3)}  ${r.industry}`)

await client.end()
