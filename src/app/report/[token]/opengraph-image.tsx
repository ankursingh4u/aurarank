import { ImageResponse } from 'next/og'
import { dbAdmin } from '@/lib/pgq'
import { getPublicSiteUrl } from '@/lib/site'

export const alt = 'AI Visibility Report, SEO4AI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Shown on the card footer; derived from the configured app URL so the card never
// advertises a stale domain.
const displayDomain = getPublicSiteUrl().replace(/^https?:\/\//, '')

// Dynamic social-share card: every report link renders a branded score card
// on Twitter/LinkedIn/WhatsApp/Slack, turning shares into free distribution.
export default async function Image({ params }: { params: { token: string } }) {
  const fallback = (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#020617', color: '#fff',
      }}
    >
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 700 }}>SEO4AI</div>
      <div style={{ display: 'flex', fontSize: 30, color: '#94a3b8', marginTop: 12 }}>
        Is AI recommending your brand?
      </div>
    </div>
  )

  try {
    const scanId = Buffer.from(params.token, 'base64url').toString('utf-8')
    if (!scanId) return new ImageResponse(fallback, size)

    const supabase = dbAdmin()

    const { data: scan } = await supabase
      .from('scans')
      .select('visibility_score, mention_count, brand_id')
      .eq('id', scanId)
      .eq('status', 'completed')
      .single()
    if (!scan) return new ImageResponse(fallback, size)

    const { data: brand } = await supabase
      .from('brands')
      .select('brand_name, industry')
      .eq('id', scan.brand_id)
      .single()

    const { count: totalPrompts } = await supabase
      .from('prompt_results')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', scanId)

    const { data: competitors } = await supabase
      .from('competitor_analysis')
      .select('competitor_name, mention_count')
      .eq('scan_id', scanId)
      .order('mention_count', { ascending: false })
      .limit(1)

    const score = scan.visibility_score ?? 0
    const total = totalPrompts || 0
    const brandName = brand?.brand_name || 'Your brand'
    const industry = brand?.industry || ''
    const topComp = competitors?.[0]

    const color = score >= 60 ? '#34d399' : score >= 30 ? '#fbbf24' : '#f87171'
    const label = score >= 60 ? 'Strong AI Visibility' : score >= 30 ? 'Moderate AI Visibility' : 'Low AI Visibility'
    const headline =
      scan.mention_count === 0 && total > 0
        ? `Not mentioned in any of ${total} AI answers`
        : total > 0
        ? `Mentioned in ${scan.mention_count} of ${total} AI answers`
        : 'AI Visibility Report'

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: '#020617', color: '#fff', padding: 64, justifyContent: 'space-between',
          }}
        >
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: '#a5b4fc' }}>SEO4AI</div>
            <div style={{ display: 'flex', fontSize: 24, color: '#64748b' }}>AI Visibility Report</div>
          </div>

          {/* body */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 660 }}>
              <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{brandName}</div>
              {industry ? (
                <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8', marginTop: 8 }}>{industry}</div>
              ) : null}
              <div style={{ display: 'flex', fontSize: 32, color: '#e2e8f0', marginTop: 28 }}>{headline}</div>
              {topComp && topComp.mention_count > scan.mention_count ? (
                <div style={{ display: 'flex', fontSize: 26, color: '#f87171', marginTop: 14 }}>
                  {topComp.competitor_name} appears {topComp.mention_count - scan.mention_count}× more
                </div>
              ) : null}
            </div>

            {/* score ring */}
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                width: 280, height: 280, borderRadius: 280, border: `14px solid ${color}`,
              }}
            >
              <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color }}>{score}</div>
              <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>/ 100</div>
            </div>
          </div>

          {/* footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color }}>{label}</div>
            <div style={{ display: 'flex', fontSize: 24, color: '#64748b' }}>{displayDomain}</div>
          </div>
        </div>
      ),
      size,
    )
  } catch {
    return new ImageResponse(fallback, size)
  }
}
