export interface AnalysisResult {
  brandMentioned: boolean
  brandPosition: number | null
  brandSentiment: 'positive' | 'neutral' | 'negative'
  competitorsMentioned: string[]
  sentimentScore: number
}

// Phrases that signal AI is unfamiliar with the brand → counts as NOT mentioned
const UNFAMILIAR_PHRASES = [
  "i'm not familiar with",
  "i am not familiar with",
  "not familiar with",
  "i don't have information about",
  "i do not have information about",
  "don't have information on",
  "no information about",
  "not aware of",
  "i'm not aware of",
  "i am not aware of",
  "never heard of",
  "doesn't appear to exist",
  "does not appear to exist",
  "couldn't find information",
  "could not find information",
  "unable to find information",
  "no specific information about",
  "i cannot find",
  "i can't find",
  "i don't recognize",
  "i do not recognize",
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Matches a brand name as a whole word, so "Linear" does not match "linearly",
 * "Make" does not match "Maker", and "Hey" does not match "they". Trailing
 * punctuation in names ("Monday.com", "Tray.io") is handled by escaping, and
 * possessives ("Notion's") still match since "'" is not alphanumeric.
 */
function brandRegex(brandName: string): RegExp {
  return new RegExp(`(?<![a-z0-9])${escapeRegex(brandName.toLowerCase())}(?![a-z0-9])`, 'i')
}

function mentionsName(text: string, name: string): boolean {
  return brandRegex(name).test(text.toLowerCase())
}

function isUnfamiliarResponse(response: string, brandName: string): boolean {
  const lower = response.toLowerCase()
  const lowerBrand = brandName.toLowerCase()

  for (const phrase of UNFAMILIAR_PHRASES) {
    const phraseIdx = lower.indexOf(phrase)
    if (phraseIdx === -1) continue

    // Check if brand appears within 150 chars of the phrase
    const vicinity = lower.substring(
      Math.max(0, phraseIdx - 50),
      Math.min(lower.length, phraseIdx + phrase.length + 150)
    )
    if (vicinity.includes(lowerBrand)) return true

    // If phrase is in the first 200 chars and brand appears anywhere → unfamiliar
    if (phraseIdx < 200 && lower.includes(lowerBrand)) return true
  }
  return false
}

export function analyzeMentions(
  response: string,
  brandName: string,
  competitors: string[]
): AnalysisResult {
  // Brand must appear as a whole word AND AI must not be saying "I don't know X"
  const rawMentioned = mentionsName(response, brandName)
  const brandMentioned = rawMentioned && !isUnfamiliarResponse(response, brandName)

  // Find brand position in numbered lists
  let brandPosition: number | null = null
  if (brandMentioned) {
    const lines = response.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (mentionsName(lines[i], brandName)) {
        const match = lines[i].match(/^[\s]*(\d+)[.\):\-]/)
        if (match) {
          brandPosition = parseInt(match[1])
        } else {
          brandPosition = i + 1
        }
        break
      }
    }
  }

  // Check competitor mentions
  const competitorsMentioned = competitors.filter(comp => mentionsName(response, comp))

  // Sentiment only applies when brand is genuinely mentioned
  let sentimentScore = 0
  if (brandMentioned) {
    sentimentScore += 3

    if (brandPosition !== null) {
      if (brandPosition <= 3) sentimentScore += 4
      else if (brandPosition <= 5) sentimentScore += 2
      else sentimentScore += 1
    }

    const positiveTerms = ['best', 'excellent', 'top', 'leading', 'popular', 'recommended', 'powerful', 'innovative', 'great']
    const negativeTerms = ['worst', 'poor', 'bad', 'expensive', 'limited', 'lacking', 'outdated', 'slow']

    const brandContext = extractBrandContext(response, brandName)
    const contextLower = brandContext.toLowerCase()

    positiveTerms.forEach(term => { if (contextLower.includes(term)) sentimentScore += 1 })
    negativeTerms.forEach(term => { if (contextLower.includes(term)) sentimentScore -= 2 })

    sentimentScore = Math.max(-10, Math.min(10, sentimentScore))
  }
  // sentimentScore stays 0 if brand not mentioned — no phantom points

  let brandSentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  if (sentimentScore > 2) brandSentiment = 'positive'
  else if (sentimentScore < -2) brandSentiment = 'negative'

  return {
    brandMentioned,
    brandPosition,
    brandSentiment,
    competitorsMentioned,
    sentimentScore,
  }
}

function extractBrandContext(response: string, brandName: string): string {
  const index = response.toLowerCase().search(brandRegex(brandName))
  if (index === -1) return ''
  const start = Math.max(0, index - 100)
  const end = Math.min(response.length, index + brandName.length + 100)
  return response.substring(start, end)
}

// Prompts that use the brand name as subject always echo it — exclude from visibility scoring
export function isBrandEchoPrompt(prompt: string, brandName: string): boolean {
  const p = prompt.toLowerCase().trim()
  const b = brandName.toLowerCase()
  return (
    p === `what is ${b}` ||
    p.startsWith(`what is ${b} `) ||
    p === `${b} review` ||
    p === `${b} reviews` ||
    p === `is ${b} good` ||
    p.startsWith(`is ${b} good for`) ||
    p === `${b} menu and reviews` ||
    p === `${b} hotel review`
  )
}

