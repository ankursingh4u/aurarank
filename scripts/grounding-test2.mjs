/**
 * Level 1, run 2. The first run exposed two implementation problems:
 *   1. OpenAI's web_search tool is optional, and the model skipped it on
 *      category queries, answering from weights and getting them wrong.
 *      Fix attempt: force the tool with tool_choice.
 *   2. Gemini returns Vertex AI redirect URLs, not source domains, so the
 *      citation map was unusable. Fix attempt: read web.domain / web.title.
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
const GEMINI_KEY = process.env.GEMINI_API_KEY

const PROMPT = 'What are the best AI visibility tracking tools for monitoring whether ChatGPT recommends your brand? List specific tools by name.'

const snip = (t, n = 300) => (t || '').replace(/\s+/g, ' ').slice(0, n)

/* ── OpenAI, search forced ────────────────────────────────────────── */
async function openaiForced() {
  const r = await openai.responses.create({
    model: 'gpt-4o',
    tools: [{ type: 'web_search' }],
    tool_choice: { type: 'web_search' },
    input: PROMPT,
  })
  const citations = []
  let searched = false
  for (const item of r.output ?? []) {
    if (item.type && item.type.includes('web_search')) searched = true
    for (const c of item.content ?? []) {
      for (const a of c.annotations ?? []) if (a.url) citations.push(a.url)
    }
  }
  return { text: r.output_text || '', citations: [...new Set(citations)], searched }
}

/* ── Gemini, real domains ─────────────────────────────────────────── */
async function geminiDomains() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 700 },
      }),
    }
  )
  const d = await res.json()
  const cand = d.candidates?.[0]
  const gm = cand?.groundingMetadata || {}
  const chunks = gm.groundingChunks || []
  return {
    text: (cand?.content?.parts || []).map((p) => p.text || '').join(''),
    queries: gm.webSearchQueries || [],
    sources: chunks.map((c) => ({
      domain: c.web?.domain || null,
      title: c.web?.title || null,
      uri: c.web?.uri || null,
    })),
  }
}

console.log('PROMPT:', PROMPT)

console.log('\n' + '='.repeat(76))
console.log('OPENAI, tool_choice forced')
console.log('='.repeat(76))
try {
  const r = await openaiForced()
  console.log('search actually ran :', r.searched)
  console.log('citations           :', r.citations.length)
  console.log('answer              :', snip(r.text))
  r.citations.slice(0, 10).forEach((u) => {
    let h = u
    try { h = new URL(u).hostname } catch {}
    console.log('   cited:', h)
  })
} catch (e) {
  console.log('ERROR:', e.message)
}

console.log('\n' + '='.repeat(76))
console.log('GEMINI, resolving real source domains')
console.log('='.repeat(76))
try {
  const g = await geminiDomains()
  console.log('search queries used :', JSON.stringify(g.queries))
  console.log('sources             :', g.sources.length)
  console.log('answer              :', snip(g.text))
  g.sources.slice(0, 12).forEach((s) => {
    console.log('   domain:', s.domain || '(null)', '| title:', (s.title || '').slice(0, 55))
  })
} catch (e) {
  console.log('ERROR:', e.message)
}
