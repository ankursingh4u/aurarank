// Generates SEO4AI_Technical_Plan.docx: current stage, requirements, mechanism,
// and the proof protocol. Same styling as gen-gtm-doc.js and gen-launch-plan-doc.js
// so the three documents read as one set.
//
// House style: no em dashes or en dashes in the prose. Use a colon when the
// second clause explains the first, a comma for an aside, "to" for ranges.
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
} = require('docx')

const ACCENT = '4F46E5'
const MUTED = '64748B'
const GOOD = '15803D'
const WARN = 'B45309'
const BAD = 'B91C1C'

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 }, children: [new TextRun({ text: t, bold: true, color: ACCENT })] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true })] })
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t, ...opts })] })
const lead = (label, rest) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: label, bold: true }), new TextRun({ text: rest })] })
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: t })] })
const code = (t) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: t, font: 'Consolas', size: 19, color: MUTED })] })
const quote = (t) => new Paragraph({
  spacing: { before: 120, after: 140 }, indent: { left: 360 },
  children: [new TextRun({ text: t, italics: true, color: ACCENT })],
})
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] })

function cell(text, { header = false, color } = {}) {
  return new TableCell({
    shading: header ? { fill: ACCENT } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({
      text: String(text), bold: header, size: 20,
      color: header ? 'FFFFFF' : color,
    })] })],
  })
}
// Rows may be plain arrays, or [text, color] pairs to tint a status cell.
function table(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c) => Array.isArray(c)
        ? cell(c[0], { header: i === 0, color: c[1] })
        : cell(c, { header: i === 0 })),
    })),
  })
}

const children = []

/* ── Title ─────────────────────────────────────────────────────────── */
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'SEO4AI', bold: true, size: 56, color: ACCENT })] }))
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Technical Plan, Requirements and Current Stage', size: 30, color: MUTED })] }))
children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Verified Monday 10 August 2026 against the live site and the working tree', italics: true, color: MUTED })] }))
children.push(P('This document answers four questions before any more code is written: where the product actually stands today, what it must do to be honest, how that will work, and how we will prove it works. Every status claim below was checked against the running site or the repository, not recalled.'))

/* ══ 1. CURRENT STAGE ═════════════════════════════════════════════════ */
children.push(H1('1. Current stage'))

children.push(H2('1.1 What is live right now'))
children.push(P('seo4ai.app is registered, resolving and serving a fully working application from Vercel. The older seo4ai.bolddev.live subdomain no longer resolves at all.'))
children.push(spacer())
children.push(table([
  ['Item', 'Verified state'],
  ['Domain', 'seo4ai.app live, HTTPS, HSTS enabled'],
  ['Host', 'Vercel (Server: Vercel, region bom1). Not Coolify.'],
  ['Deployed build age', 'Roughly 5 days old, predates all current working-tree changes'],
  ['Pricing shown', 'Starter free, Pro $24.99, Max $49.99. Matches src/lib/payment.ts.'],
  ['Free scan endpoint', 'Reachable, validates input (HTTP 400 on empty body)'],
  ['robots.txt and sitemap', 'Correct host, already emit https://seo4ai.app'],
  ['AI Visibility Index page', 'Live but EMPTY. No company data published.'],
]))
children.push(spacer())
children.push(lead('Correction to earlier assumptions: ', 'because production is on Vercel and not Coolify, the vercel.json cron is valid and does fire, and NEXT_PUBLIC_APP_URL is already set correctly in production. Two previously reported blockers were not real.'))

children.push(H2('1.2 What is built and working'))
;[
  'Scoring engine with honest methodology: brand-echo prompts excluded, unfamiliar-brand responses not counted, sentiment zeroed when unmentioned. 23 unit tests passing.',
  'Multi-run sampling: each prompt asked three times, majority verdict, per-prompt split retained, stability metric published. Built today, not yet run against live data.',
  'Free public scan with IP rate limiting (3 per day, 10 minute cooldown, 200 per day global).',
  'Supabase auth, RLS on every table, server-side plan enforcement on all write routes.',
  'Polar billing plumbing: checkout, customer portal, webhook, sandbox and production credential split.',
  'Dashboard, competitor gap analysis, boost content generator, article generation, WordPress publishing, outreach drafts, shareable report cards with dynamic OG images.',
  'SEO foundation built today: canonical domain module, AI crawler allowances, llms.txt, Article, Organization, SoftwareApplication, Breadcrumb and FAQPage structured data, visible FAQ section.',
].forEach(t => children.push(bullet(t)))

