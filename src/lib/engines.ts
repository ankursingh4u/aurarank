import { getOpenAI } from '@/lib/openai'
import { analyzeMentions, type AnalysisResult } from '@/lib/analyzer'

// Which AI engines each plan scans against.
//   Free  → ChatGPT
//   Pro   → ChatGPT + Gemini
//   Max   → ChatGPT + Gemini + Claude (Claude auto-skips if no valid key)
export type EngineKey = 'openai' | 'gemini' | 'claude'

/**
 * Which of the two channels an answer came from.
 *
 * `parametric` asks the model with no web access, so it measures what the model
 * absorbed during training. That is stable over months and is what the public
 * AI Visibility Index reports.
 *
 * `grounded` lets the model search the live web and cite what it read, which is
 * the channel a customer's own work can actually move. Customer scans use this,
 * and the cited domains are the fix list.
 */
export type Channel = 'grounded' | 'parametric'

export interface EngineAnswer {
  text: string
  /** Hostnames the engine retrieved to answer. Always empty on the parametric channel. */
  citations: string[]
}

const ENGINE_LABEL: Record<EngineKey, string> = {
  openai: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
}

/** Engines a plan is entitled to, before checking whether they are configured. */
const PLAN_ENGINES: Record<string, EngineKey[]> = {
  max: ['openai', 'gemini', 'claude'],
  pro: ['openai', 'gemini'],
  starter: ['openai'],
}

const ENGINE_KEY_ENV: Record<EngineKey, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
}

/**
 * Engines that will actually answer, based on which API keys exist.
 *
 * Read this instead of hardcoding an engine list anywhere user-facing. An engine
 * without a key fails silently inside `Promise.allSettled`, so without this check
 * a plan can advertise three engines and quietly run two, which is precisely the
 * dishonesty this product measures in other people.
 */
export function getAvailableEngines(): EngineKey[] {
  return (Object.keys(ENGINE_KEY_ENV) as EngineKey[]).filter(
    (k) => !!process.env[ENGINE_KEY_ENV[k]]
  )
}

export function getScanEngines(plan: string): EngineKey[] {
  const entitled = PLAN_ENGINES[plan] || PLAN_ENGINES.starter
  const available = getAvailableEngines()
  const usable = entitled.filter((e) => available.includes(e))
  // Never return an empty list: without OpenAI configured nothing works anyway,
  // and returning [] would score every prompt as "brand absent" instead of erroring.
  return usable.length > 0 ? usable : ['openai']
}

/** Human-readable engine list for a plan, naming only engines that really run. */
export function getEngineLabels(plan: string): string[] {
  return getScanEngines(plan).map((k) => ENGINE_LABEL[k])
}

/**
 * Engine labels joined for prose: "ChatGPT", "ChatGPT and Gemini",
 * "ChatGPT, Gemini and Claude". Use this for any sentence that names the
 * engines, so marketing copy tracks the configured keys instead of drifting
 * out of date the next time one is added or removed.
 */
export function joinEngineLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // Some providers hand back a bare domain rather than a full URL.
    const bare = url.trim().replace(/^www\./, '')
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(bare) ? bare.toLowerCase() : null
  }
}

function dedupeHosts(urls: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const u of urls) {
    if (!u) continue
    const h = hostOf(u)
    if (h && !out.includes(h)) out.push(h)
  }
  return out
}

/* ── OpenAI ───────────────────────────────────────────────────────── */

