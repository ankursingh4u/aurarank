/**
 * Run SQL migrations against the Coolify Postgres.
 *
 * This exists because migrations previously had to be pasted into a hosted SQL
 * editor by hand, which is unverifiable from here and silently did nothing when
 * aimed at the wrong project. With a direct connection they can be applied and
 * checked in one step.
 *
 * Each file runs inside its own transaction, so one failure rolls back only
 * that file rather than silently discarding the whole run. Applied files are
 * recorded in schema_migrations and skipped next time.
 *
 * Usage: npx tsx scripts/migrate.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const ROOT = process.cwd()
// Local runs read .env.local; when this runs as a Coolify scheduled task the
// variables are already in the environment and the file does not exist. Reading
// it unconditionally made this script impossible to run on the server, which is
// the only place the database is reachable from.
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// Schema changes and seeding need the owner role; the app's role is
// deliberately not permitted to do them.
const url = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL
if (!url) {
  console.error('Neither DATABASE_URL_ADMIN nor DATABASE_URL is set')
  process.exit(1)
}
if (!process.env.DATABASE_URL_ADMIN) {
  // Worth saying out loud rather than failing later on a confusing permission
  // error: the app role can read and write rows but cannot CREATE TABLE.
  console.warn('WARNING: DATABASE_URL_ADMIN not set, falling back to DATABASE_URL (app role).')
  console.warn('         Schema changes will fail with a permission error under that role.')
}
try {
  console.log(`Connecting as ${new URL(url).username} to ${new URL(url).pathname.slice(1)}`)
} catch { /* not worth failing a migration over a log line */ }

// Order matters: later files alter tables the earlier ones create.
const ORDER = [
  // Postgres-native ports of the Supabase migrations: same tables and the same
  // 17 RLS policies, keyed on a per-transaction setting instead of auth.uid().
  'coolify/001_schema.sql',
  'coolify/002_add_user_plans.sql',
  'coolify/003_add_polar_billing.sql',
  'coolify/004_add_market_region.sql',
  'coolify/005_add_scan_user_id.sql',
  'coolify/006_add_auto_scan.sql',
  'coolify/007_add_ai_visibility_index.sql',
  'coolify/008_add_article_generations.sql',
  'coolify/009_add_wordpress_publishes.sql',
  'coolify/010_add_index_sampling.sql',
  'coolify/011_add_grounded_scanning.sql',
  'coolify/012_add_report_unlocks.sql',
]

const dry = process.argv.includes('--dry')
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 })
await client.connect()

await client.query(`
  CREATE TABLE IF NOT EXISTS public.schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`)

const { rows: done } = await client.query('SELECT filename FROM public.schema_migrations')
const applied = new Set(done.map((r) => r.filename))

let ran = 0
let skipped = 0
for (const file of ORDER) {
  const full = path.join(ROOT, 'supabase', file)
  if (!fs.existsSync(full)) {
    console.log(`  --  ${file}  (not present, skipping)`)
    continue
  }
  if (applied.has(file)) {
    skipped++
    console.log(`  ok  ${file}  (already applied)`)
    continue
  }
  if (dry) {
    console.log(`  ->  ${file}  (would run)`)
    continue
  }

  const sql = fs.readFileSync(full, 'utf8')
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO public.schema_migrations (filename) VALUES ($1)', [file])
    await client.query('COMMIT')
    ran++
    console.log(`  OK  ${file}`)
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(`  !!  ${file}`)
    console.error(`      ${e.message}`)
    // Keep going: a later file may not depend on the one that failed, and
    // stopping here would hide every other problem behind the first.
  }
}

console.log(`\napplied ${ran}, skipped ${skipped}`)

const { rows: tables } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`)
console.log(`\ntables (${tables.length}): ${tables.map((t) => t.table_name).join(', ')}`)

await client.end()