children.push(H2('1.3 What is built but does not work as sold'))
children.push(P('This is the section that matters most.', { bold: true }))
children.push(spacer())
children.push(table([
  ['Issue', 'Consequence', 'Severity'],
  ['Scanner has no web search on any engine', 'Measures frozen training weights only. A customer who does the recommended work and re-scans sees no change.', ['Critical', BAD]],
  ['Max advertises Claude, ANTHROPIC_API_KEY unset', 'Sells three engines, delivers two', ['High', BAD]],
  ['BILLING_TEST_MODE=true', 'No real payment can be taken', ['High', WARN]],
  ['index_entries empty in production', 'Public index and llms.txt render empty states, so the main content asset shows nothing', ['High', WARN]],
  ['Deployed build 5 days stale', 'None of the rename, SEO or sampling work is live', ['Medium', WARN]],
  ['Pricing below competitors on value', 'Otterly bundles 4 engines at about $29; Max is $49.99 for 3', ['Medium', WARN]],
  ['Perplexity claimed in older deployed copy', 'No Perplexity engine exists. Fixed in working tree, not deployed.', ['Medium', WARN]],
  ['Three blog posts dated January 2025', 'Stale content in a category where freshness drives retrieval', ['Low', MUTED]],
]))

children.push(H2('1.4 What does not exist yet'))
;[
  'Grounded, search-enabled scanning in the product. Proven feasible on 10 August, not yet implemented. The single blocking item.',
  'Category leaderboard pages at /ai-visibility-index/[category].',
  'Any instrumented before-and-after proof that the product moves a real brand.',
  'Automated tests for anything other than the analyzer. Thirteen lib modules have no test file.',
  'A confirmed paying customer.',
]. forEach(t => children.push(bullet(t)))

children.push(H2('1.5 Honest one-line summary'))
children.push(quote('The product is well built, deployed, and measures the one thing it cannot help a customer change. Everything else is secondary to fixing that.'))

/* ══ 2. MECHANISM ═════════════════════════════════════════════════════ */
children.push(H1('2. How AI recommendation actually works'))
children.push(P('An AI assistant names a brand through two independent channels. Confusing them is the root cause of the issue in section 1.3.'))
children.push(spacer())
children.push(table([
  ['', 'Parametric channel', 'Retrieval channel'],
  ['What it is', 'What the model absorbed during training', 'What the model fetches from the live web while answering'],
  ['Who uses it', 'Plain API calls, ChatGPT with search off', 'ChatGPT search, Perplexity, AI Overviews, Copilot'],
  ['Driven by', 'Broad, long-standing presence across the web', 'Search ranking plus extractable, citable pages'],
  ['Can a customer move it?', 'Not on any sellable timescale', 'Yes, in roughly 2 to 8 weeks'],
  ['Changes when', 'The model is retrained, every 6 to 18 months', 'Continuously'],
  ['What we measure today', 'This one', 'Nothing'],
]))
children.push(spacer())
children.push(lead('The commercial consequence: ', 'we currently sell a subscription whose central promise is progress, while measuring the only channel that will not show progress. A customer doing everything right sees a flat score and cancels, correctly.'))

/* ══ 3. REQUIREMENTS ══════════════════════════════════════════════════ */
children.push(H1('3. What we require'))
children.push(P('Grouped by purpose. Each has an acceptance test, so "done" is not a matter of opinion.'))

children.push(H2('R1. Grounded scanning (blocks everything)'))
children.push(table([
  ['Req', 'Detail', 'Acceptance test'],
  ['R1.1', 'Enable web search on all engines. OpenAI MUST force it with tool_choice, see finding 1 in section 5.', 'Grounded scan returns citations; verified 10 Aug'],
  ['R1.2', 'Capture cited source domains. Read Gemini from web.title, not web.uri or web.domain.', 'Every mention row carries real domains, not redirects'],
  ['R1.3', 'Record the channel used on every scan row', 'A scan can be filtered to grounded or parametric'],
  ['R1.4', 'Handle the higher cost and latency of grounded calls', 'A 20 prompt, 3 run scan completes inside the request budget and its cost is logged'],
]))
children.push(spacer())
children.push(lead('R1.2 is not optional decoration. ', 'The cited URLs are the product. Knowing that ChatGPT recommended a competitor because it read three specific pages tells a customer exactly what to go and fix, and no score alone can do that.'))

