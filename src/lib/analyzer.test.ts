import { describe, it, expect } from 'vitest'
import {
  analyzeMentions,
  calculateVisibilityScore,
  isBrandEchoPrompt,
  isCompetitorEchoPrompt,
  getScoreLabel,
  findPromptOpportunities,
} from './analyzer'

// Helper to build a prompt-result row from analyzeMentions output
function row(prompt: string, response: string, brand: string, competitors: string[]) {
  const a = analyzeMentions(response, brand, competitors)
  return {
    prompt,
    brand_mentioned: a.brandMentioned,
    competitors_mentioned: a.competitorsMentioned,
    sentiment_score: a.sentimentScore,
    position: a.brandPosition,
  }
}

describe('analyzeMentions — unfamiliar brand detection', () => {
  it('does NOT count "I\'m not familiar with X" as a mention', () => {
    const r = analyzeMentions(
      "I'm not familiar with dvhfdfdsrs, but here are some general tips.",
      'dvhfdfdsrs',
      []
    )
    expect(r.brandMentioned).toBe(false)
    expect(r.sentimentScore).toBe(0)
  })

  it('does NOT count "I don\'t have information about X"', () => {
    const r = analyzeMentions(
      "I don't have information about xkqzpwmnvb.",
      'xkqzpwmnvb',
      []
    )
    expect(r.brandMentioned).toBe(false)
  })

  it('DOES count a genuine recommendation', () => {
    const r = analyzeMentions(
      '1. McDonald\'s — the most popular fast food chain.\n2. Burger King',
      "McDonald's",
      ['Burger King']
    )
    expect(r.brandMentioned).toBe(true)
    expect(r.brandPosition).toBe(1)
    expect(r.competitorsMentioned).toContain('Burger King')
  })

  it('sentiment is zero when brand is not mentioned at all', () => {
    const r = analyzeMentions('Here are some great burger options: Wendy\'s.', 'Acme', ['Wendy\'s'])
    expect(r.brandMentioned).toBe(false)
    expect(r.sentimentScore).toBe(0)
  })
})

describe('analyzeMentions — whole-word matching', () => {
  it('does not count a brand name embedded in a longer word', () => {
    const r = analyzeMentions('Costs scale linearly with usage.', 'Linear', [])
    expect(r.brandMentioned).toBe(false)
  })

  it('does not count common-word brands inside other words', () => {
    expect(analyzeMentions('They said the maker is fine.', 'Make', []).brandMentioned).toBe(false)
    expect(analyzeMentions('They also offer this.', 'Hey', []).brandMentioned).toBe(false)
    expect(analyzeMentions('Use Squarespace for sites.', 'Square', []).brandMentioned).toBe(false)
  })

  it('still counts the brand as a standalone word', () => {
    expect(analyzeMentions('1. Linear is a great tracker.', 'Linear', []).brandMentioned).toBe(true)
  })

  it('counts possessive and punctuated forms', () => {
    expect(analyzeMentions("Notion's database is flexible.", 'Notion', []).brandMentioned).toBe(true)
    expect(analyzeMentions('Try Monday.com for teams.', 'Acme', ['Monday.com']).competitorsMentioned)
      .toContain('Monday.com')
  })

  it('applies whole-word matching to competitors too', () => {
    const r = analyzeMentions('Costs grow linearly; use Squarespace.', 'Acme', ['Linear', 'Square'])
    expect(r.competitorsMentioned).toEqual([])
  })
})

describe('calculateVisibilityScore — PRD Test Group 3 (fake brands score 0-10)', () => {
  const fakeBrands = ['dvhfdfdsrs', 'xkqzpwmnvb', 'qqqqqqqqqq', 'testbrand123xyz']

  for (const fake of fakeBrands) {
    it(`fake brand "${fake}" scores <= 10`, () => {
      // AI never genuinely mentions a non-existent brand
      const results = [
        row(`best restaurants`, 'Try McDonald\'s and Subway.', fake, ['McDonald\'s', 'Subway']),
        row(`top food chains`, 'Popular chains include KFC.', fake, ['KFC']),
        row(`what is ${fake}`, `I'm not familiar with ${fake}.`, fake, []),
        row(`${fake} review`, `I have no information about ${fake}.`, fake, []),
      ]
      const score = calculateVisibilityScore(results, fake)
      expect(score).toBeLessThanOrEqual(10)
    })
  }

  it('zero genuine mentions is capped at 15 even with many prompts', () => {
    const results = Array.from({ length: 20 }, (_, i) =>
      row(`prompt ${i}`, 'Some competitors are mentioned: Nike.', 'Faketon', ['Nike'])
    )
    const score = calculateVisibilityScore(results, 'Faketon')
    expect(score).toBeLessThanOrEqual(15)
  })
})

