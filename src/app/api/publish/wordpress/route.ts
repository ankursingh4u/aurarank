import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

// Start of the user's current publish window: the billing period start when we
// have it, otherwise a rolling 30 days. The quota counts publishes since this.
function periodStartFor(userPlan: { current_period_start?: string | null } | null): Date {
  if (userPlan?.current_period_start) return new Date(userPlan.current_period_start)
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d
}

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Publish an article to the user's OWN WordPress site via the WordPress REST API
 * using an Application Password. This costs us nothing — it hits the user's site,
 * not any paid AI API. We never store the credentials; they're used once to post.
 *
 * The user creates an Application Password at:
 *   WordPress admin → Users → Profile → Application Passwords
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
      return NextResponse.json({ error: 'Upgrade to Pro or Max to publish to WordPress.' }, { status: 403 })
    }

    const { siteUrl, username, appPassword, title, contentHtml, excerpt, status, brandId } = await request.json()

    if (!siteUrl || !username || !appPassword || !title || !contentHtml) {
      return NextResponse.json({ error: 'siteUrl, username, appPassword, title and content are required' }, { status: 400 })
    }

    const postStatus = status === 'publish' ? 'publish' : 'draft'

    // The quota applies to LIVE publishes only — saving a draft to your own
    // site never consumes a credit and stays available even at the limit.
    if (postStatus === 'publish') {
      const periodStart = periodStartFor(userPlan)
      const { count: usedCount } = await db
        .from('wordpress_publishes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'publish')
        .gte('published_at', periodStart.toISOString())

      if ((usedCount || 0) >= publishLimit) {
        const resetMsg = userPlan?.current_period_end
          ? ` It resets on ${new Date(userPlan.current_period_end).toLocaleDateString()}.`
          : ''
        return NextResponse.json(
          { error: `You've used all ${publishLimit} of your live WordPress publishes for this period.${resetMsg} You can still save drafts.` },
          { status: 403 }
        )
      }
    }

    // Normalize the site URL → https, no trailing slash.
    let base = String(siteUrl).trim().replace(/\/+$/, '')
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`
    base = base.replace(/^http:\/\//i, 'https://')

    const endpoint = `${base}/wp-json/wp/v2/posts`
    // Application passwords are sent as Basic auth. WP allows spaces in the
    // generated password; strip them as WP itself does.
    const token = Buffer.from(`${username}:${String(appPassword).replace(/\s+/g, '')}`).toString('base64')

    let wpRes: Response
    try {
      wpRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: contentHtml,
          excerpt: excerpt || '',
          status: postStatus,
        }),
      })
    } catch {
      return NextResponse.json(
        { error: `Could not reach ${base}. Check the site URL and that the WordPress REST API is enabled.` },
        { status: 502 }
      )
    }

    if (!wpRes.ok) {
      let detail = ''
      try {
        const err = await wpRes.json()
        detail = err?.message || ''
      } catch { /* non-JSON error body */ }
      if (wpRes.status === 401 || wpRes.status === 403) {
        return NextResponse.json(
          { error: 'WordPress rejected the login. Check the username and Application Password (not your normal password).' },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: detail || `WordPress returned an error (${wpRes.status}).` },
        { status: 502 }
      )
    }

    const post = await wpRes.json()

    // Record the successful publish so it counts against the quota.
    await db.from('wordpress_publishes').insert({
      user_id: user.id,
      brand_id: brandId || null,
      wordpress_post_id: post.id ?? null,
      title,
      link: post.link ?? null,
      status: post.status ?? postStatus,
    })

    return NextResponse.json({
      id: post.id,
      link: post.link,
      status: post.status,
    })
  } catch (error) {
    console.error('WordPress publish error:', error)
    return NextResponse.json({ error: 'Failed to publish to WordPress' }, { status: 500 })
  }
}
