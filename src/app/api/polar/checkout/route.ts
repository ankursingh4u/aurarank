import { createClient } from '@/lib/supabase/server'
import { getPolar, getProductId } from '@/lib/payment'
import { getAppUrl } from '@/lib/site'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await request.json()
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
