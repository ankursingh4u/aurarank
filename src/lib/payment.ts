import { Polar } from '@polar-sh/sdk'

// ── Billing mode switch ──────────────────────────────────────────────
// Flip ONE env var to switch test ↔ real billing:
//   BILLING_TEST_MODE=true   → TEST  (sandbox, card 4242…, no real charges)
//   BILLING_TEST_MODE=false  → REAL  (production, real money)
// Safe default is TEST when the var is unset/unrecognized, so you can never
// accidentally charge a real card. Each mode reads its own credentials:
//   test → POLAR_SANDBOX_*      |   real → POLAR_PRODUCTION_*
// (falls back to legacy POLAR_SERVER / generic POLAR_* if those aren't set.)
export type PolarMode = 'sandbox' | 'production'

export function isBillingTestMode(): boolean {
  if (process.env.BILLING_TEST_MODE !== undefined) {
    return process.env.BILLING_TEST_MODE.toLowerCase() !== 'false'
  }
  // legacy fallback
  return process.env.POLAR_SERVER !== 'production'
}

export function getPolarMode(): PolarMode {
  return isBillingTestMode() ? 'sandbox' : 'production'
}

function modeEnv(name: string): string {
  const prefix = getPolarMode() === 'sandbox' ? 'POLAR_SANDBOX_' : 'POLAR_PRODUCTION_'
  return process.env[`${prefix}${name}`] || process.env[`POLAR_${name}`] || ''
}

export function getPolarAccessToken() {
  return modeEnv('ACCESS_TOKEN')
}

export function getPolarWebhookSecret() {
  return modeEnv('WEBHOOK_SECRET')
}

export function getProductId(plan: 'pro' | 'max'): string {
  return modeEnv(plan === 'pro' ? 'PRO_PRODUCT_ID' : 'MAX_PRODUCT_ID')
}

/**
 * The one-time "Report Unlock" product. Not a plan: buying it unlocks the
 * citation map on a single scan and grants nothing else, so it is deliberately
 * kept out of PLANS and out of getPlanByPolarProductId.
 */
export function getUnlockProductId(): string {
  return modeEnv('UNLOCK_PRODUCT_ID')
}

/** Display price of one report unlock, in whole dollars. Must match Polar. */
export const REPORT_UNLOCK_PRICE = 9

let _polar: Polar | null = null

export function getPolar() {
  if (!_polar) {
    _polar = new Polar({
      accessToken: getPolarAccessToken(),
      server: getPolarMode(),
    })
  }
  return _polar
}

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    scanLimit: 3,
    brandLimit: 1,
    publishLimit: 0,
    generationLimit: 0,
    features: ['3 scans/month', 'AI Visibility Score', 'Missed searches', 'Region targeting'],
    lockedFeatures: ['Competitor scores', 'AI Fix Plan', 'Boost content', 'Publishing'],
  },
  pro: {
    name: 'Pro',
    price: 24.99,
    scanLimit: 15,
    brandLimit: 3,
    publishLimit: 1,
    generationLimit: 5,
    features: ['15 scans/month', '3 brands', 'ChatGPT + Gemini', 'Competitor gap scores', 'Progress history', '1 WordPress publish/month', 'Region targeting'],
    lockedFeatures: ['AI Fix Plan', 'Boost content'],
  },
  max: {
    name: 'Max',
    price: 49.99,
    scanLimit: 60,
    brandLimit: 10,
    publishLimit: 3,
    generationLimit: 20,
    // Engines listed here must match what a scan actually runs. Claude is not
    // listed because ANTHROPIC_API_KEY is not configured, so it would silently
    // skip at scan time (see getAvailableEngines in lib/engines.ts). Add it back
    // to this string at the same time as the key, not before.
    features: ['60 scans/month', '10 brands', 'ChatGPT + Gemini', 'AI Fix Plan', 'Boost + outreach', '3 WordPress publishes/month', 'Priority support'],
    lockedFeatures: [],
  },
} as const

export type PlanType = keyof typeof PLANS

export function getPlanByPolarProductId(productId: string | null | undefined): PlanType {
  if (!productId) return 'starter'
  if (productId === getProductId('pro')) return 'pro'
  if (productId === getProductId('max')) return 'max'
  return 'starter'
}
