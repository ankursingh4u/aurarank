/**
 * Run a full scan from the command line and print the citation map.
 *
 * Deliberately has no database dependency, so it works before any migration has
 * run and can be used to produce real output today: your own baseline, a
 * competitor teardown, or the numbers behind a post.
 *
 * Usage:
 *   npx tsx scripts/scan.mjs --brand "Linear" --industry "issue tracking software" \
 *     --competitors "Jira,Asana,Trello,ClickUp" [--runs 2] [--engines openai,gemini]
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const { scanIndexCompany } = await import('../src/lib/index-scan.ts')
const { classifyWinnability, summarizeWinnability } = await import('../src/lib/winnability.ts')
const { getAvailableEngines } = await import('../src/lib/engines.ts')

/* ── args ─────────────────────────────────────────────────────────── */
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const brand = arg('brand')
const industry = arg('industry')
if (!brand || !industry) {
  console.error('Required: --brand "Name" --industry "category description"')
  console.error('Optional: --competitors "A,B,C" --runs 2 --engines openai,gemini')
  process.exit(1)
}
const competitors = (arg('competitors', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
const runs = Number(arg('runs', '2'))
const engines = (arg('engines', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
const useEngines = engines.length ? engines : getAvailableEngines()

/* ── run ──────────────────────────────────────────────────────────── */
const started = Date.now()
console.log(`\nScanning ${brand} — ${industry}`)
console.log(`Engines: ${useEngines.join(', ')} · ${runs} run${runs === 1 ? '' : 's'} per question · grounded\n`)

const { result, rows } = await scanIndexCompany(
  { name: brand, industry, competitors },
  useEngines,
  (done, total) => process.stdout.write(`\r  ${done}/${total} questions`),
  runs,
  'grounded'
)
process.stdout.write('\r' + ' '.repeat(30) + '\r')

/* ── report ───────────────────────────────────────────────────────── */
const line = (c = '─') => console.log(c.repeat(74))

line('═')
console.log(`${brand.toUpperCase()} — AI VISIBILITY`)
line('═')
console.log(`Score            ${result.score}/100  (${result.label})`)
console.log(`Named in         ${result.mentions} of ${result.scoredPrompts} scored questions`)
console.log(`Head to head     ${result.discoveryMentions} of ${result.discoveryPrompts} neutral category questions`)
if (result.topCompetitor) {
  console.log(`Beaten by        ${result.topCompetitor} (${result.topCompetitorMentions} mentions)`)
}
console.log(`Agreement        ${result.stability}% of questions gave the same answer every run`)
if (result.erroredPrompts) console.log(`Errored          ${result.erroredPrompts} questions`)

// Winnability across everything we could grade.
const graded = rows.map((r) => r.winnability).filter(Boolean)
if (graded.length) {
  const s = summarizeWinnability(graded)
  line()
  console.log(`WHERE TO SPEND EFFORT`)
  console.log(`  Winnable  ${s.winnable}   thin retrieved set, or sources you can list yourself on`)
  console.log(`  Hard      ${s.hard}   independent sites that accept pitches`)
  console.log(`  Locked    ${s.locked}   editorial or competitor-owned only`)
}

// Every source read across the scan, ranked by how often it decided an answer.
const domainCount = new Map()
for (const r of rows) {
  for (const d of r.citations || []) domainCount.set(d, (domainCount.get(d) || 0) + 1)
}
const ranked = [...domainCount.entries()].sort((a, b) => b[1] - a[1])
if (ranked.length) {
  line()
  console.log(`THE PAGES AI READ  (${ranked.length} distinct sources)`)
  console.log(`These are the pages to get listed on. Ranked by how many answers they shaped.\n`)
  for (const [domain, n] of ranked.slice(0, 20)) {
    console.log(`  ${String(n).padStart(2)}x  ${domain}`)
  }
}

// The questions worth working on, with their own source list.
const missed = rows
  .filter((r) => !r.errored && !r.brand_mentioned && r.competitors_mentioned.length > 0)
  .sort((a, b) => b.competitors_mentioned.length - a.competitors_mentioned.length)

if (missed.length) {
  line()
  console.log(`MISSED QUESTIONS  (${missed.length})`)
  for (const r of missed.slice(0, 6)) {
    const w = classifyWinnability(r.citations || [], competitors)
    console.log(`\n  "${r.prompt}"`)
    console.log(`    ${w.class.toUpperCase()} — ${w.reason}`)
    console.log(`    AI named: ${r.competitors_mentioned.join(', ') || 'no one tracked'}`)
    if (r.citations?.length) {
      console.log(`    Read ${r.citations.length} pages: ${r.citations.slice(0, 6).join(', ')}`)
    }
  }
}

line()
console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s · ${result.scannedAt.slice(0, 10)}`)

const out = path.join(ROOT, 'data', 'scans', `${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ result, rows }, null, 2))
console.log(`Saved ${path.relative(ROOT, out)}\n`)
