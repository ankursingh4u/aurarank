import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai'
import { PLANS } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

function periodStartFor(userPlan: { current_period_start?: string | null } | null): Date {
  if (userPlan?.current_period_start) return new Date(userPlan.current_period_start)
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Article generator — produces an answer-engine-optimized article the user can
 * publish to their own site. Tuned to how LLMs read content: clear question-style
 * headings, direct answers, lists, and a FAQ block (the patterns most likely to
 * be extracted and cited). Runs on the existing OpenAI key. Max-plan gated.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { data: userPlan } = await db
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const plan = (userPlan?.plan as keyof typeof PLANS) || 'starter'
    const publishLimit = PLANS[plan]?.publishLimit ?? 0
    if (publishLimit <= 0) {
      return NextResponse.json({ error: 'Upgrade to Pro or Max to generate & publish articles.' }, { status: 403 })
    }

    // Generating an article calls OpenAI (a real per-call cost) — cap the number
    // of generations per period (Pro 5 / Max 20). Saving drafts is free.
    const generationLimit = PLANS[plan]?.generationLimit ?? 0
    const periodStart = periodStartFor(userPlan)
    const { count: genUsed } = await db
      .from('article_generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', periodStart.toISOString())

    if ((genUsed || 0) >= generationLimit) {
      const resetMsg = userPlan?.current_period_end
        ? ` It resets on ${new Date(userPlan.current_period_end).toLocaleDateString()}.`
        : ''
      return NextResponse.json(
        { error: `You've used all ${generationLimit} article generations for this period.${resetMsg}` },
        { status: 403 }
      )
    }

    const { brandId, topic } = await request.json()
    if (!brandId) return NextResponse.json({ error: 'brandId is required' }, { status: 400 })

    const { data: brand } = await db
      .from('brands')
      .select('brand_name, industry, website, competitors, market_region')
      .eq('id', brandId)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    const region = brand.market_region?.city || brand.market_region?.state || brand.market_region?.country || ''
    const competitors = Array.isArray(brand.competitors) ? brand.competitors.join(', ') : ''

    const systemPrompt = `You are an answer-engine-optimization (AEO) writer. You write articles designed to be read, trusted, and cited by AI assistants (ChatGPT, Gemini, Perplexity). Your articles use clear question-style H2 headings, give the direct answer first, use short paragraphs and lists, include a "Frequently Asked Questions" section, and mention the brand naturally and factually. Never invent fake statistics, awards, or testimonials. Do not use em dashes or en dashes (the "—" or "–" characters) anywhere; use commas, colons, or periods instead.`

    const userPrompt = `Write one publish-ready article for this brand.

Brand: ${brand.brand_name}
Industry: ${brand.industry}
Website: ${brand.website || 'not provided'}
${region ? `Market/Location: ${region}` : ''}
${competitors ? `Competitors in space: ${competitors}` : ''}
${topic ? `Topic to cover: ${topic}` : `Topic: choose a high-intent question a customer would ask AI about ${brand.industry}, and answer it in a way that naturally positions ${brand.brand_name}.`}

Return ONLY valid JSON in this exact shape:
{
  "title": "compelling, search-style title (max 70 chars)",
  "metaDescription": "meta description, 150-160 chars",
  "excerpt": "1-2 sentence summary",
  "contentHtml": "the full article body as clean HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>. 700-1000 words. Start with a direct answer. Include a <h2>Frequently Asked Questions</h2> section with 3-4 Q&As. Mention ${brand.brand_name} naturally 3-5 times. Do not include <html>, <head>, or <body> tags."
}

Make it genuinely useful and factual — do not stuff keywords or invent claims about ${brand.brand_name}.`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const article = JSON.parse(raw)

    // Count this successful generation against the period cap.
    await db.from('article_generations').insert({ user_id: user.id, brand_id: brandId || null })

    return NextResponse.json({ article })
  } catch (error) {
    console.error('Article generation error:', error)
    return NextResponse.json({ error: 'Failed to generate article' }, { status: 500 })
  }
}