children.push(H2('R2. Dual measurement'))
children.push(P('Keep both channels, used for different jobs, clearly labelled wherever a number appears.'))
children.push(table([
  ['Surface', 'Channel', 'Why'],
  ['Public AI Visibility Index', 'Parametric', 'Stable and comparable across months, which is what a leaderboard needs. Existing Linear and Superhuman findings stay valid.'],
  ['Customer scans and dashboard', 'Grounded', 'Responsive to work, shows progress, justifies a subscription'],
  ['Free public scan', 'Grounded', 'It is the hook. It must reflect what a real user of ChatGPT would see.'],
]))

children.push(H2('R3. Proof instrumentation'))
;[
  'R3.1 Persist every scan so a time series per brand exists, with the channel recorded.',
  'R3.2 A visible progress view showing score, mentions and citation count over time.',
  'R3.3 Log every recommended action with the date it was completed, so cause and effect can be attributed.',
  'R3.4 Acceptance: for one instrumented brand we can state what changed, when it was done, and what the score did afterwards.',
].forEach(t => children.push(bullet(t)))

children.push(H2('R4. Commercial readiness'))
;[
  'R4.1 ANTHROPIC_API_KEY set, or Claude removed from the Max feature list.',
  'R4.2 BILLING_TEST_MODE=false with production webhook secret, verified by one real end-to-end purchase.',
  'R4.3 Seed the production index so the public data asset is not empty.',
  'R4.4 Deploy the current working tree. Five days of work is unshipped.',
  'R4.5 A defensible answer to "why not Otterly at $29 for four engines".',
].forEach(t => children.push(bullet(t)))

children.push(H2('R5. Winnability classification'))
children.push(P('We cannot guarantee that a third party will list a customer, so expectations have to be set at scan time rather than after the invoice. Every missed query gets classified by how locked its retrieved set is.'))
children.push(table([
  ['Class', 'Meaning', 'What we tell the customer'],
  ['Winnable', 'Retrieved set is thin, or contains self-serve sources such as review platforms and directories', 'We work on these'],
  ['Hard', 'Set is held by large review platforms with editorial gatekeeping', 'Possible, slower, costs more effort'],
  ['Locked', 'Set is editorial or competitor-owned only', 'Do not spend money here'],
]))
children.push(spacer())
;[
  'R5.1 Classify every missed query from the cited domains already captured by R1.2. No new data collection is needed.',
  'R5.2 Maintain a list of self-serve source domains (G2, Capterra, TrustRadius, Product Hunt, AlternativeTo, SaaSHub, niche directories) as the winnable signal.',
  'R5.3 Show the split on the scan result, for example "12 winnable, 9 hard, 19 locked".',
  'R5.4 Acceptance: no customer is sold work on a query classified as locked.',
].forEach(t => children.push(bullet(t)))
children.push(lead('Why this is a feature and not a disclaimer: ', 'every competitor reports a score and implies it can be fixed. Being the only tool that says "do not bother with these 19" is a trust position, and it is the honest answer to the fact that placement is not fully in our control.'))

children.push(H2('R6. Differentiation'))
children.push(P('Measurement is commoditised: over twenty tools, a price floor near $29, and Semrush and SE Ranking have shipped it. We do not win on engine count. Two candidate positions:'))
children.push(bullet('Execution layer. Most tools report and stop. We already generate articles, publish to WordPress and draft outreach. "We show you the gap and then close it" is a different product and supports a higher price.'))
children.push(bullet('Shopify vertical. No major competitor is in the Shopify App Store. We have a dozen Shopify apps of prior experience, so it is a distribution channel we can already reach, with built-in purchase intent and no cold outreach.'))
children.push(P('This is an open decision, see section 6.'))

/* ══ 4. HOW IT WILL WORK ══════════════════════════════════════════════ */
children.push(H1('4. How it will work'))
children.push(H2('4.1 Scan pipeline after the change'))
;[
  '1. Generate buyer-intent prompts for the category, never containing the brand name.',
  '2. For each prompt, query every engine on the plan with web search enabled, three times.',
  '3. Collapse the runs by majority verdict, keeping the per-run split and the stability figure.',
  '4. Record, per prompt: named or not, position, sentiment, competitors named, and the URLs the engine cited.',
  '5. Score as today: 50% mention frequency, 30% position, 20% sentiment.',
  '6. Derive the fix list from the citations, not from generic advice: the specific pages that named a competitor and not us.',
].forEach(t => children.push(bullet(t)))
children.push(P('Step 6 is the whole difference. Today the fix plan is generic advice a model invents. With citations it becomes a named list of real pages to go and get listed on.'))

