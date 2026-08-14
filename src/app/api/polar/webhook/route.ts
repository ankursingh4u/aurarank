import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/pgq'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'
import { getPlanByPolarProductId, getPolarWebhookSecret } from '@/lib/payment'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return dbAdmin()
}

// Resolve our Supabase user id from a subscription: prefer metadata we set at
// checkout, fall back to the external customer id we attached to the customer.
function resolveUserId(sub: Subscription): string | null {
  const fromMeta = sub.metadata?.user_id
  if (typeof fromMeta === 'string' && fromMeta) return fromMeta
  return sub.customer?.externalId || null
}

type PlanStatus = 'active' | 'inactive' | 'past_due'

function mapStatus(status: string): PlanStatus {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due') return 'past_due'
  return 'inactive'
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headers = Object.fromEntries(request.headers.entries())
  const webhookSecret = getPolarWebhookSecret()

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event
  try {
    event = validateEvent(body, headers, webhookSecret)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = getServiceClient()

  switch (event.type) {
    // Subscription started / renewed / changed — sync plan + status.
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.uncanceled':
    case 'subscription.canceled': {
      const sub = event.data
      const userId = resolveUserId(sub)
      const plan = getPlanByPolarProductId(sub.productId)

      if (userId) {
        // Only write columns the app actually relies on (plan + status). The
        // portal resolves customers by externalCustomerId and gating reads
        // plan/status, so polar_customer_id / polar_subscription_id are not
        // required for billing to function — kept out so this works whether or
        // not the add_polar_billing.sql migration has run.
        await supabase.from('user_plans').upsert({
          user_id: userId,
          plan,
          status: mapStatus(sub.status),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // Anchor the publish quota to the billing period. On renewal Polar moves
        // currentPeriodStart forward, which resets the publish count for free.
        // Done as a separate, best-effort update so it's a no-op if the
        // add_wordpress_publishes.sql migration hasn't added these columns yet
        // (mirrors why polar_customer_id is kept out of the upsert above).
        const periodStart = sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toISOString() : null
        const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null
        if (periodStart || periodEnd) {
          await supabase.from('user_plans')
            .update({ current_period_start: periodStart, current_period_end: periodEnd })
            .eq('user_id', userId)
        }
      }
      break
    }

    // Access actually revoked (expired or fully canceled) — drop to starter.
    case 'subscription.revoked': {
      const sub = event.data
      const userId = resolveUserId(sub)

      if (userId) {
        await supabase.from('user_plans').update({
          plan: 'starter',
          status: 'inactive',
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
