import { createAdminClient } from '@/lib/supabase/admin'
import { dbAdmin, type Db } from '@/lib/pgq'
import { runScan, type ScanRunResult } from '@/lib/scan-runner'
import { sendEmail, weeklyDigestEmail } from '@/lib/email'
import { PLANS, type PlanType } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Scheduled auto-scans + weekly digest.
//
// Triggered once per day. On Coolify that is a scheduled task running
// `node scripts/trigger-cron.mjs`; vercel.json still declares the same schedule
// for the Vercel deployment. Coolify is the live one, so a change to the
// cadence has to be made in both places or only the dead one moves.
//
// The route decides, per brand, whether a scan is due based on the brand's
// auto_scan setting and the owner's plan. Protected by CRON_SECRET — with the
// secret unset every request 401s, which is the failure mode that silently
// disables auto-scans and the weekly digest.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = dbAdmin()
  const now = Date.now()

  // Brands with auto-scan enabled
  const { data: brands, error } = await admin
    .from('brands')
    .select('id, user_id, brand_name, auto_scan, last_auto_scan_at')
    .neq('auto_scan', 'off')

  if (error) {
    console.error('Cron: failed to load brands', error)
    return NextResponse.json({ error: 'Failed to load brands' }, { status: 500 })
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let scanned = 0
  let skipped = 0
  const results: Array<{ brand: string; status: string }> = []

  for (const brand of brands || []) {
    try {
      // Resolve plan and which frequencies it permits
      const { data: userPlan } = await admin
        .from('user_plans')
        .select('plan')
        .eq('user_id', brand.user_id)
        .single()
      const plan = (userPlan?.plan as PlanType) || 'starter'

      // Pro = weekly only; Max = weekly or daily; Starter = no auto-scans
      const allowed = plan === 'max' ? ['weekly', 'daily'] : plan === 'pro' ? ['weekly'] : []
      if (!allowed.includes(brand.auto_scan)) {
        skipped++
        continue
      }

      // Is a scan due?
      const intervalMs = brand.auto_scan === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      const last = brand.last_auto_scan_at ? new Date(brand.last_auto_scan_at).getTime() : 0
      // 1h grace so a daily cron at the same hour still fires
      if (last && now - last < intervalMs - 60 * 60 * 1000) {
        skipped++
        continue
      }

      // Respect monthly quota
      const { count: scanCount } = await admin
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', brand.user_id)
        .gte('created_at', startOfMonth.toISOString())
      if ((scanCount || 0) >= (PLANS[plan]?.scanLimit ?? 0)) {
        results.push({ brand: brand.brand_name, status: 'quota_reached' })
        skipped++
        continue
      }

      // Capture the previous completed scan for digest comparison
      const { data: prevScan } = await admin
        .from('scans')
        .select('id, visibility_score')
        .eq('brand_id', brand.id)
        .eq('status', 'completed')
        .order('scan_date', { ascending: false })
        .limit(1)
        .single()

      // Create + run the scan
      const { data: scan } = await admin
        .from('scans')
        .insert({ brand_id: brand.id, user_id: brand.user_id, status: 'pending' })
        .select()
        .single()
      if (!scan) {
        results.push({ brand: brand.brand_name, status: 'create_failed' })
        continue
      }

      const result = await runScan(admin, scan.id)
      await admin.from('brands').update({ last_auto_scan_at: new Date(now).toISOString() }).eq('id', brand.id)
      scanned++

      // Build + send digest
      // Supabase still owns identity, so the address comes from there.
      const { data: userRes } = await createAdminClient().auth.admin.getUserById(brand.user_id)
      const ownerEmail = userRes?.user?.email
      if (ownerEmail) await sendDigest(admin, ownerEmail, brand, scan.id, prevScan?.id || null, prevScan?.visibility_score ?? null, result)
      results.push({ brand: brand.brand_name, status: 'scanned' })
    } catch (err) {
      console.error(`Cron: scan failed for brand ${brand.id}`, err)
      results.push({ brand: brand.brand_name, status: 'error' })
    }
  }

  return NextResponse.json({ scanned, skipped, total: (brands || []).length, results })
}

async function sendDigest(
  admin: Db,
  email: string,
  brand: { id: string; user_id: string; brand_name: string },
  newScanId: string,
  prevScanId: string | null,
  prevScore: number | null,
  result: ScanRunResult
) {

  // Competitor movement vs previous scan
  const competitorAlerts: string[] = []
  if (prevScanId) {
    const [{ data: nowComp }, { data: prevComp }] = await Promise.all([
      admin.from('competitor_analysis').select('competitor_name, mention_count').eq('scan_id', newScanId),
      admin.from('competitor_analysis').select('competitor_name, mention_count').eq('scan_id', prevScanId),
    ])
    const prevMap = new Map<string, number>(
      (prevComp || []).map((c: { competitor_name: string; mention_count: number }) => [c.competitor_name, c.mention_count])
    )
    for (const c of (nowComp || []) as Array<{ competitor_name: string; mention_count: number }>) {
      const before = prevMap.get(c.competitor_name) ?? 0
      const jump = c.mention_count - before
      if (jump >= 2) {
        competitorAlerts.push(
          `${c.competitor_name} is now appearing in ${jump} more AI searches than last scan (${before} → ${c.mention_count}).`
        )
      }
    }
  }

  // Top actions from this scan's biggest opportunities
  const { data: opps } = await admin
    .from('prompt_opportunities')
    .select('prompt, competitors_found')
    .eq('scan_id', newScanId)
    .order('opportunity_score', { ascending: false })
    .limit(3)
  const topActions = (opps || []).map(
    (o: { prompt: string; competitors_found: string[] | null }) => `Create content targeting "${o.prompt}" — competitors here: ${(o.competitors_found || []).join(', ') || 'several'}.`
  )

  const digest = weeklyDigestEmail({
    brandName: brand.brand_name,
    score: result.visibilityScore,
    prevScore,
    mentions: result.mentionCount,
    opportunities: result.opportunitiesFound,
    competitorAlerts,
    topActions,
  })
  await sendEmail({ to: email, subject: digest.subject, html: digest.html })
}