children.push(H2('4.2 Files this touches'))
children.push(code('src/lib/engines.ts        add search tooling per engine, return citations'))
children.push(code('src/lib/analyzer.ts       unchanged, already channel agnostic'))
children.push(code('src/lib/index-scan.ts     thread channel and citations through PromptRow'))
children.push(code('src/lib/scan-runner.ts    same, for customer scans'))
children.push(code('supabase/                 migration for citations and channel columns'))
children.push(P('The scoring core, which is the tested part, does not change. This is a change to how answers are obtained, not to how they are judged.'))

/* ══ 5. PROOF ═════════════════════════════════════════════════════════ */
children.push(H1('5. How we prove it works'))
children.push(P('Three levels, cheapest first. Do not proceed to the next until the current one passes.'))

children.push(H2('Level 1: the scanner sees the live web. RUN AND PASSED, 10 August 2026'))
children.push(P('Executed via scripts/grounding-test.mjs and scripts/grounding-test2.mjs against the live OpenAI and Gemini APIs. Result: grounding works, search can be forced, and citations with real source domains are capturable on both engines.'))
children.push(spacer())
children.push(table([
  ['Engine', 'Parametric', 'Grounded', 'Verdict'],
  ['OpenAI', 'Answered from weights. On the category query it named Tableau, Sisense and Power BI, which are BI tools, not AI visibility tools.', 'With tool_choice forced: search ran, 14 citations with real domains, correct current answer.', ['Pass, with a caveat', WARN]],
  ['Gemini', 'No citations, generic answer', '11 grounded sources, 5 distinct search queries issued', ['Pass', GOOD]],
]))
children.push(spacer())
children.push(H2('5.1.1 Two implementation findings'))
children.push(lead('Finding 1. OpenAI search is optional and the model skips it. ', 'Passing the web_search tool is not enough. On category queries the model ignored it, answered from memory, and was wrong. It must be forced with tool_choice, otherwise grounded scanning silently degrades to parametric scanning and produces worse results than the current code.'))
children.push(lead('Finding 2. Gemini returns redirect URLs, not source domains. ', 'groundingChunks[].web.uri is a vertexaisearch.cloud.google.com redirect and web.domain is null. The real source is in web.title. The citation map is the product, so this must be read from the correct field.'))

children.push(H2('5.1.2 The commercially important finding'))
children.push(P('The domains actually cited for "best AI visibility tracking tools" were not the funded incumbents.'))
children.push(spacer())
children.push(table([
  ['Engine', 'Domains cited'],
  ['OpenAI', 'aeovision.ai, siftly.ai, viaudit.com, allmond.app, honeyb.ai, oneglanse.com, ahoylighthouse.com, linksii.com, bourd.dev, doishowup.com'],
  ['Gemini', 'workduo.ai, aibrandpulse.ai, siftly.ai, beamtrace.com, hubspot.com, adobe.com, usegrowthos.com, alhena.ai, semai.ai, builtin.com, otterly.ai'],
]))
children.push(spacer())
children.push(quote('The category is crowded at the listicle layer and thin at the retrieval layer. We are competing for a citation slot against allmond.app and honeyb.ai, not against Semrush.'))
children.push(P('This materially improves the outlook. Earlier analysis of Google results suggested a saturated market dominated by Profound, Peec and Semrush. What the models actually retrieve is a different and far more winnable set of small, recent domains. Those tools got in somehow, recently, without funding. That path is reproducible.'))
children.push(lead('Second observation: the two engines barely overlap. ', 'Of roughly eleven sources each, only siftly.ai appeared in both. Visibility is therefore per-engine, not global, and a customer needs a different target list for each engine. No competitor is currently framing it this way.'))
children.push(lead('Third observation, about our own brand: ', 'SEO4AI was not named on either the head or the long-tail category query by any engine, grounded or not. On a direct brand query the models found seo4ai.app but confused it with a Chrome extension of the same name and with a separate service called SEO-4AI. There is a brand collision that damages our own visibility work and should be considered before further brand investment.'))

