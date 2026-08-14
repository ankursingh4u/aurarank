import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { data: scan, error: scanError } = await db
      .from('scans')
      .select('*, brands!inner(brand_name, industry, competitors, market_region, user_id)')
      .eq('id', id)
      .single()

    if (scanError || !scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

    const brand = scan.brands as Record<string, unknown>

    const [promptResults, competitorAnalysis, promptOpportunities, recommendations] = await Promise.all([
      db.from('prompt_results').select('*').eq('scan_id', id).order('created_at'),
      db.from('competitor_analysis').select('*').eq('scan_id', id).order('mention_count', { ascending: false }),
      db.from('prompt_opportunities').select('*').eq('scan_id', id).order('opportunity_score', { ascending: false }),
      db.from('recommendations').select('*').eq('scan_id', id).order('impact_score', { ascending: false }),
    ])

    return NextResponse.json({
      scan,
      brand: {
        brand_name: brand.brand_name,
        industry: brand.industry,
        competitors: brand.competitors,
        market_region: brand.market_region,
      },
      promptResults: promptResults.data || [],
      competitorAnalysis: competitorAnalysis.data || [],
      promptOpportunities: promptOpportunities.data || [],
      recommendations: recommendations.data || [],
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scan details' }, { status: 500 })
  }
}
