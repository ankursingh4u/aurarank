import type { Db } from '@/lib/pgq'
import { generatePrompts, type MarketRegion } from '@/lib/prompts'
import {
  calculateVisibilityScore,
  analyzeCompetitorGaps,
  findPromptOpportunities,
  isBrandEchoPrompt,
} from '@/lib/analyzer'
import { getScanEngines, queryEnginesAndAnalyze, type Channel } from '@/lib/engines'
import { classifyWinnability, type Winnability } from '@/lib/winnability'

export interface ScanRunResult {
  scanId: string
  brandName: string
  visibilityScore: number
  mentionCount: number
  competitorMentionCount: number
  promptsProcessed: number
  opportunitiesFound: number
}

async function processBatch<T>(items: T[], batchSize: number, processor: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.allSettled(batch.map(processor))
  }
}

/**
 * Runs a full AI-visibility scan for an existing scan row: queries the AI for
 * every generated prompt, analyzes mentions, and persists prompt results,
 * competitor analysis, opportunities, and the final score.
 *
 * Works with either a user-scoped (RLS) client or a service-role client, so it
 * is shared by the interactive execute route and the scheduled cron job.
 */
export async function runScan(supabase: Db, scanId: string): Promise<ScanRunResult> {
  const { data: scan } = await supabase
    .from('scans')
    .select('*, brands!inner(*)')
    .eq('id', scanId)
    .single()

  if (!scan) throw new Error('Scan not found')

  const brand = scan.brands as unknown as {
    brand_name: string
    industry: string
    competitors: string[]
    website: string | null
    market_region?: { type: string; country?: string; state?: string; city?: string }
    user_id?: string
  }

  await supabase.from('scans').update({ status: 'running' }).eq('id', scanId)

  // Engines depend on the brand owner's plan: free→ChatGPT, pro→+Gemini, max→+Claude.
  let plan = 'starter'
  if (brand.user_id) {
    const { data: up } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', brand.user_id)
      .single()
    plan = up?.plan || 'starter'
  }
  const engines = getScanEngines(plan)

  const prompts = generatePrompts(
    brand.industry,
    brand.brand_name,
    brand.competitors,
    brand.market_region as MarketRegion | undefined
  )

  const promptResultsData: Array<{
    scan_id: string
    prompt: string
    ai_model: string
    ai_response: string
    brand_mentioned: boolean
    brand_sentiment: string
    competitors_mentioned: string[]
    sentiment_score: number
    position: number | null
    /** Source domains the engines read. Empty on a parametric scan. */
    citations: string[]
    /** Same sources split per engine: the engines overlap far less than expected. */
    citations_by_engine: Record<string, string[]>
    channel: Channel
    /** Null when the prompt errored: nothing was retrieved, so there is nothing to grade. */
    winnability: Winnability | null
  }> = []

  // Smaller batch since each prompt now fans out across multiple engines.
  await processBatch(prompts, 4, async (prompt) => {
    try {
      const r = await queryEnginesAndAnalyze(prompt, engines, brand.brand_name, brand.competitors)
      promptResultsData.push({
        scan_id: scanId,
        prompt,
        ai_model: r.aiModel,
        ai_response: r.aiResponse,
        brand_mentioned: r.analysis.brandMentioned,
        brand_sentiment: r.analysis.brandSentiment,
        competitors_mentioned: r.analysis.competitorsMentioned,
        sentiment_score: r.analysis.sentimentScore,
        position: r.analysis.brandPosition,
        // The fix list: the pages the AI actually read, and whether this
        // question is worth working on at all.
        citations: r.citations,
        citations_by_engine: r.citationsByEngine,
        channel: r.channel,
        winnability: classifyWinnability(r.citations, brand.competitors).class,
      })
    } catch (err) {
      console.error(`Failed to process prompt: ${prompt}`, err)
      promptResultsData.push({
        scan_id: scanId,
        prompt,
        ai_model: 'none',
        ai_response: 'Error: Failed to get AI response',
        brand_mentioned: false,
        brand_sentiment: 'neutral',
        competitors_mentioned: [],
        sentiment_score: 0,
        position: null,
        // Errored: no answer, so no sources and nothing to grade. Left null
        // rather than 'locked' so a failed request never reads as a verdict
        // that this question is not worth working on.
        citations: [],
        citations_by_engine: {},
        channel: 'grounded',
        winnability: null,
      })
    }
  })

  if (promptResultsData.length > 0) {
    const { error } = await supabase.from('prompt_results').insert(promptResultsData)
    if (error) {
      // add_grounded_scanning.sql may not have run yet. Losing a whole scan
      // because of four extra columns is far worse than losing the citations,
      // so retry with the long-standing columns only.
      console.warn('prompt_results insert failed, retrying without citation columns:', error.message)
      const stripped = promptResultsData.map(
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        ({ citations, citations_by_engine, channel, winnability, ...rest }) => rest
      )
      const retry = await supabase.from('prompt_results').insert(stripped)
      if (retry.error) console.error('prompt_results insert failed:', retry.error.message)
    }
  }

  const visibilityScore = calculateVisibilityScore(promptResultsData, brand.brand_name)
  const mentionCount = promptResultsData.filter(
    (r) => r.brand_mentioned && !isBrandEchoPrompt(r.prompt, brand.brand_name)
  ).length
  const competitorMentionCount = promptResultsData.reduce(
    (sum, r) => sum + r.competitors_mentioned.length,
    0
  )

  const gaps = analyzeCompetitorGaps(promptResultsData, brand.competitors, brand.brand_name)
  const competitorAnalysisData = gaps.map((gap) => ({
    scan_id: scanId,
    competitor_name: gap.competitorName,
    mention_count: gap.mentionCount,
    gap_score: gap.gapScore,
    prompts_appeared: promptResultsData
      .filter((r) => r.competitors_mentioned.some((c) => c.toLowerCase() === gap.competitorName.toLowerCase()))
      .map((r) => r.prompt),
  }))
  if (competitorAnalysisData.length > 0) {
    await supabase.from('competitor_analysis').insert(competitorAnalysisData)
  }

  const opportunities = findPromptOpportunities(
    promptResultsData.map((r) => ({ ...r, prompt: r.prompt })),
    brand.brand_name,
    brand.competitors
  )
  const opportunityData = opportunities.map((opp) => ({
    scan_id: scanId,
    prompt: opp.prompt,
    competitors_found: opp.competitorsFound,
    opportunity_score: opp.opportunityScore,
    search_intent: opp.searchIntent,
  }))
  if (opportunityData.length > 0) {
    await supabase.from('prompt_opportunities').insert(opportunityData)
  }

  await supabase
    .from('scans')
    .update({
      status: 'completed',
      visibility_score: visibilityScore,
      mention_count: mentionCount,
      competitor_mention_count: competitorMentionCount,
    })
    .eq('id', scanId)

  return {
    scanId,
    brandName: brand.brand_name,
    visibilityScore,
    mentionCount,
    competitorMentionCount,
    promptsProcessed: promptResultsData.length,
    opportunitiesFound: opportunities.length,
  }
}
