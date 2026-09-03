/**
 * Apply the outstanding production configuration to Coolify in one run.
 *
 * Everything here is a server-side setting that cannot be committed: an env var
 * on the running container, a scheduled task, and a deploy. They are grouped
 * because they only work together — an env var that is never redeployed is not
 * in the container, and a scheduled task pointing at a route with no secret
 * 401s every night in silence.
 *
 * Needs a Coolify API token with write scope in .env.local as COOLIFY_API_TOKEN.
 * The previous token stopped authenticating mid-session; if every call here
 * returns 401, that is what happened again and the token needs reissuing at
 * Keys & Tokens -> API tokens.
 *
 * Usage:
 *   node scripts/coolify-setup.mjs            # show what would change
 *   node scripts/coolify-setup.mjs --apply    # make the changes and deploy
 *
 * Deliberately not included: BILLING_TEST_MODE. Turning that off starts taking
 * real money and is a decision, not configuration.
 */
import fs from 'node:fs'
import path from 'node:path'

const APP_UUID = 'gnxxna9hespvxratyfa237hn' // seo4ai-web
const APPLY = process.argv.includes('--apply')

const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found. Run this from the repository root.')
  process.exit(1)
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const BASE = (process.env.COOLIFY_URL || '').replace(/\/$/, '')
const TOKEN = process.env.COOLIFY_API_TOKEN
if (!BASE || !TOKEN) {
  console.error('COOLIFY_URL and COOLIFY_API_TOKEN must both be set in .env.local')
  process.exit(1)
}

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

async function call(method, endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers: auth,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* some endpoints return bare text */
  }
  return { status: res.status, ok: res.ok, json, text }
}

/** Fail immediately and unambiguously when the token is dead, rather than at step four. */
async function assertToken() {
  const probe = await call('GET', '/api/v1/applications')
  if (probe.status === 401) {
    console.error(
      'Coolify returned 401. The token in .env.local is not valid.\n' +
        'Reissue at Coolify -> Keys & Tokens -> API tokens (write scope), then update COOLIFY_API_TOKEN.'
    )
    process.exit(1)
  }
  if (!probe.ok) {
    console.error(`Unexpected response listing applications: HTTP ${probe.status} ${probe.text.slice(0, 200)}`)
    process.exit(1)
  }
  const app = (probe.json || []).find((a) => a.uuid === APP_UUID)
  console.log(`Token OK. Target: ${app ? app.name : APP_UUID}`)
}

/**
 * Env vars to push. Only values that already exist locally are sent, so this
 * never invents a secret or blanks one out by writing an empty string.
 *
 * The Polar production credentials are here because they rotate: tokens expire,
 * products get deleted and recreated, webhook secrets are reissued. A key that
 * is merely *present* on the server is not necessarily *correct*, so this
 * updates on mismatch rather than skipping (an earlier version skipped, which
 * meant a rotated token silently never reached the container).
 *
 * NEXT_PUBLIC_APP_URL is deliberately absent: locally it is localhost, and
 * pushing it would point production at a machine nobody can reach.
 */
const WANTED = [
  'CRON_SECRET',
  'ANTHROPIC_API_KEY',
  'POLAR_PRODUCTION_ACCESS_TOKEN',
  'POLAR_PRODUCTION_WEBHOOK_SECRET',
  'POLAR_PRODUCTION_PRO_PRODUCT_ID',
  'POLAR_PRODUCTION_MAX_PRODUCT_ID',
  'POLAR_PRODUCTION_UNLOCK_PRODUCT_ID',
]

/** Keys whose values must never be printed. Product ids are fine to show. */
const isSecret = (key) => !/_PRODUCT_ID$/.test(key)
const show = (key, value) => (isSecret(key) ? `${value.slice(0, 10)}… (len ${value.length})` : value)

/**
 * Coolify stores each key twice, once for production (is_preview false) and once
 * for preview deploys. Both are updated so a preview build never runs against a
 * revoked token. PATCH selects the row by key + is_preview; POST creates.
 */
