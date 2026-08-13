/**
 * Seed the public AI Visibility Index from the bootstrap scan file.
 *
 * Uses the service-role key directly rather than the admin HTTP route, so it
 * needs no browser session. Safe to re-run: companies already present are left
 * alone so a fresher scan is never clobbered by the seed.
 *
 * Usage: npx tsx scripts/seed-index.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const { resultToRow } = await import('../src/lib/index-scan.ts')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })

const seed = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/data/ai-visibility-index.json'), 'utf8')
)
console.log(`Seed file holds ${seed.length} companies.`)

// Fail with the real reason rather than a wall of PostgREST noise.
const probe = await admin.from('index_entries').select('company').limit(1)
if (probe.error) {
  console.error('\nCannot reach index_entries: ' + probe.error.message)
  console.error('Run supabase/RUN_ALL_PENDING.sql in the Supabase SQL Editor first.\n')
  process.exit(1)
}

const existing = new Set((probe.data ? (await admin.from('index_entries').select('company')).data : []).map((r) => r.company))
const toInsert = seed
  .filter((r) => !existing.has(r.company))
  .map((r) => ({
    ...resultToRow(r, []),
    // Recoverable from the result itself: the breakdown lists every competitor
    // that was tested, whether or not it was ever mentioned.
    competitors: (r.competitorBreakdown || []).map((c) => c.name),
  }))

if (!toInsert.length) {
  console.log(`Nothing to do: all ${seed.length} companies are already present.`)
  process.exit(0)
}

const { error } = await admin.from('index_entries').insert(toInsert)
if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}

console.log(`Inserted ${toInsert.length}, skipped ${seed.length - toInsert.length} already present.`)

const { data: live } = await admin
  .from('index_entries')
  .select('company, score, label')
  .eq('status', 'completed')
  .order('score', { ascending: false })

console.log(`\nPublished (${live?.length ?? 0} completed rows):`)
for (const r of live || []) console.log(`  ${String(r.score).padStart(3)}  ${r.company}  (${r.label})`)
console.log('\nThe public page revalidates every 5 minutes.\n')