async function queryOpenAI(prompt: string, channel: Channel): Promise<EngineAnswer> {
  if (channel === 'parametric') {
    const c = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    })
    return { text: c.choices[0]?.message?.content || '', citations: [] }
  }

  // Search has to be FORCED. Passing the tool without tool_choice lets the model
  // decide, and on category questions it routinely decides not to search, answers
  // from memory, and returns something worse than a plain completion would have
  // (measured 2026-08-10: it named BI dashboards for "best AI visibility tools").
  // Cast: openai@6 types only list `web_search_preview` in the tool union, but
  // the API accepts and honours `web_search` (verified 2026-08-10 — forced
  // search ran and returned 14 cited domains). Drop the cast once the types
  // catch up; do not "fix" it by switching to the preview tool without retesting.
  const r = await getOpenAI().responses.create({
    model: process.env.OPENAI_GROUNDED_MODEL || 'gpt-4o-mini',
    tools: [{ type: 'web_search' }],
    tool_choice: { type: 'web_search' },
    input: prompt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const urls: string[] = []
  for (const item of ((r as any).output ?? []) as any[]) {
    for (const block of (item?.content ?? []) as any[]) {
      for (const a of (block?.annotations ?? []) as any[]) {
        if (a?.url) urls.push(a.url)
      }
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return { text: (r as any).output_text || '', citations: dedupeHosts(urls) }
}

/* ── Gemini ───────────────────────────────────────────────────────── */

async function queryGemini(prompt: string, channel: Channel): Promise<EngineAnswer> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
  }
  if (channel === 'grounded') body.tools = [{ google_search: {} }]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const d = await res.json()
  const cand = d.candidates?.[0]
  const text = (cand?.content?.parts || [])
    .map((p: { text?: string }) => p.text || '')
    .join('')

  // The real source is in `web.title`. `web.uri` is a vertexaisearch.cloud.google.com
  // redirect and `web.domain` comes back null, so reading either yields a citation
  // map of Google redirects instead of the sites that actually named the brand.
  const chunks = (cand?.groundingMetadata?.groundingChunks || []) as any[]
  const citations = dedupeHosts(chunks.map((c) => c?.web?.title || c?.web?.domain))
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { text, citations }
}

/* ── Claude ───────────────────────────────────────────────────────── */

// The dynamic-filtering web search tool is only available on Opus 4.6+ and
// Sonnet 4.6+. Haiku, our cost default, has to use the original tool.
const WEB_SEARCH_20260209 = /^claude-(opus-(5|4-[678])|sonnet-(5|4-6)|fable-5|mythos-5)/

function claudeSearchTool(model: string) {
  return WEB_SEARCH_20260209.test(model)
    ? { type: 'web_search_20260209', name: 'web_search' }
    : { type: 'web_search_20250305', name: 'web_search' }
}

async function queryClaude(prompt: string, channel: Channel): Promise<EngineAnswer> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set')
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const body: any = {
    model,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  }
  if (channel === 'grounded') body.tools = [claudeSearchTool(model)]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}`)
  const d = await res.json()

  const blocks = (d.content || []) as any[]
  const text = blocks.map((b) => (b?.type === 'text' ? b.text || '' : '')).join('')

  const urls: string[] = []
  for (const b of blocks) {
    if (b?.type === 'web_search_tool_result') {
      // On success `content` is an array of results; on failure it is a single
      // error object (the request still returns HTTP 200), so an unguarded
      // iteration would silently treat a failed search as zero sources.
      const results = Array.isArray(b.content) ? b.content : []
      for (const r of results) if (r?.url) urls.push(r.url)
    }
    // Citations attached to the prose name the sources the answer actually leaned on.
    for (const c of (b?.citations || []) as any[]) if (c?.url) urls.push(c.url)
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { text, citations: dedupeHosts(urls) }
}

const QUERY: Record<EngineKey, (p: string, c: Channel) => Promise<EngineAnswer>> = {
  openai: queryOpenAI,
  gemini: queryGemini,
  claude: queryClaude,
}

export interface MultiEngineResult {
  aiModel: string // engines that actually responded (comma-joined)
  aiResponse: string // combined responses, labeled per engine
  analysis: AnalysisResult
  channel: Channel
  /** Every source domain retrieved for this prompt, across engines. */
  citations: string[]
  /**
   * Sources per engine. Kept separate because the engines barely overlap:
   * measured 2026-08-10, ChatGPT and Gemini cited roughly eleven domains each
   * for the same question and shared exactly one, so a single merged list would
   * hide that a brand is winning on one engine and absent on another.
   */
  citationsByEngine: Record<string, string[]>
}

/**
 * Query all enabled engines for a prompt and aggregate into one result:
 * the brand counts as mentioned if ANY engine names it; competitors are the
 * union; sentiment/position take the best across engines. Engines that error
 * (e.g. missing/invalid key, quota) are skipped gracefully.
 */
export async function queryEnginesAndAnalyze(
  prompt: string,
  engineKeys: EngineKey[],
  brandName: string,
  competitors: string[],
  channel: Channel = 'grounded'
): Promise<MultiEngineResult> {
  const settled = await Promise.allSettled(
    engineKeys.map(async (k) => ({ key: k, answer: await QUERY[k](prompt, channel) }))
  )
  const ok = settled.filter(
    (s): s is PromiseFulfilledResult<{ key: EngineKey; answer: EngineAnswer }> =>
      s.status === 'fulfilled' && !!s.value.answer.text
  )

  if (ok.length === 0) {
    return {
      aiModel: 'none',
      aiResponse: 'Error: no engine responded',
      analysis: analyzeMentions('', brandName, competitors),
      channel,
      citations: [],
      citationsByEngine: {},
    }
  }

  const perEngine = ok.map((s) => ({
    key: s.value.key,
    text: s.value.answer.text,
    citations: s.value.answer.citations,
    a: analyzeMentions(s.value.answer.text, brandName, competitors),
  }))

  const brandMentioned = perEngine.some((e) => e.a.brandMentioned)
  const competitorsMentioned = Array.from(
    new Set(perEngine.flatMap((e) => e.a.competitorsMentioned))
  )
  const mentioned = perEngine.filter((e) => e.a.brandMentioned)
  const sentimentScore = mentioned.length ? Math.max(...mentioned.map((e) => e.a.sentimentScore)) : 0
  const positions = mentioned
    .map((e) => e.a.brandPosition)
    .filter((p): p is number => p !== null)
  const brandPosition = positions.length ? Math.min(...positions) : null
  const brandSentiment: AnalysisResult['brandSentiment'] =
    sentimentScore > 2 ? 'positive' : sentimentScore < -2 ? 'negative' : 'neutral'

  const citationsByEngine: Record<string, string[]> = {}
  for (const e of perEngine) {
    if (e.citations.length) citationsByEngine[e.key] = e.citations
  }

  return {
    aiModel: ok.map((s) => s.value.key).join(','),
    aiResponse: perEngine.map((e) => `[${ENGINE_LABEL[e.key]}]\n${e.text}`).join('\n\n'),
    analysis: { brandMentioned, brandPosition, brandSentiment, competitorsMentioned, sentimentScore },
    channel,
    citations: dedupeHosts(perEngine.flatMap((e) => e.citations)),
    citationsByEngine,
  }
}
