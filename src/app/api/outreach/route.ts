import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Outreach draft generator — the off-site "fix".
 *
 * The single most effective way to get named by an LLM is to be mentioned on the
 * third-party sources LLMs read and cite (review platforms, "best of" listicles,
 * communities, directories). This endpoint looks at the prompts where competitors
 * beat the brand and generates a prioritized hit-list of those sources plus a
 * ready-to-send outreach draft for each.
 *
 * Runs on the existing OpenAI key — no extra API cost. Max-plan gated, like the
 * other fix features (boost, recommendations).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { data: userPlan } = await db
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    if ((userPlan?.plan || 'starter') !== 'max') {
      return NextResponse.json({ error: 'Upgrade to Max plan to generate outreach drafts.' }, { status: 403 })
    }

    const { scanId } = await request.json()
    if (!scanId) return NextResponse.json({ error: 'scanId is required' }, { status: 400 })

    const { data: scan } = await db
      .from('scans')
      .select('*, brands!inner(brand_name, industry, competitors, website, market_region)')
      .eq('id', scanId)
      .single()

    if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

    const brand = scan.brands as unknown as {
      brand_name: string
      industry: string
      competitors: string[]
      website: string | null
      market_region?: { city?: string; state?: string; country?: string }
    }

    // Pull the prompts where competitors win but the brand is absent — these are
    // the gaps outreach should target.
    const [opportunities, competitorAnalysis] = await Promise.all([
      db.from('prompt_opportunities').select('prompt, competitors_found').eq('scan_id', scanId).limit(8),
      db.from('competitor_analysis').select('competitor_name, mention_count').eq('scan_id', scanId).order('mention_count', { ascending: false }).limit(5),
    ])

    const region = brand.market_region?.city || brand.market_region?.state || brand.market_region?.country || 'global'
    const topCompetitors = (competitorAnalysis.data || []).map((c: { competitor_name: string; mention_count: number }) => c.competitor_name).join(', ') || 'competitors in this space'
    const missedPrompts = (opportunities.data || [])
      .map((o: { prompt: string; competitors_found: string[] }) => `- "${o.prompt}" (AI named: ${(o.competitors_found || []).join(', ') || 'competitors'})`)
      .join('\n') || '- (no specific gaps recorded yet — use general category sources)'

    const systemPrompt = `You are an AI-visibility outreach strategist. The most effective way to get a brand recommended by LLMs (ChatGPT, Gemini, Perplexity) is to get it mentioned on the third-party web sources those models read and trust: review platforms, "best of" listicles, niche communities, directories, and well-known publications in the brand's category. You produce a prioritized, realistic hit-list of such sources and a ready-to-send outreach message for each. Be specific to the industry — name real, well-known source types/sites where possible. Never invent fake contacts or fake stats about the brand.`

    const userPrompt = `Brand: ${brand.brand_name}
Industry: ${brand.industry}
Website: ${brand.website || 'not provided'}
Market: ${region}
Top competitors AI recommends instead: ${topCompetitors}

Questions where competitors win but ${brand.brand_name} is absent:
${missedPrompts}

Generate the 6 highest-impact off-site sources to get ${brand.brand_name} mentioned on, so LLMs start recommending it. Prioritize by how much LLMs rely on that source type for this industry.

Return ONLY valid JSON in this exact shape:
{
  "targets": [
    {
      "source": "specific source name or type (e.g. 'G2 — CRM category', 'r/startups', 'Top 10 CRMs listicle on a SaaS blog')",
      "type": "review platform | listicle | community | directory | publication | wiki",
      "impact": "high | medium | low",
      "why": "1-2 sentences on why LLMs trust this source for this industry and why it will move the brand's visibility",
      "action": "the concrete step to take (e.g. 'Claim and complete your G2 listing, then request 5 customer reviews')",
      "draft": "a ready-to-send outreach message (email or DM). Include a subject line if it's an email. Personalized, concise, no placeholders like [INSERT] — infer reasonable specifics from the industry and brand."
    }
  ]
}

Order targets from highest impact to lowest. Make every draft genuinely sendable today.`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{"targets":[]}'
    const parsed = JSON.parse(raw)
    const targets = Array.isArray(parsed.targets) ? parsed.targets : []

    return NextResponse.json({ targets })
  } catch (error) {
    console.error('Outreach generation error:', error)
    return NextResponse.json({ error: 'Failed to generate outreach drafts' }, { status: 500 })
  }
}
