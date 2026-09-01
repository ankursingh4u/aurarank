/**
 * Seed and scan one category of the AI Visibility Index, from the browser.
 *
 * Not imported by the app. Paste it into the DevTools console while signed in
 * as an admin on https://seo4ai.app/dashboard/index-admin. The admin API is
 * cookie-authenticated and same-origin, so requests from that page carry your
 * session automatically.
 *
 * Why this exists: adding fifteen brands through the form is fifteen rounds of
 * typing, and the weekly rhythm does it again every Monday for a new category.
 *
 * Seeding and scanning are deliberately separate calls. Seeding is free.
 * Scanning spends money, so it never starts on its own.
 *
 *   await seedCategory(CRM)      // adds the rows, no scanning, no cost
 *   await scanCategory(CRM)      // scans them one at a time, ~60-90s each
 *
 * Re-running either is safe. seedCategory skips brands already present, and
 * scanCategory re-scans, which is what you want when refreshing a leaderboard.
 */

/**
 * CRM, the first category in the launch order.
 *
 * `industry` must be identical across the whole set, because that string is
 * what groups these rows onto one leaderboard page. "CRM software" matches the
 * HubSpot row already in the index.
 *
 * Competitors are drawn from inside the set so the head-to-head column compares
 * like with like. HubSpot is omitted here: it is already seeded and scanned.
 */
const CRM = {
  industry: 'CRM software',
  brands: [
    { company: 'Salesforce',            competitors: ['HubSpot', 'Zoho CRM', 'Pipedrive'] },
    { company: 'Zoho CRM',              competitors: ['Salesforce', 'HubSpot', 'Pipedrive'] },
    { company: 'Pipedrive',             competitors: ['HubSpot', 'Zoho CRM', 'Close'] },
    { company: 'Microsoft Dynamics 365', competitors: ['Salesforce', 'HubSpot', 'Zoho CRM'] },
    { company: 'Freshsales',            competitors: ['Zoho CRM', 'Pipedrive', 'HubSpot'] },
    { company: 'Close',                 competitors: ['Pipedrive', 'HubSpot', 'Copper'] },
    { company: 'Copper',                competitors: ['Pipedrive', 'HubSpot', 'Close'] },
    { company: 'Insightly',             competitors: ['Zoho CRM', 'Pipedrive', 'HubSpot'] },
    { company: 'Nutshell',              competitors: ['Pipedrive', 'Close', 'Copper'] },
    { company: 'Attio',                 competitors: ['HubSpot', 'Pipedrive', 'Folk'] },
    { company: 'Folk',                  competitors: ['Attio', 'Copper', 'Pipedrive'] },
    { company: 'Capsule CRM',           competitors: ['Nutshell', 'Insightly', 'Pipedrive'] },
    { company: 'Keap',                  competitors: ['HubSpot', 'ActiveCampaign', 'Zoho CRM'] },
    { company: 'Monday Sales CRM',      competitors: ['HubSpot', 'Pipedrive', 'Salesforce'] },
  ],
}

/** Everything already in the index, by company name. */
async function existingCompanies() {
  const res = await fetch('/api/admin/index')
  if (!res.ok) throw new Error(`Could not read the index: HTTP ${res.status}`)
  const body = await res.json()
  const rows = Array.isArray(body) ? body : body.entries || body.companies || []
  return new Set(rows.map((r) => r.company))
}

/**
 * Add every brand in the category that is not already present. Free: this only
 * writes configuration rows, it does not scan.
 */
async function seedCategory(category) {
  const existing = await existingCompanies()
  const added = []
  const skipped = []

  for (const brand of category.brands) {
    if (existing.has(brand.company)) {
      skipped.push(brand.company)
      console.log(`skip  ${brand.company} (already in the index)`)
      continue
    }

    const res = await fetch('/api/admin/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: brand.company,
        industry: category.industry,
        competitors: brand.competitors,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error(`FAIL  ${brand.company}: HTTP ${res.status} ${detail.slice(0, 200)}`)
      continue
    }
    added.push(brand.company)
    console.log(`added ${brand.company}`)
  }

  console.log(`\nSeeded ${added.length}, skipped ${skipped.length}.`)
  console.log('Nothing has been scanned yet. Run scanCategory(CRM) when ready.')
  return { added, skipped }
}

/**
 * Scan each brand in turn. One at a time on purpose: the scan route handles one
 * company per request and takes 60-90 seconds, so firing them in parallel just
 * trips rate limits and makes a failure harder to attribute.
 *
 * A failed brand is logged and skipped rather than aborting the run, so one bad
 * scan does not cost you the other thirteen.
 */
async function scanCategory(category, engines = ['openai']) {
  const results = []
  let i = 0

  for (const brand of category.brands) {
    i++
    const label = `[${i}/${category.brands.length}] ${brand.company}`
    console.log(`${label} scanning...`)
    const startedAt = Date.now()

    try {
      const res = await fetch('/api/admin/index/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: brand.company, engines }),
      })
      const body = await res.json()
      const seconds = Math.round((Date.now() - startedAt) / 1000)

      if (!res.ok) {
        console.error(`${label} FAILED after ${seconds}s: ${body.error || res.status}`)
        continue
      }

      console.log(
        `${label} score ${body.score} (${body.label}) - named in ${body.discoveryMentions}/${body.discoveryPrompts}` +
          `${body.topCompetitor ? `, top competitor ${body.topCompetitor} ${body.topCompetitorMentions}` : ''}` +
          ` - ${seconds}s`
      )
      results.push(body)
    } catch (err) {
      console.error(`${label} threw: ${err.message}`)
    }
  }

  console.table(
    results
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ company: r.company, score: r.score, named: `${r.discoveryMentions}/${r.discoveryPrompts}` }))
  )
  console.log('\nThe leaderboard page revalidates every 5 minutes.')
  return results
}

console.log('Loaded. Run: await seedCategory(CRM)   then   await scanCategory(CRM)')
