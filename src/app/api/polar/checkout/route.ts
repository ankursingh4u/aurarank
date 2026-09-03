import { createClient } from '@/lib/supabase/server'
import { userDb } from '@/lib/pgq'
import { getPolar, getProductId, getUnlockProductId } from '@/lib/payment'
import { getAppUrl } from '@/lib/site'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Creates a Polar checkout for either:
 *   { plan: 'pro' | 'max' }   a recurring subscription, or
 *   { unlockScanId: uuid }    a one-time $9 unlock of one scan's citation map.
 *
 * The scan id is carried in checkout metadata and read back on order.paid, so
 * the webhook can tell which report was bought. It is validated here against the
 * caller's own rows first: without that, a checkout could be opened for someone
 * else's scan id and the webhook would unlock a report the payer cannot see.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan, unlockScanId } = await request.json()

    if (unlockScanId) {
      const db = userDb(user.id)

      // RLS scopes this to the caller, so a scan id they do not own reads as absent.
      const { data: scan } = await db
        .from('scans')
        .select('id')
        .eq('id', unlockScanId)
        .single()
      if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

      // Charging twice for the same report is the one outcome guaranteed to
      // produce a refund request, so it is blocked before the checkout opens.
      const { data: existing, error: unlockErr } = await db
        .from('report_unlocks')
        .select('id')
        .eq('scan_id', unlockScanId)
        .single()

      // 42P01 is "relation does not exist": migration 012 has not been applied on
      // this environment. Fail closed. If the table is missing here it is missing
      // for the webhook too, so a purchase would take the money and grant nothing.
      if (unlockErr?.code === '42P01') {
        console.error('report_unlocks table missing — refusing to sell an unlock. Run scripts/migrate.mjs.')
        return NextResponse.json(
          { error: 'Report unlocks are not available yet. Please try again shortly.' },
          { status: 503 }
        )
      }

      if (existing) {
        return NextResponse.json({ error: 'This report is already unlocked', alreadyUnlocked: true }, { status: 409 })
      }

      const productId = getUnlockProductId()
      if (!productId) {
        return NextResponse.json(
          { error: 'Polar unlock product not configured. Set POLAR_SANDBOX_/POLAR_PRODUCTION_UNLOCK_PRODUCT_ID.' },
          { status: 500 }
        )
      }

      const appUrl = getAppUrl()
      const checkout = await getPolar().checkouts.create({
        products: [productId],
        successUrl: `${appUrl}/dashboard?unlocked=${unlockScanId}&checkout_id={CHECKOUT_ID}`,
        customerEmail: user.email!,
        externalCustomerId: user.id,
        metadata: { user_id: user.id, scan_id: unlockScanId, kind: 'report_unlock' },
      })

      return NextResponse.json({ checkoutUrl: checkout.url })
    }

    if (!plan || !['pro', 'max'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const productId = getProductId(plan as 'pro' | 'max')
    if (!productId) {
      return NextResponse.json({ error: 'Polar product not configured for the current POLAR_SERVER mode. Set the matching POLAR_SANDBOX_/POLAR_PRODUCTION_ product IDs.' }, { status: 500 })
    }

    const appUrl = getAppUrl()

    const checkout = await getPolar().checkouts.create({
      products: [productId],
      successUrl: `${appUrl}/dashboard/billing?success=true&checkout_id={CHECKOUT_ID}`,
      customerEmail: user.email!,
      // Tie the Polar customer to our Supabase user so the portal + webhooks
      // can resolve the user without storing a Polar customer id first.
      externalCustomerId: user.id,
      metadata: { user_id: user.id, plan },
    })

    return NextResponse.json({ checkoutUrl: checkout.url })
  } catch (error) {
    console.error('Polar checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