// Competitor-specific prompts ("alternatives to X", "X vs competitors") are about
// a competitor — the main brand NOT appearing is expected, not a real opportunity
export function isCompetitorEchoPrompt(prompt: string, competitors: string[]): boolean {
  const p = prompt.toLowerCase().trim()
  return competitors.some(comp => {
    const c = comp.toLowerCase()
    return (
      p === `alternatives to ${c}` ||
      p === `${c} vs competitors` ||
      p.startsWith(`restaurants similar to ${c}`) ||
      p.startsWith(`hotels like ${c}`) ||
      p.startsWith(`${c} alternatives`) ||
      p.startsWith(`companies like ${c}`)
    )
  })
}

export function getScoreLabel(score: number): string {
  if (score >= 81) return 'Dominant'
  if (score >= 66) return 'Strong'
  if (score >= 46) return 'Moderate'
  if (score >= 26) return 'Low'
  if (score >= 11) return 'Very Low'
  return 'Invisible'
}

export function getScoreColor(score: number): string {
  if (score >= 66) return 'emerald'
  if (score >= 26) return 'amber'
  return 'red'
}

interface PromptResultForAnalysis {
  brand_mentioned: boolean
  competitors_mentioned: string[]
  sentiment_score: number
  position: number | null
  prompt?: string
}

// New formula: 50% mention frequency, 30% position, 20% sentiment
// Echo prompts excluded. Score capped at 15 if brand never genuinely mentioned.
export function calculateVisibilityScore(
  promptResults: PromptResultForAnalysis[],
  brandName?: string
): number {
  if (promptResults.length === 0) return 0

  // Separate scoring prompts from echo prompts
  const scoringResults = brandName
    ? promptResults.filter(r => !(r.prompt && isBrandEchoPrompt(r.prompt, brandName)))
    : promptResults

  const results = scoringResults.length > 0 ? scoringResults : promptResults
  const totalPrompts = results.length

  const mentionCount = results.filter(r => r.brand_mentioned).length
  const mentionFrequencyScore = (mentionCount / totalPrompts) * 100

  // If brand never genuinely mentioned, score cannot exceed 15
  if (mentionCount === 0) {
    return Math.min(15, Math.round(mentionFrequencyScore * 0.5))
  }

  // Sentiment only from prompts where brand WAS mentioned
  const mentionedResults = results.filter(r => r.brand_mentioned)
  const avgSentiment =
    mentionedResults.reduce((sum, r) => sum + r.sentiment_score, 0) / mentionedResults.length
  const sentimentScore = ((avgSentiment + 10) / 20) * 100

  // Position score
  const positionedResults = mentionedResults.filter(r => r.position !== null)
  let positionScore = 0
  if (positionedResults.length > 0) {
    const avgPosition = positionedResults.reduce((sum, r) => sum + (r.position || 10), 0) / positionedResults.length
    positionScore = Math.max(0, (1 - (avgPosition - 1) / 10)) * 100
  }

  const finalScore = Math.round(
    mentionFrequencyScore * 0.5 +
    sentimentScore * 0.2 +
    positionScore * 0.3
  )

  return Math.max(0, Math.min(100, finalScore))
}

export function analyzeCompetitorGaps(
  promptResults: PromptResultForAnalysis[],
  competitors: string[],
  _brandName?: string
): Array<{
  competitorName: string
  mentionCount: number
  gapScore: number
  promptsAppeared: string[]
}> {
  const brandMentionCount = promptResults.filter(r => r.brand_mentioned).length

  return competitors.map(competitor => {
    const competitorResults = promptResults.filter(r =>
      r.competitors_mentioned.some(c => c.toLowerCase() === competitor.toLowerCase())
    )
    const mentionCount = competitorResults.length
    const gapScore = mentionCount - brandMentionCount

    return {
      competitorName: competitor,
      mentionCount,
      gapScore,
      promptsAppeared: [],
    }
  })
}

export function findPromptOpportunities(
  promptResults: Array<PromptResultForAnalysis & { prompt: string }>,
  brandName?: string,
  competitors?: string[]
): Array<{
  prompt: string
  competitorsFound: string[]
  opportunityScore: number
  searchIntent: string
}> {
  // Exclude brand-echo prompts and competitor-specific prompts from opportunities
  // "alternatives to KFC" not mentioning McDonald's is expected — not a real missed opportunity
  const discoveryResults = promptResults.filter(r => {
    if (brandName && isBrandEchoPrompt(r.prompt, brandName)) return false
    if (competitors && isCompetitorEchoPrompt(r.prompt, competitors)) return false
    return true
  })

  return discoveryResults
    .filter(r => !r.brand_mentioned && r.competitors_mentioned.length > 0)
    .map(r => {
      const intentWeight = r.prompt.toLowerCase().includes('best') ? 2 : 1
      const opportunityScore = Math.min(100, r.competitors_mentioned.length * 20 * intentWeight)

      const lowerPrompt = r.prompt.toLowerCase()
      let searchIntent = 'general'
      if (lowerPrompt.includes('alternative') || lowerPrompt.includes('vs')) searchIntent = 'comparison'
      else if (lowerPrompt.includes('best') || lowerPrompt.includes('top')) searchIntent = 'recommendation'
      else if (lowerPrompt.includes('review')) searchIntent = 'evaluation'

      return {
        prompt: r.prompt,
        competitorsFound: r.competitors_mentioned,
        opportunityScore,
        searchIntent,
      }
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
}
