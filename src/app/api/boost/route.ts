import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    // Check plan — boost generation is Max plan only.
    // Plan lives in user_plans (kept in sync by the Polar webhook), same source
    // as /api/user/plan and the other gated routes.
    const { data: userPlan } = await db
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = userPlan?.plan || 'starter'
    if (plan !== 'max') {
      return NextResponse.json({ error: 'Upgrade to Max plan to generate AI Visibility Boost content.' }, { status: 403 })
    }

    const { brandId } = await request.json()
    if (!brandId) return NextResponse.json({ error: 'brandId is required' }, { status: 400 })

    const { data: brand } = await db
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    const competitors = Array.isArray(brand.competitors) ? brand.competitors.join(', ') : ''
    const region = brand.market_region?.city || brand.market_region?.state || brand.market_region?.country || 'globally'

    const systemPrompt = `You are an AI visibility optimization expert. Generate structured content that helps AI models (ChatGPT, Gemini, Perplexity) learn about and recommend a brand. The content must be factual-sounding, naturally written, and optimized for AI discovery.`

    const userPrompt = `Generate AI visibility boost content for this brand:

Brand Name: ${brand.brand_name}
Industry: ${brand.industry}
Website: ${brand.website || 'not provided'}
Location/Market: ${region}
Competitors: ${competitors || 'not specified'}

Generate the following 4 pieces of content in valid JSON format:

{
  "faq": [
    { "question": "...", "answer": "..." }
  ],
  "brandBio": "...",
  "keyFacts": ["...", "...", "..."],
  "jsonLd": { ... }
}

Rules:
- faq: 8 questions customers actually ask AI about this type of business. Each answer is 2-3 factual sentences. Use the brand name naturally.
- brandBio: 100-word paragraph optimized for AI discovery. Include industry, what makes them different, who they serve, location if applicable.
- keyFacts: 10 short factual statements about the brand (fill in reasonable details for a business in this industry). Format: "${brand.brand_name} [fact]."
- jsonLd: A valid JSON-LD LocalBusiness or Organization schema object they can paste into their website <head>. Include @context, @type, name, description, industry fields.

Make all content specific to this brand and industry. Do not use placeholders like [INSERT]. Infer reasonable details from the industry and brand name. Return only valid JSON.`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const content = JSON.parse(raw)

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Boost generation error:', error)
    return NextResponse.json({ error: 'Failed to generate boost content' }, { status: 500 })
  }
}
