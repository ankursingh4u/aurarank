import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const scanId = request.nextUrl.searchParams.get('scanId')
    if (!scanId) return NextResponse.json({ error: 'scanId is required' }, { status: 400 })

    const { data, error } = await db
      .from('recommendations')
      .select('*')
      .eq('scan_id', scanId)
      .order('impact_score', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    // AI Fix Plan is a Max-only feature — enforce server-side, not just in UI.
    const { data: userPlan } = await db
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    if ((userPlan?.plan || 'starter') !== 'max') {
      return NextResponse.json({ error: 'Upgrade to Max plan to generate an AI Fix Plan.' }, { status: 403 })
    }

    const { scanId } = await request.json()
    if (!scanId) return NextResponse.json({ error: 'scanId is required' }, { status: 400 })

    // Get scan data
    const { data: scan } = await db
      .from('scans')
      .select('*, brands!inner(brand_name, industry, competitors, website)')
      .eq('id', scanId)
      .single()

    if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

    const brand = scan.brands as unknown as {
      brand_name: string
      industry: string
      competitors: string[]
      website: string | null
    }

    // Get analysis data
    const [promptResults, competitorAnalysis, promptOpportunities] = await Promise.all([
      db.from('prompt_results').select('*').eq('scan_id', scanId),
      db.from('competitor_analysis').select('*').eq('scan_id', scanId),
      db.from('prompt_opportunities').select('*').eq('scan_id', scanId),
    ])

    const mentionedCount = (promptResults.data || []).filter((r: { brand_mentioned: boolean }) => r.brand_mentioned).length
    const totalPrompts = (promptResults.data || []).length
    const topCompetitors = (competitorAnalysis.data || [])
      .sort((a: { mention_count: number }, b: { mention_count: number }) => b.mention_count - a.mention_count)
      .slice(0, 3)
      .map((c: { competitor_name: string; mention_count: number }) => `${c.competitor_name}: ${c.mention_count} mentions`)
      .join('\n')

    const missingPrompts = (promptOpportunities.data || [])
      .slice(0, 5)
      .map((o: { prompt: string; competitors_found: string[] }) => `- ${o.prompt} (competitors found: ${o.competitors_found.join(', ')})`)
      .join('\n')

    const aiPrompt = `You are an AI SEO consultant specializing in AI visibility optimization.

Brand: ${brand.brand_name}
Website: ${brand.website || 'Not provided'}
Industry: ${brand.industry}
Competitors: ${brand.competitors.join(', ')}

Scan Results:
- Brand was mentioned in ${mentionedCount} out of ${totalPrompts} AI prompts
- Visibility Score: ${scan.visibility_score}/100

Top Competitor Mentions:
${topCompetitors}

Prompts where brand is MISSING but competitors appear:
${missingPrompts}

Generate exactly 7 specific, actionable recommendations to improve this brand's AI visibility. For each recommendation, provide:
1. A clear task title (max 80 chars)
2. A detailed description of what to do and why (2-3 sentences)
3. Category: one of "content", "technical", "authority", "optimization"
4. Priority: "high", "medium", or "low"
5. Impact score: 1-100
6. Difficulty: "easy", "medium", or "hard"

Format each recommendation as JSON objects in an array. Return ONLY the JSON array, no other text.
Example format:
[{"title":"...","description":"...","category":"content","priority":"high","impact_score":85,"difficulty":"medium"}]`

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: aiPrompt }],
      max_tokens: 2000,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || '[]'

    let recommendations: Array<{
      title: string
      description: string
      category: string
      priority: string
      impact_score: number
      difficulty: string
    }>

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      recommendations = JSON.parse(jsonMatch ? jsonMatch[0] : responseText)
    } catch {
      recommendations = [{
        title: 'Create industry-focused content',
        description: `Publish articles and guides about ${brand.industry} to improve AI model awareness of your brand.`,
        category: 'content',
        priority: 'high',
        impact_score: 80,
        difficulty: 'medium',
      }]
    }

    // Preserve completion state across regenerations: a user who marked
    // "Add FAQ content" done should not see it reset when recs regenerate.
    const { data: existingRecs } = await db
      .from('recommendations')
      .select('task_title, completed')
      .eq('scan_id', scanId)
    const completedTitles = new Set(
      (existingRecs || [])
        .filter((r: { completed: boolean }) => r.completed)
        .map((r: { task_title: string | null }) => (r.task_title || '').toLowerCase().trim())
    )

    // Delete existing recommendations for this scan
    await db.from('recommendations').delete().eq('scan_id', scanId)

    // Insert new recommendations
    const validCategories = ['content', 'technical', 'authority', 'optimization']
    const validPriorities = ['high', 'medium', 'low']
    const validDifficulties = ['easy', 'medium', 'hard']

    const recommendationData = recommendations.map(rec => ({
      scan_id: scanId,
      task_title: rec.title.substring(0, 200),
      task_description: rec.description,
      category: validCategories.includes(rec.category) ? rec.category : 'content',
      priority: validPriorities.includes(rec.priority) ? rec.priority : 'medium',
      impact_score: Math.max(0, Math.min(100, rec.impact_score || 50)),
      difficulty: validDifficulties.includes(rec.difficulty) ? rec.difficulty : 'medium',
      completed: completedTitles.has(rec.title.substring(0, 200).toLowerCase().trim()),
    }))

    const { data, error } = await db
      .from('recommendations')
      .insert(recommendationData)
      .select()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to generate recommendations:', error)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { id, completed } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data, error } = await db
      .from('recommendations')
      .update({ completed })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 })
  }
}
