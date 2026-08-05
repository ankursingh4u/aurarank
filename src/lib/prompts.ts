export interface MarketRegion {
  type: 'global' | 'country' | 'state' | 'city'
  country?: string
  state?: string
  city?: string
}

function regionSuffix(region?: MarketRegion): string {
  if (!region || region.type === 'global') return ''
  if (region.type === 'country' && region.country) return ` in ${region.country}`
  if (region.type === 'state' && region.state && region.country) return ` in ${region.state}, ${region.country}`
  if (region.type === 'city' && region.city) {
    const parts = [region.city, region.state, region.country].filter(Boolean)
    return ` in ${parts.join(', ')}`
  }
  return ''
}

function locationName(region?: MarketRegion): string {
  if (!region || region.type === 'global') return ''
  if (region.type === 'city' && region.city) return region.city
  if (region.type === 'state' && region.state) return region.state
  if (region.type === 'country' && region.country) return region.country
  return ''
}

type IndustryCategory = 'restaurant' | 'hotel' | 'saas' | 'generic'

function detectIndustryCategory(industry: string): IndustryCategory {
  const lower = industry.toLowerCase()
  if (/restaurant|food|dining|cafe|bakery|pizz|sushi|burger|bar\b|grill|bistro|eatery|catering/.test(lower)) {
    return 'restaurant'
  }
  if (/hotel|travel|hospitality|resort|motel|lodging|airbnb|hostel|vacation|booking|stay/.test(lower)) {
    return 'hotel'
  }
  if (/saas|software|tech|devtools|analytics|cybersecurity|ai|platform|app\b|cloud|api|tool/.test(lower)) {
    return 'saas'
  }
  return 'generic'
}

function getIndustryPrompts(
  category: IndustryCategory,
  industry: string,
  loc: string,
  location: string,
): string[] {
  switch (category) {
    case 'restaurant':
      return [
        `best ${industry}${loc}`,
        `top ${industry} chains`,
        `most popular ${industry} brands`,
        `best ${industry} near me`,
        `top rated ${industry}${loc}`,
        ...(location ? [
          `best ${industry} in ${location}`,
          `top ${industry} chains in ${location}`,
          `popular ${industry} spots in ${location}`,
          `recommended ${industry} in ${location}`,
        ] : []),
        `best ${industry} restaurants`,
        `most visited ${industry} places`,
        `recommended ${industry} options`,
        `top ${industry} for families`,
      ]
    case 'hotel':
      return [
        `best hotels${loc}`,
        `where to stay${loc}`,
        `luxury hotels${loc}`,
        `top rated hotels${loc}`,
        ...(location ? [
          `best hotels in ${location}`,
          `where to stay in ${location}`,
          `luxury hotels in ${location}`,
          `affordable hotels in ${location}`,
          `best ${industry} in ${location}`,
        ] : []),
        `best ${industry} accommodations`,
        `${industry} booking recommendations${loc}`,
        `top ${industry} places to stay${loc}`,
        `recommended ${industry} for families${loc}`,
      ]
    case 'saas': {
      // Users type "project management software" or "CRM tools"; the templates below
      // add their own qualifier, so strip a trailing one to avoid "software software".
      const base = industry.replace(/\s+(software|tools?|platforms?|apps?|solutions?)$/i, '').trim() || industry
      return [
        `best ${base} tools`,
        `top ${base} software`,
        `${base} platform comparison`,
        `best ${base} for small business`,
        `best ${base} tools in 2025`,
        `${base} software comparison`,
        `which ${base} tool should I use`,
        `top ${base} platforms for startups`,
        `enterprise ${base} solutions`,
        `free ${base} tools`,
        `${base} tools for teams`,
        ...(loc ? [
          `best ${base} tools${loc}`,
          `top ${base} software${loc}`,
        ] : []),
      ]
    }
    case 'generic':
      return [
        `best ${industry}${loc}`,
        `top ${industry} companies${loc}`,
        `recommended ${industry} services${loc}`,
        `${industry} comparison${loc}`,
        `best ${industry} for small business${loc}`,
        `${industry} reviews${loc}`,
        `top rated ${industry}${loc}`,
        `most popular ${industry} providers${loc}`,
        ...(location ? [
          `best ${industry} in ${location}`,
          `top ${industry} companies in ${location}`,
        ] : []),
      ]
  }
}

export function generatePrompts(
  industry: string,
  brandName: string,
  competitors: string[],
  region?: MarketRegion,
  customPrompts?: string[],
): string[] {
  const loc = regionSuffix(region)
  const location = locationName(region)
  const category = detectIndustryCategory(industry)

  // Industry-specific prompts
  const industryPrompts = getIndustryPrompts(category, industry, loc, location)

  // Brand-specific prompts (always included)
  const brandPrompts = [
    `what is ${brandName}`,
    `${brandName} review`,
    `is ${brandName} good`,
    `${brandName} reviews`,
    ...(category === 'restaurant' ? [
      `${brandName} menu and reviews`,
    ] : category === 'hotel' ? [
      `${brandName} hotel review`,
    ] : [
      `is ${brandName} good for ${industry}`,
    ]),
  ]

  // Competitor-specific prompts (always included)
  const competitorPrompts = competitors.flatMap(comp => {
    const base = [
      `alternatives to ${comp}`,
      `${comp} vs competitors`,
    ]
    if (category === 'restaurant') {
      base.push(`restaurants similar to ${comp}${loc}`)
    } else if (category === 'hotel') {
      base.push(`hotels like ${comp}${loc}`)
    } else if (category === 'saas') {
      base.push(`${comp} alternatives for ${industry}`)
    } else {
      base.push(`companies like ${comp}${loc}`)
    }
    return base
  })

  // Merge all prompts, deduplicate
  const allPrompts = [
    ...industryPrompts,
    ...brandPrompts,
    ...competitorPrompts,
    ...(customPrompts || []),
  ]

  // Deduplicate (case-insensitive) while preserving order
  const seen = new Set<string>()
  const unique = allPrompts.filter(p => {
    const key = p.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Target 15-25 prompts: cap at 25
  return unique.slice(0, 25)
}

export function categorizeSearchIntent(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()
  if (lowerPrompt.includes('alternative') || lowerPrompt.includes('vs')) return 'comparison'
  if (lowerPrompt.includes('best') || lowerPrompt.includes('top')) return 'recommendation'
  if (lowerPrompt.includes('review')) return 'evaluation'
  if (lowerPrompt.includes('what is') || lowerPrompt.includes('how')) return 'informational'
  return 'general'
}
