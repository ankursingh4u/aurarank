// Generates SEO4AI_Operating_Doc.docx, the single consolidated document:
// current state, the plan to launch, what happens after, and the personal
// tracks running alongside it. Supersedes WEEKLY.md and folds in the essentials
// of SEO4AI_Launch_Plan.docx, SEO4AI_PRODUCT_GTM.md and PRODUCTION_READINESS.md.
// Styling mirrors gen-launch-plan-doc.js so the set reads as one.
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
} = require('docx')

const ACCENT = '4F46E5'
const MUTED = '64748B'
const DANGER = 'B91C1C'
const OK = '15803D'
const BOX = '☐'

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 120 }, children: [new TextRun({ text: t, bold: true, color: ACCENT })] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 }, children: [new TextRun({ text: t, bold: true })] })
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 }, children: [new TextRun({ text: t, bold: true, color: MUTED })] })
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t, ...opts })] })
const lead = (label, rest) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: label, bold: true }), new TextRun({ text: rest })] })
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: t })] })
const bulletLead = (label, rest) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: label, bold: true }), new TextRun({ text: rest })] })
const quote = (t) => new Paragraph({
  spacing: { before: 120, after: 140 },
  indent: { left: 360 },
  children: [new TextRun({ text: t, italics: true, color: ACCENT })],
})
const check = (t, opts = {}) => new Paragraph({
  spacing: { after: 60 },
  indent: { left: 200 },
  children: [new TextRun({ text: BOX + '  ', size: 26 }), new TextRun({ text: t, ...opts })],
})
const rule = () => new Paragraph({ spacing: { before: 60, after: 160 }, border: { bottom: { style: 'single', size: 6, color: 'E2E8F0' } }, children: [] })

function cell(text, { header = false, bold = false, color } = {}) {
  return new TableCell({
    shading: header ? { fill: ACCENT } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: String(text), bold: bold || header, color: header ? 'FFFFFF' : color, size: 20 })] })],
  })
}
function table(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c) => cell(c, { header: i === 0 })),
    })),
  })
}
// Two-column key/value table with no header row.
function kv(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r) => new TableRow({
      children: [cell(r[0], { bold: true }), cell(r[1])],
    })),
  })
}
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] })

const children = []

/* ── Title ─────────────────────────────────────────────────────────── */
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'SEO4AI', bold: true, size: 56, color: ACCENT })] }))
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Operating Document', size: 30, color: MUTED })] }))
children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Monday 10 August 2026  ·  Covers the product, the launch, what comes after, and everything running alongside it', italics: true, color: MUTED })] }))
children.push(P('One document instead of five. Everything in here is load-bearing: it either changes what gets done this week, or it is a decision that stops being re-argued. Detail that belongs elsewhere is pointed at, not copied.'))
children.push(rule())

/* ── 1. At a glance ────────────────────────────────────────────────── */
children.push(H1('1. The picture in one page'))
children.push(spacer())
children.push(kv([
  ['Product', 'SEO4AI. Tells a brand whether AI assistants recommend it, who beats it, and what to fix.'],
  ['Stack', 'Next.js, Supabase, OpenAI. Deployed on Coolify. Repo at C:\\codershive\\aurarank.'],
  ['Live at', 'seo4ai.bolddev.live, moving to seo4ai.app.'],
  ['Revenue today', 'None. Billing is in test mode.'],
  ['The hard date', 'Public launch 21 to 24 September 2026.'],
  ['The engine', 'One category leaderboard published every week.'],
  ['The moat', 'Public data everyone quotes. The index is the strategy; the dashboard is what people pay for afterwards.'],
  ['Parked until 25 Sept', 'DSA. Standalone web3 and AI gap research.'],
  ['Protected, not negotiable', 'Fitness. Sleep. Books, off the desk.'],
]))
children.push(spacer())
children.push(lead('The whole document reduces to one sentence: ', 'between now and 24 September, SEO4AI is the only thing with a deadline, and the weekly leaderboard is the only thing that must never be skipped.'))

/* ── 2. Current state ──────────────────────────────────────────────── */
children.push(H1('2. Where things actually stand'))

