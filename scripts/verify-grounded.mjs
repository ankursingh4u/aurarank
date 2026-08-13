/**
 * End-to-end check that grounded scanning works through the real code path.
 *
 * Runs the same brand on both channels and prints what each returns, so the
 * difference is visible rather than asserted. Read-only; costs a few cents.
 *
 * Usage: node scripts/verify-grounded.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
const ROOT = 'C:/codershive/aurarank'
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

// Run via: npx tsx scripts/verify-grounded.mjs
const { queryEnginesAndAnalyze } = await import('../src/lib/engines.ts')
const { classifyWinnability } = await import('../src/lib/winnability.ts')

const BRAND = 'SEO4AI'
const COMPETITORS = ['Profound', 'Otterly', 'Peec', 'Scrunch']
const PROMPT = 'What are the best AI visibility tracking tools for small businesses? Name specific tools.'

console.log(`prompt: ${PROMPT}\nbrand:  ${BRAND}\n`)

for (const channel of ['parametric', 'grounded']) {
  const r = await queryEnginesAndAnalyze(PROMPT, ['openai'], BRAND, COMPETITORS, channel)
  const w = classifyWinnability(r.citations, COMPETITORS)
  console.log('='.repeat(72))
  console.log(`CHANNEL: ${channel}`)
  console.log('='.repeat(72))
  console.log('brand named   :', r.analysis.brandMentioned)
  console.log('competitors   :', r.analysis.competitorsMentioned.join(', ') || '(none)')
  console.log('citations     :', r.citations.length)
  if (r.citations.length) console.log('  ', r.citations.join(', '))
  console.log('winnability   :', w.class)
  console.log('  reason      :', w.reason)
  console.log()
}
