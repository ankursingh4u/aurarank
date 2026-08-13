/**
 * AI Visibility Index scanning logic.
 *
 * Shared by the web admin route (/api/admin/index/scan) and the CLI script
 * (scripts/index-scan.ts) so both produce identical numbers. Deliberately has no
 * database or filesystem dependency — callers decide where results are stored.
 */
import { generatePrompts } from '@/lib/prompts'
import { calculateVisibilityScore, getScoreLabel, isBrandEchoPrompt } from '@/lib/analyzer'
import { queryEnginesAndAnalyze, type Channel, type EngineKey } from '@/lib/engines'
import { classifyWinnability, summarizeWinnability, type Winnability } from '@/lib/winnability'

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
  /** Non-errored samples taken for this prompt. */
  runs: number
  /** How many of those samples named the brand. `runs - mention_runs` did not. */
  mention_runs: number
  /** Source domains the engines read to answer. Empty on the parametric channel. */
  citations: string[]
  /** Which channel produced this row. */
  channel: Channel
  /** How open this prompt's retrieved set is. Null when nothing was retrieved. */
  winnability: Winnability | null
}

/**
 * Models are sampled at temperature 0.7, so a single ask is a coin flip on
 * borderline brands: the same question can name Linear one minute and not the
 * next. Published numbers have to survive someone re-running the query and
 * screenshotting a different answer, so every prompt is asked several times and
 * scored on the majority verdict, with the per-prompt split kept for display.
 */
export const DEFAULT_RUNS_PER_PROMPT = 3

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
  /** How many times each prompt was asked. 1 means the result is a single sample. */
  runsPerPrompt: number
  /**
   * Percentage of scored prompts where every sample agreed on whether the brand
   * was named. Published alongside the score: it is the honest answer to "would
   * you get this number again if you re-ran it?"
   */
  stability: number
  /** Which channel the scan used. Parametric for the public index, grounded for customers. */
  channel: Channel
  /**
   * How many of the scored questions are worth working on. All zero on a
   * parametric scan, which retrieves no pages and therefore has nothing to grade.
   */
  winnability: { winnable: number; hard: number; locked: number }
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
  attempts = 3,
  channel: Channel = 'grounded'
) {
  let last: Awaited<ReturnType<typeof queryEnginesAndAnalyze>> | null = null
  for (let i = 0; i < attempts; i++) {
    last = await queryEnginesAndAnalyze(prompt, engines, brand, competitors, channel)
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

/**
 * Asks one prompt `runs` times and collapses the samples into a single verdict.
 *
 * A brand counts as mentioned only on a strict majority of non-errored samples,
 * so one lucky appearance in three tries does not read as "visible" — but the
 * raw split is carried on the row so the UI can say "named in 1 of 3 runs"
 * instead of flatly claiming absence.
 */
async function samplePrompt(
  prompt: string,
  engines: EngineKey[],
  brand: string,
  competitors: string[],
  runs: number,
  channel: Channel
): Promise<PromptRow> {
  const samples: Awaited<ReturnType<typeof queryEnginesAndAnalyze>>[] = []
  for (let i = 0; i < runs; i++) {
    samples.push(await queryWithRetry(prompt, engines, brand, competitors, 3, channel))
  }

  const usable = samples.filter((s) => s.aiModel !== 'none')
  if (usable.length === 0) {
    return {
      prompt,
      ai_model: 'none',
      brand_mentioned: false,
      competitors_mentioned: [],
      sentiment_score: 0,
      position: null,
      errored: true,
      runs: 0,
      mention_runs: 0,
      citations: [],
      channel,
      winnability: null,
    }
  }

  const mentioning = usable.filter((s) => s.analysis.brandMentioned)
  const brandMentioned = mentioning.length * 2 > usable.length

  // A competitor is credited on the same majority rule, so the head-to-head is
  // measured the same way on both sides.
  const competitorCounts = new Map<string, number>()
  for (const s of usable) {
    // Deduped per sample: naming a competitor twice in one answer is still one run.
    const seen = Array.from(new Set(s.analysis.competitorsMentioned.map((m) => m.toLowerCase())))
    for (const name of seen) {
      competitorCounts.set(name, (competitorCounts.get(name) || 0) + 1)
    }
  }
  const competitorsMentioned = competitors.filter(
    (name) => (competitorCounts.get(name.toLowerCase()) || 0) * 2 > usable.length
  )

  const positions = mentioning
    .map((s) => s.analysis.brandPosition)
    .filter((p): p is number => p !== null)

  const citations = Array.from(new Set(usable.flatMap((s) => s.citations)))

  return {
    prompt,
    ai_model: usable[0].aiModel,
    brand_mentioned: brandMentioned,
    competitors_mentioned: competitorsMentioned,
    sentiment_score: mentioning.length
      ? mentioning.reduce((sum, s) => sum + s.analysis.sentimentScore, 0) / mentioning.length
      : 0,
    position: positions.length ? Math.min(...positions) : null,
    errored: false,
    runs: usable.length,
    mention_runs: mentioning.length,
    // Union across samples: a source read in any run is a page that names
    // someone in this category, whether or not that particular run cited it.
    citations,
    channel,
    winnability: channel === 'grounded' ? classifyWinnability(citations, competitors).class : null,
  }
}

/**
 * Share of prompts whose samples were unanimous, as a percentage. A single-run
 * scan has nothing to disagree with, so it reports 0 rather than a misleading
 * 100 — absence of measured variance is not evidence of stability.
 */
function stabilityOf(rows: PromptRow[]): number {
  const sampled = rows.filter((r) => r.runs > 1)
  if (!sampled.length) return 0
  const unanimous = sampled.filter((r) => r.mention_runs === 0 || r.mention_runs === r.runs).length
  return Math.round((unanimous / sampled.length) * 100)
}

export async function scanIndexCompany(
  c: IndexCompany,
  engines: EngineKey[] = ['openai'],
  onProgress?: (done: number, total: number) => void,
  runsPerPrompt: number = DEFAULT_RUNS_PER_PROMPT,
  channel: Channel = 'parametric'
): Promise<{ result: CompanyResult; rows: PromptRow[] }> {
  const prompts = generatePrompts(c.industry, c.name, c.competitors)
  const runs = Math.max(1, Math.floor(runsPerPrompt))
  const rows: PromptRow[] = []

  await inBatches(prompts, 5, async (prompt) => {
    rows.push(await samplePrompt(prompt, engines, c.name, c.competitors, runs, channel))
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
    runsPerPrompt: runs,
    stability: stabilityOf(usable),
    channel,
    winnability: summarizeWinnability(
      usable.map((r) => r.winnability).filter((w): w is Winnability => w !== null)
    ),
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
    // Entries scanned before multi-run sampling existed were a single sample.
    runsPerPrompt: r.runs_per_prompt ?? 1,
    stability: r.stability ?? 0,
    // Entries scanned before grounding existed were parametric by definition.
    channel: r.channel ?? 'parametric',
    winnability: r.winnability ?? { winnable: 0, hard: 0, locked: 0 },
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
    // The bootstrap seed file predates sampling, so treat a missing value as one sample.
    runs_per_prompt: result.runsPerPrompt ?? 1,
    stability: result.stability ?? 0,
    channel: result.channel ?? 'parametric',
    winnability: result.winnability ?? { winnable: 0, hard: 0, locked: 0 },
    raw_rows: rows,
    status: 'completed',
    error_message: null,
    scanned_at: result.scannedAt,
    updated_at: new Date().toISOString(),
  }
}