children.push(H2('What the product is'))
children.push(P('People used to Google "best CRM for startups". Now they ask ChatGPT, and it names three brands. If you are not one of them you are invisible, and you never see the lost traffic in analytics. SEO4AI measures that, names who is beating you, and gives the fixes.'))
children.push(P('The category has a name, GEO or AEO, and it is roughly where SEO was in 2004: real, growing, and almost nobody knows their own number.'))
children.push(spacer())
children.push(table([
  ['', 'Starter (free)', 'Pro ($9/mo)', 'Max ($29/mo)'],
  ['Brands', '1', '3', '10'],
  ['Scans per month', '3', '15', '60'],
  ['AI Visibility Score', 'Yes', 'Yes', 'Yes'],
  ['Competitor gap and history', 'No', 'Yes', 'Yes'],
  ['AI Fix Plan', 'No', 'No', 'Yes'],
  ['Boost generator and export', 'No', 'No', 'Yes'],
]))
children.push(spacer())
children.push(P('Free is the acquisition engine. Pro is the founder tier. Max is the agency tier and the real margin.'))

children.push(H2('What is genuinely built'))
children.push(P('Recorded so it is not rebuilt or re-doubted. Build, lint and 18 unit tests are green.', { color: MUTED, italics: true }))
children.push(bulletLead('Scoring honesty. ', 'Fake brands score 0 to 10, verified by tests. Unfamiliar-brand responses do not count as mentions. Brand-echo prompts are excluded. Score is 50% mention frequency, 30% position, 20% sentiment, capped at 15 with zero mentions.'))
children.push(bulletLead('Dashboard. ', 'Industry benchmark bar, AI response viewer, one-click Boost pack on Max, authentic-score warning, never-blank chart states.'))
children.push(bulletLead('Retention. ', 'Scheduled auto-scans and the weekly digest, competitor alerts at two or more mentions gained, progress-linked recommendations.'))
children.push(bulletLead('Platform. ', 'Server-side plan enforcement on every write route, Supabase RLS on every table, full Polar checkout to webhook to portal flow, public free scan rate-limited at three per IP per day.'))

children.push(H2('What is broken, and what it costs'))
children.push(P('The first three block Gate 2. Nothing here is a surprise; it is written down so it is not rediscovered mid-launch.', { color: DANGER }))
children.push(spacer())
children.push(table([
  ['', 'Gap', 'Consequence'],
  [BOX, 'Cron configured for Vercel, deployment is Coolify', 'Auto-scans and the weekly digest, both paid features, never fire'],
  [BOX, 'ANTHROPIC_API_KEY not set', 'Max sells three engines and delivers two'],
  [BOX, 'BILLING_TEST_MODE=true', 'No real payment can be taken'],
  [BOX, 'Category leaderboard pages do not exist', 'The weekly rhythm cannot start'],
  [BOX, 'index_entries empty in live Supabase', 'Index page and llms.txt render empty states. Run the seed import'],
  [BOX, 'Three blog posts dated January 2025', 'Stale-dated, and AI retrieval weights freshness'],
]))
children.push(spacer())
children.push(lead('The cron is the highest-leverage fix. ', 'It blocks Gate 2 and it silently breaks a promise already being sold on the pricing page. Do it before the leaderboard pages, even though the pages are the more visible work.'))

/* ── 3. The plan ───────────────────────────────────────────────────── */
children.push(H1('3. The plan: three gates, not one launch'))
children.push(P('This is the single most important choice in the document, and it rests on one fact:'))
children.push(quote('The most checkable claim about SEO4AI is our own AI visibility. If we launch loudly while ChatGPT does not recommend SEO4AI for "AI visibility tool", the first commenter will test it and post the screenshot.'))
children.push(P('New pages take two to four weeks to be indexed and start surfacing in AI retrieval. The content has to go out before the loud launch, not with it. That lag is the entire reason for the gap between Gate 1 and Gate 3.'))
children.push(spacer())
children.push(table([
  ['', 'Gate', 'Meaning', 'Date'],
  [BOX, '1. Publish', 'Data and content go public. No revenue, no announcement.', 'Week of 10 Aug'],
  [BOX, '2. Sell', 'Billing live, real money can be taken. Deliberately quiet.', 'By 31 Aug'],
  [BOX, '3. Launch', 'Product Hunt, Hacker News, directories, the loud push.', '21 to 24 Sept'],
]))
children.push(spacer())
children.push(H2('Why 21 to 24 September specifically'))
;[
  'Our own pages will have had five to six weeks to be indexed, so we can actually pass our own test.',
  'Five or six category leaderboards reads as a dataset rather than a demo.',
  'Real paying users mean the launch carries proof instead of promises.',
  'Mid-August is the worst B2B window of the year. Late September is one of the best: post-summer, pre-Q4 freeze.',
  'Product Hunt is a single shot. Spending it now, with no customers, wastes it.',
].forEach(t => children.push(bullet(t)))
children.push(lead('Gate 3 ships only if all three are true on 14 September: ', 'six leaderboards live, three or more paying customers, own score visibly moving. If not, slip a week. A weak launch is worse than a late one.'))
children.push(P('Gate 2 is never announced. Turn it on and let the free-scan users already asking convert.'))

