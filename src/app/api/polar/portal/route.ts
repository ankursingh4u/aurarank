import { createClient } from '@/lib/supabase/server'
import { getPolar } from '@/lib/payment'
import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const appUrl = getAppUrl()

    // We pass externalCustomerId = our Supabase user id at checkout, so we can
    // open the portal by that same id without persisting a Polar customer id.
    const session = await getPolar().customerSessions.create({
      externalCustomerId: user.id,
      returnUrl: `${appUrl}/dashboard/billing`,
    })

    return NextResponse.json({ portalUrl: session.customerPortalUrl })
  } catch (error) {
    console.error('Polar portal error:', error)
    // Most common cause: the user has never checked out, so no Polar customer
    // exists for their external id yet.
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }
}
