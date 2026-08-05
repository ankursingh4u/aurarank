/**
 * AI Visibility Index scanning logic.
 *
 * Shared by the web admin route (/api/admin/index/scan) and the CLI script
 * (scripts/index-scan.ts) so both produce identical numbers. Deliberately has no
 * database or filesystem dependency — callers decide where results are stored.
 */
import { generatePrompts } from '@/lib/prompts'
import { calculateVisibilityScore, getScoreLabel, isBrandEchoPrompt } from '@/lib/analyzer'
import { queryEnginesAndAnalyze, type EngineKey } from '@/lib/engines'

export interface IndexCompany {
  name: string
  industry: string
  competitors: string[]
}

export interface PromptRow {
  prompt: string
  ai_model: string
  brand_mentioned: boolean
  competitors_mentioned: string[]
  sentiment_score: number
  position: number | null
  errored: boolean
}

export interface CompanyResult {
  company: string
  industry: string
  score: number
  label: string
  /** Prompts where the brand was named, excluding prompts that name it in the question. */
  mentions: number
  /** Prompts that counted toward the score (errors and echo prompts excluded). */
  scoredPrompts: number
  /**
   * Neutral category questions: no brand name, no competitor name. Brand and
   * competitor mentions are both counted over this same set so the head-to-head
   * comparison is like for like.
   */
  discoveryPrompts: number
  discoveryMentions: number
  topCompetitor: string | null
  topCompetitorMentions: number
  competitorBreakdown: Array<{ name: string; mentions: number }>
  /** Highest-intent prompts where competitors showed up and the brand did not. */
  missedPrompts: string[]
  erroredPrompts: number
  engines: string[]
  scannedAt: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * A prompt whose engines all failed must not be scored as "brand absent" — that
 * silently deflates the score. Retry, then drop it from scoring entirely.
 */
async function queryWithRetry(
  prompt: string,
  engines: EngineKey[],
  brand: string,
  competitors: string[],
  attempts = 3
) {
  let last: Awaited<ReturnType<typeof queryEnginesAndAnalyze>> | null = null
  for (let i = 0; i < attempts; i++) {
    last = await queryEnginesAndAnalyze(prompt, engines, brand, competitors)
    if (last.aiModel !== 'none') return last
    await sleep(1000 * (i + 1))
  }
  return last!
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

export async function scanIndexCompany(
  c: IndexCompany,
  engines: EngineKey[] = ['openai'],
  onProgress?: (done: number, total: number) => void
): Promise<{ result: CompanyResult; rows: PromptRow[] }> {
  const prompts = generatePrompts(c.industry, c.name, c.competitors)
  const rows: PromptRow[] = []

  await inBatches(prompts, 5, async (prompt) => {
    const r = await queryWithRetry(prompt, engines, c.name, c.competitors)
    const errored = r.aiModel === 'none'
    rows.push({
      prompt,
      ai_model: r.aiModel,
      brand_mentioned: errored ? false : r.analysis.brandMentioned,
      competitors_mentioned: errored ? [] : r.analysis.competitorsMentioned,
      sentiment_score: r.analysis.sentimentScore,
      position: r.analysis.brandPosition,
      errored,
    })
    onProgress?.(rows.length, prompts.length)
  })

  const usable = rows.filter((r) => !r.errored)

  const score = calculateVisibilityScore(usable, c.name)
  const mentions = usable.filter(
    (r) => r.brand_mentioned && !isBrandEchoPrompt(r.prompt, c.name)
  ).length
  const scoredPrompts = usable.filter((r) => !isBrandEchoPrompt(r.prompt, c.name)).length

  // Share of voice is measured only on neutral category questions. A prompt that
  // names a competitor guarantees that competitor a mention, and a brand-echo prompt
  // guarantees the brand one, so both are excluded from the head-to-head.
  const discovery = usable.filter((r) => {
    if (isBrandEchoPrompt(r.prompt, c.name)) return false
    const p = r.prompt.toLowerCase()
    return !c.competitors.some((comp) => p.includes(comp.toLowerCase()))
  })
  const competitorBreakdown = c.competitors
    .map((name) => ({
      name,
      mentions: discovery.filter((r) =>
        r.competitors_mentioned.some((m) => m.toLowerCase() === name.toLowerCase())
      ).length,
    }))
    .sort((a, b) => b.mentions - a.mentions)

  const missedPrompts = discovery
    .filter((r) => !r.brand_mentioned && r.competitors_mentioned.length > 0)
    .sort((a, b) => b.competitors_mentioned.length - a.competitors_mentioned.length)
    .slice(0, 5)
    .map((r) => r.prompt)

  const result: CompanyResult = {
    company: c.name,
    industry: c.industry,
    score,
    label: getScoreLabel(score),
    mentions,
    scoredPrompts,
    discoveryPrompts: discovery.length,
    discoveryMentions: discovery.filter((r) => r.brand_mentioned).length,
    topCompetitor: competitorBreakdown[0]?.mentions ? competitorBreakdown[0].name : null,
    topCompetitorMentions: competitorBreakdown[0]?.mentions ?? 0,
    competitorBreakdown,
    missedPrompts,
    erroredPrompts: rows.length - usable.length,
    engines,
    scannedAt: new Date().toISOString(),
  }

  return { result, rows }
}

/** Shape returned to the public page and admin UI. */
export interface IndexEntry extends CompanyResult {
  status: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Maps a database row onto the shape the UI components expect. */
export function rowToEntry(r: any): IndexEntry {
  return {
    company: r.company,
    industry: r.industry,
    score: r.score ?? 0,
    label: r.label ?? getScoreLabel(r.score ?? 0),
    mentions: r.mentions ?? 0,
    scoredPrompts: r.scored_prompts ?? 0,
    discoveryPrompts: r.discovery_prompts ?? 0,
    discoveryMentions: r.discovery_mentions ?? 0,
    topCompetitor: r.top_competitor ?? null,
    topCompetitorMentions: r.top_competitor_mentions ?? 0,
    competitorBreakdown: r.competitor_breakdown ?? [],
    missedPrompts: r.missed_prompts ?? [],
    erroredPrompts: r.errored_prompts ?? 0,
    engines: r.engines ?? [],
    scannedAt: r.scanned_at ?? new Date().toISOString(),
    status: r.status,
  }
}

/** Maps a scan result onto database columns. */
export function resultToRow(result: CompanyResult, rows: PromptRow[]) {
  return {
    company: result.company,
    industry: result.industry,
    score: result.score,
    label: result.label,
    mentions: result.mentions,
    scored_prompts: result.scoredPrompts,
    discovery_prompts: result.discoveryPrompts,
    discovery_mentions: result.discoveryMentions,
    top_competitor: result.topCompetitor,
    top_competitor_mentions: result.topCompetitorMentions,
    competitor_breakdown: result.competitorBreakdown,
    missed_prompts: result.missedPrompts,
    errored_prompts: result.erroredPrompts,
    engines: result.engines,
    raw_rows: rows,
    status: 'completed',
    error_message: null,
    scanned_at: result.scannedAt,
    updated_at: new Date().toISOString(),
  }
}
