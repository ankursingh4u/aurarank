/**
 * Seed the public AI Visibility Index from the bootstrap scan file.
 *
 * Talks to Postgres directly via DATABASE_URL, so it needs no browser session
 * and no hosted SQL editor. Safe to re-run: companies already present are left
 * alone, so a fresher scan is never clobbered by the seed.
 *
 * Usage: npx tsx scripts/seed-index.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const ROOT = process.cwd()
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set in .env.local')
  process.exit(1)
}

const { resultToRow } = await import('../src/lib/index-scan.ts')

const seed = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/ai-visibility-index.json'), 'utf8')
)
console.log(`Seed file holds ${seed.length} companies.`)

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 })
await client.connect()

const { rows: existingRows } = await client.query('SELECT company FROM public.index_entries')
const existing = new Set(existingRows.map((r) => r.company))

// Serialization depends on the real column type, not on the shape of the value.
// competitor_breakdown is a jsonb array of objects while competitors is text[],
// and both arrive here as JS arrays, so guessing from the value alone sends a
// Postgres array literal where JSON was expected.
const { rows: colTypes } = await client.query(
  `SELECT column_name, data_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'index_entries'`
)
const isJson = new Set(
  colTypes.filter((c) => c.data_type === 'jsonb' || c.data_type === 'json').map((c) => c.column_name)
)

let inserted = 0
for (const result of seed) {
  if (existing.has(result.company)) continue

  const row = {
    ...resultToRow(result, []),
    // Recoverable from the result itself: the breakdown lists every competitor
    // tested, whether or not it was ever mentioned.
    competitors: (result.competitorBreakdown || []).map((c) => c.name),
  }

  const cols = Object.keys(row)
  const vals = cols.map((k) => {
    const v = row[k]
    if (v === null || v === undefined) return null
    return isJson.has(k) ? JSON.stringify(v) : v
  })
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')

  await client.query(
    `INSERT INTO public.index_entries (${cols.map((c) => `"${c}"`).join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (company) DO NOTHING`,
    vals
  )
  inserted++
}

console.log(`Inserted ${inserted}, skipped ${seed.length - inserted} already present.`)

const { rows: live } = await client.query(
  `SELECT company, score, label FROM public.index_entries
   WHERE status = 'completed' ORDER BY score DESC`
)
console.log(`\nPublished (${live.length} completed rows):`)
for (const r of live) {
  console.log(`  ${String(r.score).padStart(3)}  ${r.company}  (${r.label})`)
}

await client.end()
console.log('\nThe public page revalidates every 5 minutes.\n')
