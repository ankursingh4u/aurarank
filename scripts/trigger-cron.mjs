/**
 * Fire the scheduled scan + weekly digest job.
 *
 * `/api/cron` was written for Vercel Cron, which is configured in vercel.json
 * and does not run on Coolify. Deploying to Coolify therefore silently disabled
 * auto-scans and the weekly digest — both of which are paid-tier promises, so
 * selling Pro while they are dead is the exact thing the pre-launch doc was
 * written to prevent.
 *
 * This script is what a Coolify scheduled task runs. It is deliberately a thin
 * HTTP client rather than a second copy of the job: the logic stays in the route,
 * and the scheduler only has to know a URL and a secret.
 *
 * Coolify setup (Application → Scheduled Tasks → + Add):
 *   Name      auto-scans-and-digest
 *   Command   node scripts/trigger-cron.mjs
 *   Frequency 0 8 * * *        (matches the schedule vercel.json used)
 *
 * Requires CRON_SECRET to be set in the application's environment — the route
 * rejects every request without it, so an unset secret means the job 401s daily
 * and nothing runs. That is also the failure this script reports loudest.
 *
 * Usage: node scripts/trigger-cron.mjs [--url https://seo4ai.app]
 */
import fs from 'node:fs'
import path from 'node:path'

// Local runs read .env.local; on Coolify the variables are already in the
// environment and the file does not exist.
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const flagIndex = process.argv.indexOf('--url')
const base = (
  (flagIndex !== -1 ? process.argv[flagIndex + 1] : null) ||
  process.env.CRON_TARGET_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')

const secret = process.env.CRON_SECRET
if (!secret) {
  console.error(
    'CRON_SECRET is not set. /api/cron rejects every request without it, so the ' +
      'scheduled job would 401 daily and no auto-scan or digest would run.'
  )
  process.exit(1)
}

// A full run scans every due brand and sends the weekly digest, so it can take
// minutes. The route caps itself at 300s; allow a little more before giving up.
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 330_000)

const startedAt = Date.now()
console.log(`Triggering ${base}/api/cron`)

try {
  const res = await fetch(`${base}/api/cron`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: controller.signal,
  })

  const body = await res.text()
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)

  if (!res.ok) {
    // 401 here means the secret this script sent and the one the server holds
    // disagree — the single most likely misconfiguration, so name it.
    console.error(
      `Cron failed: HTTP ${res.status} after ${seconds}s${
        res.status === 401
          ? " — the server's CRON_SECRET is either unset or different from this one." +
            ' A 401 looks identical in both cases, so check the value in Coolify rather than guessing.'
          : ''
      }`
    )
    console.error(body.slice(0, 2000))
    process.exit(1)
  }

  console.log(`Cron completed in ${seconds}s`)
  console.log(body.slice(0, 2000))
} catch (err) {
  const reason = err.name === 'AbortError' ? 'timed out after 330s' : err.message
  console.error(`Cron request failed: ${reason}`)
  process.exit(1)
} finally {
  clearTimeout(timeout)
}