describe('calculateVisibilityScore — real brand scores meaningfully', () => {
  it('a brand mentioned in most prompts at top position scores high', () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      row(`best saas tool ${i}`, '1. Acme is the best and most recommended platform.', 'Acme', ['Other'])
    )
    const score = calculateVisibilityScore(results, 'Acme')
    expect(score).toBeGreaterThan(60)
  })

  it('a brand mentioned in half the prompts scores in a moderate range', () => {
    const results = [
      ...Array.from({ length: 5 }, () => row('best tool', '1. Acme leads the market.', 'Acme', [])),
      ...Array.from({ length: 5 }, () => row('top tool', 'Competitors: Nike.', 'Acme', ['Nike'])),
    ]
    const score = calculateVisibilityScore(results, 'Acme')
    expect(score).toBeGreaterThan(15)
    expect(score).toBeLessThan(80)
  })
})

describe('isBrandEchoPrompt', () => {
  it('flags brand-name echo prompts', () => {
    expect(isBrandEchoPrompt('what is Acme', 'Acme')).toBe(true)
    expect(isBrandEchoPrompt('Acme review', 'Acme')).toBe(true)
    expect(isBrandEchoPrompt('is Acme good', 'Acme')).toBe(true)
  })
  it('does not flag discovery prompts', () => {
    expect(isBrandEchoPrompt('best saas tools', 'Acme')).toBe(false)
    expect(isBrandEchoPrompt('top restaurants in Mumbai', 'Acme')).toBe(false)
  })
})

describe('isCompetitorEchoPrompt', () => {
  it('flags competitor-specific prompts', () => {
    expect(isCompetitorEchoPrompt('alternatives to KFC', ['KFC'])).toBe(true)
    expect(isCompetitorEchoPrompt('KFC vs competitors', ['KFC'])).toBe(true)
  })
  it('does not flag generic discovery prompts', () => {
    expect(isCompetitorEchoPrompt('best fast food', ['KFC'])).toBe(false)
  })
})

describe('getScoreLabel — PRD interpretation bands', () => {
  it('maps scores to the correct labels', () => {
    expect(getScoreLabel(5)).toBe('Invisible')
    expect(getScoreLabel(20)).toBe('Very Low')
    expect(getScoreLabel(35)).toBe('Low')
    expect(getScoreLabel(55)).toBe('Moderate')
    expect(getScoreLabel(72)).toBe('Strong')
    expect(getScoreLabel(90)).toBe('Dominant')
  })
})

describe('findPromptOpportunities', () => {
  it('surfaces prompts where competitors appear but the brand does not', () => {
    const results = [
      { prompt: 'best burgers', brand_mentioned: false, competitors_mentioned: ['Wendy\'s'], sentiment_score: 0, position: null },
      { prompt: 'top fast food', brand_mentioned: true, competitors_mentioned: [], sentiment_score: 5, position: 1 },
    ]
    const opps = findPromptOpportunities(results, 'Acme', ['Wendy\'s'])
    expect(opps.length).toBe(1)
    expect(opps[0].prompt).toBe('best burgers')
    expect(opps[0].competitorsFound).toContain('Wendy\'s')
  })

  it('excludes brand-echo and competitor-echo prompts from opportunities', () => {
    const results = [
      { prompt: 'what is Acme', brand_mentioned: false, competitors_mentioned: ['Wendy\'s'], sentiment_score: 0, position: null },
      { prompt: 'alternatives to Wendy\'s', brand_mentioned: false, competitors_mentioned: ['Wendy\'s'], sentiment_score: 0, position: null },
    ]
    const opps = findPromptOpportunities(results, 'Acme', ['Wendy\'s'])
    expect(opps.length).toBe(0)
  })
})
