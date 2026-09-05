/**
 * Grant a plan to an account directly, without a payment.
 *
 * For the owner's own account: demos, screenshots, and checking what a paying
 * customer sees. Real customers get their plan from the Polar webhook, and this
 * writes the same two columns that webhook writes, so the app cannot tell the
 * difference and nothing special-cases it.
 *
 * A later Polar event for the same user overwrites this, which is correct.
 *
 * Usage: USER_ID=<uuid> PLAN=max node scripts/grant-plan.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const ROOT = process.cwd()
const envPath = path.join(ROOT, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const url = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL
const userId = process.env.USER_ID
const plan = (process.env.PLAN || 'max').toLowerCase()

if (!url) { console.error('no database url'); process.exit(1) }
if (!userId) { console.error('USER_ID is required'); process.exit(1) }
if (!['starter', 'pro', 'max'].includes(plan)) { console.error(`unknown plan ${plan}`); process.exit(1) }

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20000 })
await client.connect()

const { rows: before } = await client.query('SELECT plan, status FROM public.user_plans WHERE user_id = $1', [userId])
console.log(`before: ${before[0] ? `${before[0].plan}/${before[0].status}` : '(no row, treated as starter)'}`)

// Anchors the billing period a month out so publish and generation quotas,
// which count from current_period_start, behave like a real subscription.
await client.query(
  `INSERT INTO public.user_plans (user_id, plan, status, current_period_start, current_period_end, updated_at)
   VALUES ($1, $2, 'active', now(), now() + interval '1 month', now())
   ON CONFLICT (user_id) DO UPDATE SET
     plan = EXCLUDED.plan,
     status = 'active',
     current_period_start = EXCLUDED.current_period_start,
     current_period_end = EXCLUDED.current_period_end,
     updated_at = now()`,
  [userId, plan]
)

const { rows: after } = await client.query(
  'SELECT plan, status, current_period_end FROM public.user_plans WHERE user_id = $1',
  [userId]
)
console.log(`after:  ${after[0].plan}/${after[0].status} until ${after[0].current_period_end?.toISOString().slice(0, 10)}`)
await client.end()
