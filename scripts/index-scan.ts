/**
 * AI Visibility Index scanner (command line).
 *
 * The web admin page at /dashboard/index-admin is the normal way to run scans.
 * This script exists for bulk work and for producing the seed file that
 * /api/admin/index/seed imports, and it shares its scoring logic with the web
 * route via src/lib/index-scan.ts so both produce identical numbers.
 *
 * Usage:
 *   npx tsx scripts/index-scan.ts                      # scan every company
 *   npx tsx scripts/index-scan.ts Notion Linear        # scan a subset
 *   npx tsx scripts/index-scan.ts --engines=openai,gemini
 */
import fs from 'node:fs'
import path from 'node:path'
import { scanIndexCompany, type CompanyResult, type PromptRow, type IndexCompany } from '../src/lib/index-scan'
import type { EngineKey } from '../src/lib/engines'

const ROOT = path.resolve(__dirname, '..')

// tsx does not load .env.local the way Next does, so parse it ourselves.
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(ROOT, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const val = m[2].replace(/^["']|["']$/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = val
    }
  }
}
loadEnv()

/** The seed universe. Companies added later live in the database, not here. */
export const COMPANIES: IndexCompany[] = [
  {
    name: 'Notion',
    industry: 'note-taking and workspace software',
    competitors: ['Coda', 'Obsidian', 'Confluence', 'Evernote', 'Asana'],
  },
  {
    name: 'Linear',
    industry: 'issue tracking software',
    competitors: ['Jira', 'Asana', 'Shortcut', 'ClickUp', 'Trello'],
  },
  {
    name: 'Vercel',
    industry: 'frontend hosting platform',
    competitors: ['Netlify', 'Cloudflare Pages', 'Render', 'Railway', 'AWS Amplify'],
  },
  {
    name: 'Superhuman',
    industry: 'email client software',
    competitors: ['Gmail', 'Outlook', 'Spark', 'Hey', 'Missive'],
  },
  {
    name: 'Airtable',
    industry: 'no-code database software',
    competitors: ['Notion', 'Smartsheet', 'Monday.com', 'Coda', 'Baserow'],
  },
  {
    name: 'Zapier',
    industry: 'workflow automation software',
    competitors: ['Make', 'n8n', 'Workato', 'IFTTT', 'Tray.io'],
  },
  {
    name: 'Figma',
    industry: 'design and prototyping software',
    competitors: ['Sketch', 'Adobe XD', 'Framer', 'Canva', 'Penpot'],
  },
  {
    name: 'Slack',
    industry: 'team communication software',
    competitors: ['Microsoft Teams', 'Discord', 'Mattermost', 'Google Chat', 'Zulip'],
  },
  {
    name: 'HubSpot',
    industry: 'CRM software',
    competitors: ['Salesforce', 'Zoho CRM', 'Pipedrive', 'ActiveCampaign', 'Freshsales'],
  },
  {
    name: 'Stripe',
    industry: 'payment processing platform',
    competitors: ['PayPal', 'Adyen', 'Square', 'Braintree', 'Paddle'],
  },
]

function toMarkdown(results: CompanyResult[]): string {
  const rows = [...results].sort((a, b) => b.score - a.score)
  return [
    '| # | Company | Score | Rating | Named in | Top competitor |',
    '|---|---------|-------|--------|----------|----------------|',
    ...rows.map(
      (r, i) =>
        `| ${i + 1} | ${r.company} | ${r.score} | ${r.label} | ${r.discoveryMentions}/${r.discoveryPrompts} | ${
          r.topCompetitor ? `${r.topCompetitor} ${r.topCompetitorMentions}/${r.discoveryPrompts}` : '-'
        } |`
    ),
  ].join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const engineArg = args.find((a) => a.startsWith('--engines='))
  const engines = (engineArg?.split('=')[1].split(',') as EngineKey[]) || (['openai'] as EngineKey[])
  const names = args.filter((a) => !a.startsWith('--'))

  const targets = names.length
    ? COMPANIES.filter((c) => names.some((n) => n.toLowerCase() === c.name.toLowerCase()))
    : COMPANIES

  if (!targets.length) {
    console.error(`No matching companies. Known: ${COMPANIES.map((c) => c.name).join(', ')}`)
    process.exit(1)
  }
  if (!process.env.OPENAI_API_KEY && engines.includes('openai')) {
    console.error('OPENAI_API_KEY is not set — add it to .env.local')
    process.exit(1)
  }

  console.log(`Scanning ${targets.length} companies on [${engines.join(', ')}]`)

  const results: CompanyResult[] = []
  const raw: Array<{ company: string; rows: PromptRow[] }> = []
  for (const c of targets) {
    try {
      process.stdout.write(`\n  ${c.name} `)
      const { result, rows } = await scanIndexCompany(c, engines, (done, total) =>
        process.stdout.write(done === total ? ` ${done}/${total}` : '')
      )
      results.push(result)
      raw.push({ company: c.name, rows })
    } catch (err) {
      console.error(`\n  ${c.name} failed:`, err instanceof Error ? err.message : err)
    }
  }
  console.log('\n')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const archiveDir = path.join(ROOT, 'data', 'scans')
  fs.mkdirSync(archiveDir, { recursive: true })
  fs.writeFileSync(path.join(archiveDir, `${stamp}.json`), JSON.stringify({ results, raw }, null, 2))

  // Seed file consumed by /api/admin/index/seed. The database is the source of
  // truth for the live site; this is a bootstrap and archive only.
  const seedPath = path.join(ROOT, 'src', 'data', 'ai-visibility-index.json')
  fs.mkdirSync(path.dirname(seedPath), { recursive: true })
  const existing: CompanyResult[] = fs.existsSync(seedPath)
    ? JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    : []
  const merged = [
    ...existing.filter((e) => !results.some((r) => r.company === e.company)),
    ...results,
  ].sort((a, b) => b.score - a.score)
  fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2))

  const table = toMarkdown(merged)
  fs.writeFileSync(path.join(archiveDir, `${stamp}.md`), `# AI Visibility Index — ${stamp}\n\n${table}\n`)

  console.log(table)
  console.log(`\nSeed file → src/data/ai-visibility-index.json (${merged.length} companies)`)
  console.log(`Archive   → data/scans/${stamp}.json`)

  const errored = results.filter((r) => r.erroredPrompts > 0)
  if (errored.length) {
    console.log(
      `\nNote: dropped errored prompts for ${errored
        .map((r) => `${r.company} (${r.erroredPrompts})`)
        .join(', ')} — excluded from scoring rather than counted as misses.`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
