/**
 * Scan a handful of named brands and print a one-line verdict for each.
 *
 * For picking a post: it surfaces which brands are absent from the answers
 * customers actually get, which is the only part worth publishing. Uses the
 * same scoring path as everything else, so the numbers match the product.
 *
 * Usage: npx tsx scripts/scan-batch.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const { scanIndexCompany } = await import('../src/lib/index-scan.ts')
const { getAvailableEngines } = await import('../src/lib/engines.ts')

// Household names, each in the category a customer would actually ask about.
// Competitors are the ones a buyer would weigh them against.
const TARGETS = [
  { name: 'Nike', industry: 'running shoes', competitors: ['Adidas', 'Brooks', 'Hoka', 'New Balance', 'Asics'] },
  { name: 'Rolex', industry: 'luxury watches', competitors: ['Omega', 'Patek Philippe', 'Audemars Piguet', 'Tudor', 'Grand Seiko'] },
  { name: 'Airbnb', industry: 'vacation rental platform', competitors: ['Vrbo', 'Booking.com', 'Expedia', 'Agoda', 'Hotels.com'] },
  { name: 'Duolingo', industry: 'language learning app', competitors: ['Babbel', 'Rosetta Stone', 'Busuu', 'Memrise', 'Pimsleur'] },
  { name: 'Peloton', industry: 'home exercise bike', competitors: ['NordicTrack', 'Echelon', 'Bowflex', 'Schwinn', 'Wahoo'] },
  { name: 'GoPro', industry: 'action camera', competitors: ['DJI', 'Insta360', 'Sony', 'Akaso', 'Garmin'] },
]

const engines = getAvailableEngines()
console.log(`engines: ${engines.join(', ')}\n`)

const out = []
for (const t of TARGETS) {
  const started = Date.now()
  try {
    const { result } = await scanIndexCompany(t, engines, undefined, 2)
    out.push(result)
    console.log(
      `${String(result.score).padStart(3)}  ${t.name.padEnd(10)} ${t.industry.padEnd(26)} ` +
        `named ${result.discoveryMentions}/${result.discoveryPrompts}  ` +
        `top rival ${result.topCompetitor ?? '-'} ${result.topCompetitorMentions}  ` +
        `${Math.round((Date.now() - started) / 1000)}s`
    )
  } catch (e) {
    console.log(`  !!  ${t.name}: ${e.message}`)
  }
}

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'data/iconic-scans.json'), JSON.stringify(out, null, 2))
console.log(`\nwrote ${out.length} results to data/iconic-scans.json`)
