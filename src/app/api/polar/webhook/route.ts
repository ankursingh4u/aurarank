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
    // past_due is included because the Polar endpoint subscribes to it and a
    // failed renewal must reach user_plans; mapStatus already handles it.
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.past_due':
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

    // One-time purchase settled. This is the only event that grants a report
    // unlock: subscription events never do, and checkout.updated fires before
    // money has actually moved.
    case 'order.paid': {
      const order = event.data
      const meta = (order.metadata || {}) as Record<string, unknown>
      const kind = typeof meta.kind === 'string' ? meta.kind : null
      const scanId = typeof meta.scan_id === 'string' ? meta.scan_id : null
      const userId = typeof meta.user_id === 'string' && meta.user_id
        ? meta.user_id
        : order.customer?.externalId || null

      // Orders for the subscription products also arrive here. Only act on the
      // unlock ones, identified by the metadata the checkout route set.
      if (kind !== 'report_unlock' || !scanId || !userId) break

      // onConflict on scan_id makes a duplicate delivery a no-op rather than a
      // second row; Polar retries webhooks, so this will happen.
      const { error: unlockError } = await supabase.from('report_unlocks').upsert({
        user_id: userId,
        scan_id: scanId,
        polar_order_id: order.id,
        amount_cents: order.totalAmount ?? null,
        currency: order.currency ?? null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'scan_id' })

      // A failure here means somebody paid and did not get what they bought.
      // Return non-2xx so Polar retries the delivery, and log the order id so the
      // unlock can be granted by hand if the retries also fail.
      if (unlockError) {
        console.error(
          `report_unlock FAILED to record. order=${order.id} scan=${scanId} user=${userId} ` +
            `code=${unlockError.code ?? '?'} message=${unlockError.message}`
        )
        return NextResponse.json({ error: 'Failed to record unlock' }, { status: 500 })
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
