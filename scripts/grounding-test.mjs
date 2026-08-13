/**
 * Level 1 proof: does grounded (web-search enabled) querying see things that
 * parametric querying cannot, and does it hand back citations?
 *
 * Runs the same prompts twice per engine, once with search off and once with it
 * on, and reports whether SEO4AI was named plus which URLs were cited.
 * Read-only. Costs a few cents.
 */
import fs from 'node:fs'
import path from 'node:path'
import OpenAI from 'openai'

const ROOT = 'C:/codershive/aurarank'

// Standalone script, so .env.local is not loaded for us.
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const GEMINI_KEY = process.env.GEMINI_API_KEY

const PROMPTS = [
  { label: 'category (head)', text: 'What are the best AI visibility tracking tools? List the top options by name.' },
  { label: 'long-tail', text: 'What is the best AI visibility or GEO tracking tool for a small business on a tight budget? Name specific tools.' },
  { label: 'brand direct', text: 'What is SEO4AI? Describe the product and who makes it.' },
]

const BRAND = /seo4ai|seo 4 ai/i

function found(text) {
  return BRAND.test(text || '') ? 'YES' : 'no'
}
function snippet(text, n = 220) {
  return (text || '').replace(/\s+/g, ' ').slice(0, n)
}

/* ── OpenAI ───────────────────────────────────────────────────────── */
async function openaiParametric(prompt) {
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 700,
    temperature: 0.7,
  })
  return { text: r.choices[0]?.message?.content || '', citations: [] }
}

async function openaiGrounded(prompt) {
  const r = await openai.responses.create({
    model: 'gpt-4o',
    tools: [{ type: 'web_search' }],
    input: prompt,
  })
  const citations = []
  for (const item of r.output ?? []) {
    for (const c of item.content ?? []) {
      for (const a of c.annotations ?? []) {
        if (a.url) citations.push(a.url)
      }
    }
  }
  return { text: r.output_text || '', citations: [...new Set(citations)] }
}

/* ── Gemini ───────────────────────────────────────────────────────── */
async function geminiCall(prompt, grounded) {
  const model = 'gemini-2.5-flash'
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 700, temperature: 0.7 },
  }
  if (grounded) body.tools = [{ google_search: {} }]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const d = await res.json()
  const cand = d.candidates?.[0]
  const text = (cand?.content?.parts || []).map((p) => p.text || '').join('')
  const citations = (cand?.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web?.uri || c.web?.domain)
    .filter(Boolean)
  return { text, citations: [...new Set(citations)] }
}

/* ── Run ──────────────────────────────────────────────────────────── */
const VARIANTS = [
  ['OpenAI  parametric', openaiParametric],
  ['OpenAI  GROUNDED  ', openaiGrounded],
  ['Gemini  parametric', (p) => geminiCall(p, false)],
  ['Gemini  GROUNDED  ', (p) => geminiCall(p, true)],
]

for (const { label, text: prompt } of PROMPTS) {
  console.log('\n' + '='.repeat(78))
  console.log('PROMPT [' + label + ']: ' + prompt)
  console.log('='.repeat(78))
  for (const [name, fn] of VARIANTS) {
    try {
      const { text, citations } = await fn(prompt)
      console.log(`\n${name} | SEO4AI named: ${found(text)} | citations: ${citations.length}`)
      console.log('  ' + snippet(text))
      if (citations.length) {
        console.log('  cited: ' + citations.slice(0, 6).map((u) => {
          try { return new URL(u).hostname } catch { return u.slice(0, 40) }
        }).join(', '))
      }
    } catch (e) {
      console.log(`\n${name} | ERROR: ${e.message}`)
    }
  }
}
