import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withUser } from '@/lib/db'
import { dbFor } from '@/lib/pgq'

export const dynamic = 'force-dynamic'

// Static industry benchmarks (avg score, top-10% threshold)
// Updated as real data accumulates — currently based on typical AI visibility ranges
function getIndustryBenchmark(industry: string): { avg: number; top10: number } {
  const lower = industry.toLowerCase()
  if (/restaurant|food|dining|cafe|bakery|catering/.test(lower)) return { avg: 42, top10: 74 }
  if (/hotel|travel|hospitality|resort|lodging/.test(lower)) return { avg: 38, top10: 70 }
  if (/saas|software|tech|devtools|analytics|cybersecurity|ai|platform|cloud|api/.test(lower)) return { avg: 35, top10: 72 }
  if (/retail|e-commerce|ecommerce|shop/.test(lower)) return { avg: 40, top10: 73 }
  if (/health|fitness|wellness|medical/.test(lower)) return { avg: 30, top10: 65 }
  return { avg: 33, top10: 68 }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const brandId = request.nextUrl.searchParams.get('brandId')

    return await withUser(user.id, async (client) => {
    const supabase = dbFor(client)

    // Get user's brands
    const { data: brands } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })

    if (!brands || brands.length === 0) {
      return NextResponse.json({ brands: [], hasNoBrands: true })
    }

    const selectedBrandId = brandId || brands[0].id
    const selectedBrand = brands.find((b: { id: string }) => b.id === selectedBrandId) || brands[0]

    // Get latest scan
    const { data: latestScan } = await supabase
      .from('scans')
      .select('*')
      .eq('brand_id', selectedBrand.id)
      .eq('status', 'completed')
      .order('scan_date', { ascending: false })
      .limit(1)
      .single()

    // Get scan history for chart (last 10)
    const { data: scanHistory } = await supabase
      .from('scans')
      .select('scan_date, visibility_score, mention_count, competitor_mention_count')
      .eq('brand_id', selectedBrand.id)
      .eq('status', 'completed')
      .order('scan_date', { ascending: true })
      .limit(10)

    let competitorAnalysis = null
    let promptOpportunities = null
    let recommendations = null
    // Null until a grounded scan has run: a parametric scan retrieves no pages,
    // so there is nothing to grade and a zeroed split would read as "all locked".
    let winnabilitySplit: { winnable: number; hard: number; locked: number } | null = null
    let totalPrompts = 0
    const competitorAlerts: string[] = []

    if (latestScan) {
      // Competitor movement vs the previous completed scan
      const { data: prevScan } = await supabase
        .from('scans')
        .select('id')
        .eq('brand_id', selectedBrand.id)
        .eq('status', 'completed')
        .neq('id', latestScan.id)
        .order('scan_date', { ascending: false })
        .limit(1)
        .single()

      if (prevScan) {
        const [{ data: nowComp }, { data: prevComp }] = await Promise.all([
          supabase.from('competitor_analysis').select('competitor_name, mention_count').eq('scan_id', latestScan.id),
          supabase.from('competitor_analysis').select('competitor_name, mention_count').eq('scan_id', prevScan.id),
        ])
        const prevMap = new Map<string, number>((prevComp || []).map((c: { competitor_name: string; mention_count: number }) => [c.competitor_name, c.mention_count]))
        for (const c of (nowComp || []) as Array<{ competitor_name: string; mention_count: number }>) {
          const before = prevMap.get(c.competitor_name) ?? 0
          const jump = c.mention_count - before
          if (jump >= 2) {
            competitorAlerts.push(`${c.competitor_name} is now appearing in ${jump} more AI searches than your last scan (${before} → ${c.mention_count}).`)
          }
        }
      }
    }

    if (latestScan) {
      const { count } = await supabase
        .from('prompt_results')
        .select('id', { count: 'exact', head: true })
        .eq('scan_id', latestScan.id)
      totalPrompts = count || 0

      const [compResult, oppResult, recResult] = await Promise.all([
        supabase
          .from('competitor_analysis')
          .select('*')
          .eq('scan_id', latestScan.id)
          .order('mention_count', { ascending: false }),
        supabase
          .from('prompt_opportunities')
          .select('*')
          .eq('scan_id', latestScan.id)
          .order('opportunity_score', { ascending: false })
          .limit(8),
        supabase
          .from('recommendations')
          .select('*')
          .eq('scan_id', latestScan.id)
          .order('impact_score', { ascending: false }),
      ])

      competitorAnalysis = compResult.data
      promptOpportunities = oppResult.data
      recommendations = recResult.data

      // Attach AI responses to opportunities for the Response Viewer
      if (promptOpportunities && promptOpportunities.length > 0) {
        const oppPrompts = promptOpportunities.map((o: { prompt: string }) => o.prompt)
        // The citation columns arrive with add_grounded_scanning.sql. Until that
        // migration runs, selecting them errors and would take the whole dashboard
        // down, so fall back to the columns that have always existed. This keeps
        // deploy order and migration order independent of each other.
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        let promptResultRows: any[] | null = (await supabase
          .from('prompt_results')
          .select('prompt, ai_response, citations, citations_by_engine, winnability, channel')
          .eq('scan_id', latestScan.id)
          .in('prompt', oppPrompts)).data

        if (!promptResultRows) {
          const fallback = await supabase
            .from('prompt_results')
            .select('prompt, ai_response')
            .eq('scan_id', latestScan.id)
            .in('prompt', oppPrompts)
          promptResultRows = fallback.data
        }

        if (promptResultRows) {
          const rowMap = new Map(promptResultRows.map((r) => [r.prompt, r]))
          promptOpportunities = promptOpportunities.map((opp: { prompt: string }) => {
            const row = rowMap.get(opp.prompt)
            return {
              ...opp,
              ai_response: row?.ai_response || null,
              // The citation map: the pages the AI actually read to answer this
              // question. This is the fix list, not decoration.
              citations: row?.citations || [],
              citations_by_engine: row?.citations_by_engine || {},
              winnability: row?.winnability || null,
              channel: row?.channel || 'parametric',
            }
          })
        }
      }

      // Headline split across every scored question, not just the ones surfaced
      // as opportunities, so the number matches what was actually measured.
      // Same dependency: absent before the migration, so a failure here must
      // leave the split null rather than surfacing as a broken dashboard.
      const { data: allGraded } = await supabase
        .from('prompt_results')
        .select('winnability')
        .eq('scan_id', latestScan.id)
        .not('winnability', 'is', null)

      // Left null on an empty result rather than zeroed: a parametric scan has
      // nothing to grade, and a {0,0,0} split would render as a real measurement.
      if (allGraded && allGraded.length > 0) {
        winnabilitySplit = {
          winnable: allGraded.filter((r: { winnability: string }) => r.winnability === 'winnable').length,
          hard: allGraded.filter((r: { winnability: string }) => r.winnability === 'hard').length,
          locked: allGraded.filter((r: { winnability: string }) => r.winnability === 'locked').length,
        }
      }
    }

    const industryBenchmark = getIndustryBenchmark(selectedBrand.industry || '')

    return NextResponse.json({
      brands,
      selectedBrand,
      latestScan,
      totalPrompts,
      scanHistory: scanHistory || [],
      competitorAnalysis: competitorAnalysis || [],
      promptOpportunities: promptOpportunities || [],
      recommendations: recommendations || [],
      industryBenchmark,
      competitorAlerts,
      winnabilitySplit,
    })
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