/* ── 4. Week by week ───────────────────────────────────────────────── */
children.push(H1('4. Week by week to launch'))

children.push(H2('Week 1  ·  10 to 16 August  ·  Gate 1'))
children.push(lead('Today, before anything else: ', 'confirm we own seo4ai.app. Everything downstream has lead time: DNS, Resend verification, Search Console, Polar. This is the only true blocker on the critical path.'))
children.push(spacer())
children.push(table([
  ['', '#', 'Task', 'Owner', 'Time'],
  [BOX, '1', 'Point seo4ai.app at Coolify; set NEXT_PUBLIC_APP_URL; 301 the bolddev subdomain', 'Ankur', '1h'],
  [BOX, '2', 'Run supabase/add_index_sampling.sql; add ANTHROPIC_API_KEY', 'Ankur', '15m'],
  [BOX, '3', 'Verify seo4ai.app in Resend; switch EMAIL_FROM off bolddev', 'Ankur', '30m'],
  [BOX, '4', 'Submit sitemap to Google Search Console and Bing Webmaster Tools', 'Ankur', '30m'],
  [BOX, '5', 'Build category leaderboard pages /ai-visibility-index/[category]', 'Claude', 'n/a'],
  [BOX, '6', 'Fix the cron so it runs on Coolify', 'Both', 'n/a'],
  [BOX, '7', 'Scan seo4ai.app itself and publish the number, however bad', 'Both', '1h'],
]))
children.push(spacer())
children.push(P('Bing matters more than its market share suggests: it feeds Copilot, and it indexes new sites faster than Google.'))
children.push(lead('Item 7 is the single best long-term asset. ', 'Publish the embarrassing baseline now so the "same number, ninety days later" post is credible in November. That post only works if the first number is on the record.'))

children.push(H2('Weeks 2 to 6  ·  one category each'))
children.push(P('Order is highest-intent buyers first, so outreach converts while the audience is still small.'))
children.push(spacer())
children.push(table([
  ['', 'Week', 'Dates', 'Category', 'Also due'],
  [BOX, '2', '17 to 23 Aug', 'CRM', 'The rhythm starts'],
  [BOX, '3', '24 to 30 Aug', 'Project management', 'Gate 2 closes by Sun 31 Aug'],
  [BOX, '4', '31 Aug to 6 Sept', 'Email marketing', 'Cost check: 900 calls per category per week'],
  [BOX, '5', '7 to 13 Sept', 'Helpdesk', 'Mon 7 Sept: run the go / no-go'],
  [BOX, '6', '14 to 20 Sept', 'E-commerce platforms', 'Mon 14 Sept: launch or slip. Launch prep.'],
  [BOX, '7+', '21 to 24 Sept', 'Accounting, then keep going', 'Gate 3. Launch week.'],
]))
children.push(spacer())
children.push(P('Launch-day stack: Product Hunt, Hacker News as Show HN framed as the dataset rather than the product, r/SEO, Indie Hackers, BetaList, and four to five AI tool directories.'))
children.push(lead('Directories count double. ', 'They are exactly the third-party pages AI retrieval pulls from, so they are simultaneously distribution and ranking.'))

