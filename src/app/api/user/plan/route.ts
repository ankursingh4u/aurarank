import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'
import { PLANS } from '@/lib/payment'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    // Try to get user plan, default to starter
    const { data: userPlan } = await db
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const plan = (userPlan?.plan as keyof typeof PLANS) || 'starter'
    const planConfig = PLANS[plan] || PLANS.starter

    // Count scans this month for THIS USER's brands only
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: userBrands } = await db
      .from('brands')
      .select('id')

    const brandIds = (userBrands || []).map((b: { id: string }) => b.id)

    // Count by user_id — not affected by brand deletion
    const { count } = await db
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
    const scanCount = count || 0

    // Publish quota resets on the billing period (fallback: rolling 30 days).
    const periodStart = (userPlan as { current_period_start?: string | null } | null)?.current_period_start
      ? new Date((userPlan as { current_period_start: string }).current_period_start)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })()

    const { count: publishCount } = await db
      .from('wordpress_publishes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'publish')
      .gte('published_at', periodStart.toISOString())
    const publishesUsed = publishCount || 0
    const publishLimit = planConfig.publishLimit ?? 0

    const { count: genCount } = await db
      .from('article_generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', periodStart.toISOString())
    const generationsUsed = genCount || 0
    const generationLimit = planConfig.generationLimit ?? 0

    return NextResponse.json({
      plan,
      status: userPlan?.status || 'active',
      ...planConfig,
      brandsUsed: brandIds.length,
      scansUsed: scanCount,
      scansRemaining: Math.max(0, planConfig.scanLimit - scanCount),
      canScan: scanCount < planConfig.scanLimit,
      canAddBrand: brandIds.length < planConfig.brandLimit,
      canViewCompetitors: plan !== 'starter',
      // Pro answers "why am I not there, and what do I do about it": the
      // citation map plus the fix plan. Max is the done-for-you layer on top
      // (boost content, outreach drafts, publishing), gated separately.
      canViewFixPlan: plan === 'pro' || plan === 'max',
      publishLimit,
      publishesUsed,
      publishesRemaining: Math.max(0, publishLimit - publishesUsed),
      canPublish: publishLimit > 0 && publishesUsed < publishLimit,
      publishResetsAt: (userPlan as { current_period_end?: string | null } | null)?.current_period_end || null,
      generationLimit,
      generationsUsed,
      generationsRemaining: Math.max(0, generationLimit - generationsUsed),
      canGenerate: generationLimit > 0 && generationsUsed < generationLimit,
    })
  } catch {
    return NextResponse.json({
      plan: 'starter',
      status: 'active',
      ...PLANS.starter,
      brandsUsed: 0,
      scansUsed: 0,
      scansRemaining: 1,
      canScan: true,
      canAddBrand: true,
      canViewCompetitors: false,
      canViewFixPlan: false,
      publishLimit: 0,
      publishesUsed: 0,
      publishesRemaining: 0,
      canPublish: false,
      publishResetsAt: null,
      generationLimit: 0,
      generationsUsed: 0,
      generationsRemaining: 0,
      canGenerate: false,
    })
  }
}