children.push(H2('Level 2: a controlled brand moves (4 to 8 weeks)'))
children.push(P('Use SEO4AI itself. Baseline scan today, published publicly whatever it says. Then execute only the retrieval levers and re-scan weekly.'))
children.push(spacer())
children.push(table([
  ['Lever', 'Expected effect', 'Time to show'],
  ['Get listed in 3 to 4 existing category roundups', 'Largest single lever', '2 to 6 weeks'],
  ['Rank in Bing for the category query', 'Feeds ChatGPT and Copilot directly', '3 to 8 weeks'],
  ['Extractable content, FAQ, schema', 'Modest alone, raises conversion of the above', '1 to 3 weeks'],
  ['Community and forum threads naming us', 'Real, hard to manufacture honestly', '2 to 6 weeks'],
]))
children.push(spacer())
children.push(lead('Pass condition: ', 'score and citation count both rise, and the citations name the specific pages we caused to exist. Rising score with unrelated citations is coincidence, not proof.'))
children.push(P('Magnitudes are reasoned estimates, not measurements. A brand moving from absent to present in several retrieved sources plausibly goes from 1 or 2 mentions in 20 to 8 or 10, which is a score around 10 rising to around 50. Level 2 exists to replace that estimate with a fact.'))

children.push(H2('Level 3: a customer brand moves (8 to 12 weeks)'))
children.push(P('Repeat Level 2 on a paying customer who is not us, in a different category. One case study with real dates, real actions and real numbers is worth more than any amount of landing page copy, and it is the asset no competitor can copy.'))

children.push(H2('5.4 What would disprove the thesis'))
children.push(P('Stated in advance so the answer cannot be rationalised later.', { color: MUTED, italics: true }))
;[
  'Level 1 fails: grounded and parametric return the same thing. Then the channel distinction is not real and the product premise collapses.',
  'Level 2 runs 8 weeks with the levers genuinely executed and the score does not move. Then customers cannot move it either, and we should sell measurement only, at a measurement price.',
  'Level 2 passes but no one pays. Then the problem is real and solved but not valuable enough, which is a positioning problem, not a technical one.',
].forEach(t => children.push(bullet(t)))

/* ══ 6. OPEN DECISIONS ════════════════════════════════════════════════ */
children.push(H1('6. Open decisions'))
children.push(table([
  ['#', 'Decision', 'Needed by'],
  ['D1', 'Execution layer or Shopify vertical as the differentiator', 'Before pricing is fixed'],
  ['D2', 'Pricing answer versus Otterly at about $29 for four engines', 'Before real billing is switched on'],
  ['D3', 'Does the free public scan use grounded scanning, given it costs more per call', 'With R1'],
  ['D4', 'Does the public Index stay parametric', 'Recommended yes, confirm before the next index run'],
  ['D5', 'Whether launch timing shifts, since grounded scanning is now ahead of it', 'This week'],
  ['D6', 'Brand collision: a Chrome extension and a service called SEO-4AI share the name and confuse the models', 'Before further brand spend'],
]))

/* ══ 7. SEQUENCE ══════════════════════════════════════════════════════ */
children.push(H1('7. Sequence'))
children.push(table([
  ['Order', 'Work', 'Gate'],
  ['1', 'Level 1 proof, grounded versus parametric', ['DONE 10 Aug, passed', GOOD]],
  ['2', 'R1 grounded scanning with citations, plus R5 winnability', 'Blocks R3 and Gate 2'],
  ['3', 'R4 commercial readiness, deploy the working tree, seed the index', 'Gate 2'],
  ['4', 'R3 progress instrumentation', 'Needed for proof'],
  ['5', 'Baseline scan of SEO4AI, published, Level 2 begins', 'Starts the 8 week clock'],
  ['6', 'Category leaderboard pages, weekly rhythm begins', 'Growth engine'],
  ['7', 'Re-evaluate launch date against Level 2 results', 'Gate 3'],
]))
children.push(spacer())
children.push(lead('Note on ordering: ', 'the launch plan dated today put category leaderboard pages first. Grounded scanning now takes precedence, because leaderboards market a product whose central claim we cannot currently demonstrate.'))

/* ── Assemble ─────────────────────────────────────────────────────── */
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children,
  }],
})

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, '..', 'SEO4AI_Technical_Plan.docx')
  fs.writeFileSync(out, buf)
  console.log('Wrote', out, '(' + buf.length + ' bytes)')
})