/* ── 5. The week ───────────────────────────────────────────────────── */
children.push(H1('5. The week, work and life on one calendar'))
children.push(P('Roughly six hours of go-to-market, evening sized. Build hours are the mornings. Training is fixed first and everything else fits around it, because ten-plus hours a week for three months on top of building runs on sleep and training.'))
children.push(spacer())
children.push(table([
  ['Day', 'Action', 'Time'],
  ['Monday', 'Pick the category. Scan 15 brands.', '1h + compute'],
  ['Tuesday', 'Publish /ai-visibility-index/[category].', '1h'],
  ['Wednesday', 'Leaderboard post on X. Tag the top three only.', '1h'],
  ['Thursday', 'Email the ten low scorers their own scorecard.', '2h'],
  ['Friday', 'One single-brand post. Reply to everything.', '1h'],
  ['Saturday', 'Deep work on SEO4AI. One thread, not three.', 'block'],
  ['Sunday', 'Re-scan seo4ai.app. Log the number.', '15m'],
]))
children.push(spacer())
children.push(lead('Never tag a brand to tell them they are invisible. ', 'Tag winners, describe losers. Winners amplify to their audience; losers send a DM. Tagging a loser gets you blocked and starts the wrong kind of thread.'))
children.push(lead('Always screenshot the result. ', 'Data reads as real, text reads as opinion. Always state the method in one line, "20 buyer questions, no brand names in the prompt", which preempts the accusation of cherry-picking.'))
children.push(H3('The three post shapes that work'))
children.push(bulletLead('The betrayal. ', 'A beloved brand losing to a boring one. Every engineer loves Linear; ChatGPT named Jira 11 times, Asana 11, Trello 11, Linear 5.'))
children.push(bulletLead('The zero. ', 'Highest engagement, use sparingly. Superhuman charges $30 a month and was mentioned 0 times out of 20.'))
children.push(bulletLead('The leaderboard. ', 'The weekly anchor. Twenty buyer questions, every brand counted, no brand names in the questions.'))
children.push(P('Twelve weeks of this produces twelve leaderboards, roughly 180 scanned brands, about 120 personalised cold emails, some 36 posts, and a dataset nobody else has.'))

/* ── 6. Money ──────────────────────────────────────────────────────── */
children.push(H1('6. Money, honestly'))
children.push(bulletLead('Cost per leaderboard. ', 'Fifteen brands times 20 prompts times 3 runs is 900 calls per category per week. Cheap on gpt-4o-mini, but check the real number after the first leaderboard rather than being surprised by it.'))
children.push(bulletLead('Near target. ', 'Three paying customers by 14 September. Not a revenue number, a permission-to-launch number.'))
children.push(bulletLead('Real target. ', 'One thousand paying customers at a $15 blended price is roughly $180k ARR. Achievable bootstrapped, and it needs only a sliver of the market.'))
children.push(bulletLead('Highest-leverage channel after launch. ', 'Agencies. One agency resells audits to its whole client base, so one partner brings many paying brands.'))
children.push(bulletLead('Paid ads come last. ', 'Nothing on ads until the free scan, the shareable cards and the teardowns have been given a real run.'))

/* ── 7. Go / no-go ─────────────────────────────────────────────────── */
children.push(H1('7. What tells us it is working'))
children.push(P('Check on Monday 7 September, before committing to the launch date. Fill the Actual column in ink.'))
children.push(spacer())
children.push(table([
  ['Signal', 'Healthy by week 4', 'Actual', 'If it is below'],
  ['Reply rate on cold scorecards', '8 to 15%', '', 'Wrong niche or subject line, not a product problem'],
  ['Free scans per week', '50+', '', 'Distribution problem, post more'],
  ['Free scan to signup', '15%+', '', 'The result is not scary or specific enough'],
  ['Signup to paid', '3%+', '', 'The paywall is in the wrong place'],
  ['Our own AI visibility score', 'Moving at all', '', 'Retrieval lag is real, do not panic before November'],
]))
children.push(spacer())
children.push(lead('The one genuinely worrying signal: ', 'a reply rate under 5% after 40 emails. That means the "your competitor beats you" message is not landing, and no amount of building fixes it. Change the niche, not the code.'))
children.push(H3('Sunday log, our own score'))
children.push(P('The November post depends on this column being unbroken.'))
children.push(spacer())
children.push(table([
  ['Date', '16 Aug', '23 Aug', '30 Aug', '6 Sept', '13 Sept', '20 Sept'],
  ['Score', '', '', '', '', '', ''],
]))

/* ── 8. Future ─────────────────────────────────────────────────────── */
children.push(H1('8. After 24 September'))
children.push(P('Written now, while the thinking is cheap, so October is not spent deciding.'))
children.push(bulletLead('The rhythm does not stop at launch. ', 'It runs to twelve leaderboards, which lands in early November. Launch is a spike; the index is the compounding asset, and stopping the week after Product Hunt would waste the only durable advantage.'))
children.push(bulletLead('The November post. ', '"Our own AI visibility score, ninety days later." This is the single highest-value piece of content available, and its entire credibility comes from the baseline published in week 1. Guard the Sunday log.'))
children.push(bulletLead('DSA unparks on 25 September, ', 'with a date attached. A contest or booked interviews. Without a forcing function it will lose again, and that is predictable rather than disappointing.'))
children.push(bulletLead('Web3 and AI gap research unparks, ', 'fed by the dataset rather than by browsing. By November there are roughly 180 brands of proprietary evidence about where AI retrieval is broken per category. That is a far better source of the next idea than a reading session, and nobody else has it.'))
children.push(bulletLead('Agency channel opens. ', 'It is the highest-leverage revenue move and it needs the public dataset to exist first, which is why it is a post-launch item and not a distraction now.'))
children.push(bulletLead('The next product decision waits for data. ', 'Not before the go / no-go. If the 7 September numbers say the niche is wrong, the answer is a different niche, not a different product.'))

