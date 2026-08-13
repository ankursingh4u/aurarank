/**
 * Cost check: does gpt-4o-mini support forced web search on the Responses API?
 * Index scans run 20 prompts x 3 runs per company, so the difference between
 * mini and 4o across a weekly leaderboard is substantial.
 */
import fs from 'node:fs'
import path from 'node:path'
import OpenAI from 'openai'

const ROOT = 'C:/codershive/aurarank'
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const PROMPT = 'What are the best AI visibility tracking tools? Name specific tools.'

for (const model of ['gpt-4o-mini', 'gpt-4o']) {
  try {
    const r = await openai.responses.create({
      model,
      tools: [{ type: 'web_search' }],
      tool_choice: { type: 'web_search' },
      input: PROMPT,
    })
    const cites = new Set()
    let searched = false
    for (const item of r.output ?? []) {
      if (item.type && item.type.includes('web_search')) searched = true
      for (const c of item.content ?? []) {
        for (const a of c.annotations ?? []) {
          if (a.url) {
            try { cites.add(new URL(a.url).hostname) } catch { cites.add(a.url) }
          }
        }
      }
    }
    console.log(`${model.padEnd(12)} | searched: ${searched} | citations: ${cites.size}`)
    console.log('   ', [...cites].slice(0, 6).join(', ') || '(none)')
    console.log('    usage:', JSON.stringify(r.usage))
  } catch (e) {
    console.log(`${model.padEnd(12)} | ERROR: ${e.message.slice(0, 160)}`)
  }
}
