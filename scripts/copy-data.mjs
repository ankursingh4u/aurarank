/**
 * Copy application data from Supabase into the self-hosted Postgres.
 *
 * Copy, not cutover. Nothing in Supabase is modified or deleted, so this can be
 * run repeatedly and the old database stays a working fallback until the app is
 * fully switched over.
 *
 * Rows already present (matched on primary key) are skipped rather than
 * overwritten, so re-running never clobbers newer local data.
 *
 * Usage: npx tsx scripts/copy-data.mjs [--verify-only]
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

// Parent tables first: scans reference brands, and everything else references scans.
const TABLES = [
  'user_plans',
  'brands',
  'scans',
  'prompt_results',
  'competitor_analysis',
  'prompt_opportunities',
  'recommendations',
  'article_generations',
  'wordpress_publishes',
]

const verifyOnly = process.argv.includes('--verify-only')

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const pgc = new pg.Client({
  connectionString: process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL,
  connectionTimeoutMillis: 20000,
})
await pgc.connect()

/** Column types decide serialization: jsonb needs a string, text[] takes the array. */
async function jsonColumns(table) {
  const { rows } = await pgc.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND data_type IN ('jsonb','json')`,
    [table]
  )
  return new Set(rows.map((r) => r.column_name))
}

/** Only copy columns the destination actually has, so a schema drift skips rather than throws. */
async function destColumns(table) {
  const { rows } = await pgc.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`,
    [table]
  )
  return new Set(rows.map((r) => r.column_name))
}

console.log(verifyOnly ? 'Verifying row counts only.\n' : 'Copying Supabase to Postgres.\n')
console.log('table'.padEnd(24) + 'supabase'.padStart(10) + 'postgres'.padStart(10) + '  result')
console.log('-'.repeat(60))

let problems = 0

for (const table of TABLES) {
  const { data: src, error } = await supa.from(table).select('*')
  if (error) {
    console.log(table.padEnd(24) + 'ERR'.padStart(10) + ''.padStart(10) + '  ' + error.message.slice(0, 40))
    problems++
    continue
  }

  const before = (await pgc.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n

  if (!verifyOnly && src.length) {
    const jsonCols = await jsonColumns(table)
    const allowed = await destColumns(table)

    for (const row of src) {
      const cols = Object.keys(row).filter((c) => allowed.has(c))
      const vals = cols.map((c) => {
        const v = row[c]
        if (v === null || v === undefined) return null
        return jsonCols.has(c) ? JSON.stringify(v) : v
      })
      await pgc.query(
        `INSERT INTO public.${table} (${cols.map((c) => `"${c}"`).join(',')})
         VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')})
         ON CONFLICT DO NOTHING`,
        vals
      )
    }
  }

  const after = (await pgc.query(`SELECT count(*)::int n FROM public.${table}`)).rows[0].n
  const ok = after >= src.length
  if (!ok) problems++
  console.log(
    table.padEnd(24) +
      String(src.length).padStart(10) +
      String(after).padStart(10) +
      '  ' +
      (ok ? 'ok' : 'SHORT') +
      (before !== after ? ` (+${after - before})` : '')
  )
}

console.log('-'.repeat(60))
console.log(problems === 0 ? 'All tables match or exceed the source.' : `${problems} table(s) need attention.`)

await pgc.end()
process.exit(problems === 0 ? 0 : 1)