async function syncEnv() {
  const current = await call('GET', `/api/v1/applications/${APP_UUID}/envs`)
  if (!current.ok) {
    console.error(`Could not read env vars: HTTP ${current.status}`)
    return
  }

  for (const key of WANTED) {
    const value = process.env[key]
    if (!value) {
      console.log(`skip  ${key} — not set locally, nothing to push`)
      continue
    }

    const rows = (current.json || []).filter((e) => e.key === key)
    if (rows.length === 0) {
      if (!APPLY) {
        console.log(`WOULD create ${key} = ${show(key, value)}`)
        continue
      }
      const res = await call('POST', `/api/v1/applications/${APP_UUID}/envs`, { key, value })
      console.log(res.ok ? `added ${key}` : `FAIL  ${key}: HTTP ${res.status} ${res.text.slice(0, 160)}`)
      continue
    }

    for (const row of rows) {
      const scope = row.is_preview ? 'preview' : 'production'
      if (row.value === value) {
        console.log(`ok    ${key} [${scope}] — already correct`)
        continue
      }
      if (!APPLY) {
        console.log(`WOULD update ${key} [${scope}] → ${show(key, value)}`)
        continue
      }
      const res = await call('PATCH', `/api/v1/applications/${APP_UUID}/envs`, {
        key,
        value,
        is_preview: row.is_preview,
      })
      console.log(
        res.ok
          ? `updated ${key} [${scope}] → ${show(key, value)}`
          : `FAIL  ${key} [${scope}]: HTTP ${res.status} ${res.text.slice(0, 160)}`
      )
    }
  }
}

/**
 * The nightly job. Matches the schedule vercel.json declared, so moving the
 * cron onto Coolify does not quietly change when it runs.
 */
const TASK = {
  name: 'auto-scans-and-digest',
  command: 'node scripts/trigger-cron.mjs',
  frequency: '0 8 * * *',
}

async function ensureScheduledTask() {
  const list = await call('GET', `/api/v1/applications/${APP_UUID}/scheduled-tasks`)

  // This endpoint is the one part of the API not verified against this Coolify
  // version. If it is absent, say so plainly instead of reporting success.
  if (list.status === 404 || list.status === 405) {
    console.log(
      `note  scheduled-tasks API not available on this Coolify (HTTP ${list.status}).\n` +
        `      Add it by hand: Application -> Scheduled Tasks -> + Add\n` +
        `        Name      ${TASK.name}\n` +
        `        Command   ${TASK.command}\n` +
        `        Frequency ${TASK.frequency}`
    )
    return
  }
  if (!list.ok) {
    console.error(`Could not read scheduled tasks: HTTP ${list.status} ${list.text.slice(0, 160)}`)
    return
  }

  if ((list.json || []).some((t) => t.name === TASK.name)) {
    console.log(`ok    scheduled task "${TASK.name}" already exists`)
    return
  }
  if (!APPLY) {
    console.log(`WOULD create scheduled task "${TASK.name}" (${TASK.frequency})`)
    return
  }

  const res = await call('POST', `/api/v1/applications/${APP_UUID}/scheduled-tasks`, TASK)
  console.log(
    res.ok
      ? `added scheduled task "${TASK.name}"`
      : `FAIL  scheduled task: HTTP ${res.status} ${res.text.slice(0, 200)}`
  )
}

/** Env changes only reach the container on a rebuild, so this always runs last. */
async function deployAndWait() {
  if (!APPLY) {
    console.log('WOULD trigger a deploy (env changes only apply on rebuild)')
    return
  }

  const res = await call('POST', `/api/v1/deploy?uuid=${APP_UUID}`)
  const uuid = res.json?.deployments?.[0]?.deployment_uuid
  if (!uuid) {
    console.error(`Deploy not queued: HTTP ${res.status} ${res.text.slice(0, 200)}`)
    return
  }
  console.log(`Deploy queued (${uuid}). Builds have taken 25-35 minutes since the memory cap.`)

  const startedAt = Date.now()
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 25_000))
    const s = await call('GET', `/api/v1/deployments/${uuid}`)
    const status = s.json?.status || 'unknown'
    const mins = Math.round((Date.now() - startedAt) / 60_000)
    if (['finished', 'failed', 'error', 'cancelled-by-user'].includes(status)) {
      console.log(`Deploy ${status} after ~${mins}m`)
      return status === 'finished'
    }
    if (i % 4 === 0) console.log(`  ...${status} (${mins}m)`)
  }
  console.log('Stopped watching after 50 minutes; check the Coolify UI.')
}

await assertToken()
await syncEnv()
await ensureScheduledTask()
const deployed = await deployAndWait()

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to make these changes.')
} else if (deployed) {
  console.log(
    '\nDone. The cron is configured but has never been observed succeeding.\n' +
      'Verifying it means running it, which scans due brands and emails digests:\n' +
      '  node scripts/trigger-cron.mjs --url https://seo4ai.app'
  )
}