/* ── 9. Everything else ────────────────────────────────────────────── */
children.push(H1('9. Everything running alongside'))
children.push(P('Five parallel tracks with one deadline meant the other four ate the same undefended evening. This section is the fix, and it is a decision rather than a wish.', { color: MUTED, italics: true }))

children.push(H2('Parked until 25 September'))
children.push(bulletLead('DSA. ', 'It is the only item with no forcing function, so it loses to everything with a deadline. That is correct prioritisation, not failure. Half-doing it was the one activity generating guilt without output, which is why it dominated how the whole picture felt despite being the smallest piece. Parked means parked: no guilt tax.'))
children.push(bulletLead('Standalone web3 and AI gap research. ', 'Parked as a separate block only. The weekly rhythm already is gap research, and it produces evidence instead of opinions.'))

children.push(H2('Inputs, not competitors. These are never cut.'))
children.push(bulletLead('Fitness. ', 'Fixed and untouchable, scheduled first. Never schedule it against work; work always wins that fight, and then work degrades too. It is the input to the ten-hour weeks, not a competitor for them.'))
children.push(bulletLead('Sleep. ', 'Same argument, less negotiable. The plan fails from skipped weeks, and skipped weeks come from burnout far more often than from bad strategy.'))
children.push(bulletLead('Books. ', 'Off the desk. Commute and before bed only, so they never compete with build hours and never need to be scheduled.'))

children.push(H2('Becoming a good programmer'))
children.push(P('Served inside the product rather than beside it. The scan pipeline is 900 calls per category per week: real concurrency, rate limiting, retries, backoff, cost control, caching so re-scans are cheap, brand-alias dedup, and top-k ranking with ties. Code that costs money when it is bad teaches faster than code that costs a green checkmark. Saturday deep work is where this happens, and it counts as both product progress and craft.'))

/* ── 10. Risks ─────────────────────────────────────────────────────── */
children.push(H1('10. Honest read on the risks'))
children.push(bulletLead('Effort is the real risk. ', 'Ten-plus hours a week, every week, for three months, on top of building. The plan fails from skipped weeks far more often than from bad strategy. If only half is possible, keep the leaderboard and the emails and drop the single-brand posts.'))
children.push(bulletLead('Cost. ', 'Multi-run sampling made scans three times more expensive. Check it after the first leaderboard.'))
children.push(bulletLead('The category is filling up. ', 'Profound, Peec and Otterly are funded and building. We will not win on features. We win by being the one with public data that everyone quotes.'))
children.push(bulletLead('Selling a promise that does not fire. ', 'The Coolify cron is the sharp edge here. Auto-scans and the weekly digest are advertised on the paid tiers. Taking money before that works is the exact failure the pre-launch document was written to prevent.'))

/* ── 11. Now ───────────────────────────────────────────────────────── */
children.push(H1('11. The immediate next action'))
children.push(P('Confirm ownership of seo4ai.app. Everything else waits on it.', { bold: true, size: 26 }))
children.push(P('In parallel: fix the Coolify cron, because it blocks Gate 2 and breaks a paid promise, then build the category leaderboard pages, because week two cannot begin without them.'))
children.push(rule())
children.push(P('Deliberately not in this document: the full feature inventory, deployment runbook and SQL migration order, which live in PRODUCTION_READINESS.md; market sizing and buyer personas, in SEO4AI_PRODUCT_GTM.md; QA cases, in QA_TEST_CASES.md. They are reference material. Nothing in them changes what happens this week.', { color: MUTED, italics: true, size: 20 }))

/* ── Assemble ──────────────────────────────────────────────────────── */
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children,
  }],
})

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, '..', 'SEO4AI_Operating_Doc.docx')
  fs.writeFileSync(out, buf)
  console.log('Wrote', out, '(' + buf.length + ' bytes)')
})
