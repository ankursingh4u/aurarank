// Generates SEO4AI_Weekly_Tracker.docx, the tickable companion to the launch
// plan. Mirrors the styling of gen-launch-plan-doc.js so the set reads as one.
// Source of truth for the content is WEEKLY.md.
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
} = require('docx')

const ACCENT = '4F46E5'
const MUTED = '64748B'
const DANGER = 'B91C1C'
const BOX = '☐' // ☐

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, bold: true, color: ACCENT })] })
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
// A checkable line: ☐ followed by the task.
const check = (t, opts = {}) => new Paragraph({
  spacing: { after: 60 },
  indent: { left: 200 },
  children: [new TextRun({ text: BOX + '  ', size: 26 }), new TextRun({ text: t, ...opts })],
})

function cell(text, { header = false, align, bold = false } = {}) {
  return new TableCell({
    shading: header ? { fill: ACCENT } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(text), bold: bold || header, color: header ? 'FFFFFF' : undefined, size: 20 })] })],
  })
}
function table(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c) => cell(c, { header: i === 0, align: AlignmentType.LEFT })),
    })),
  })
}
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] })

const children = []

/* ── Title ─────────────────────────────────────────────────────────── */
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'SEO4AI', bold: true, size: 56, color: ACCENT })] }))
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Weekly Tracker', size: 30, color: MUTED })] }))
children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Companion to the Execution & Public Launch Plan  ·  Monday 10 August to Thursday 24 September 2026', italics: true, color: MUTED })] }))

children.push(P('The launch plan is the strategy. This is the thing you actually tick off. Six weeks, one page per gate, and an explicit list of what is not being done.'))

/* ── 0. The one rule ───────────────────────────────────────────────── */
children.push(H1('0. The one rule'))
children.push(lead('Between now and 24 September, SEO4AI is the only thing with a deadline. ', 'Everything else is either an input (fitness, sleep), a background process (books), or explicitly parked. The launch plan already gives the reason:'))
children.push(quote('The plan fails from skipped weeks far more often than from bad strategy.'))
children.push(P('A skipped week costs a leaderboard, which costs a launch criterion. A skipped DSA session costs nothing measurable. Weight them accordingly and stop feeling equally bad about both.'))

/* ── 1. Gates ──────────────────────────────────────────────────────── */
children.push(H1('1. Gates'))
children.push(spacer())
children.push(table([
  ['', 'Gate', 'Meaning', 'Date'],
  [BOX, '1. Publish', 'Data and content public. No revenue, no announcement.', 'Week of 10 Aug'],
  [BOX, '2. Sell', 'Billing live, real money can be taken. Quiet.', 'By 31 Aug'],
  [BOX, '3. Launch', 'Product Hunt, Hacker News, directories, the loud push.', '21 to 24 Sept'],
]))
children.push(spacer())
children.push(lead('Gate 3 ships only if all three are true on 14 September: ', 'six category leaderboards live, three or more paying customers, and our own visibility score visibly moving. If not, slip a week. A weak launch is worse than a late one.'))

/* ── 2. The rhythm ─────────────────────────────────────────────────── */
children.push(H1('2. The weekly rhythm'))
children.push(P('Roughly six hours of go-to-market, evening sized. Build hours are the mornings. This is the engine; protect it above everything else.'))
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
children.push(lead('Never tag a brand to tell them they are invisible. ', 'Tag winners, describe losers. Winners amplify to their audience; losers send a DM.'))
children.push(lead('Always screenshot the result, ', 'and always state the method in one line, "20 buyer questions, no brand names in the prompt", which preempts the accusation of cherry-picking.'))

/* ── 3. Week by week ───────────────────────────────────────────────── */
children.push(H1('3. Week by week'))

children.push(H2('Week 1  ·  10 to 16 August  ·  Gate 1: Publish'))
children.push(lead('Today, before anything else: ', 'confirm we own seo4ai.app. Everything downstream has lead time: DNS propagation, Resend verification, Search Console, Polar. If it is not registered, register it within the hour. This is the only true blocker on the critical path.'))
children.push(spacer())
children.push(table([
  ['', '#', 'Task', 'Owner', 'Time'],
  [BOX, '1', 'Point seo4ai.app at Coolify; set NEXT_PUBLIC_APP_URL=https://seo4ai.app; 301 the bolddev subdomain', 'Ankur', '1h'],
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

children.push(H2('Week 2  ·  17 to 23 August  ·  CRM'))
children.push(check('Leaderboard 1 published. The rhythm starts.'))

children.push(H2('Week 3  ·  24 to 30 August  ·  Project management'))
children.push(check('Leaderboard 2 published.'))
children.push(check('Gate 2 closes by Sunday 31 August. See section 4.', { bold: true }))

children.push(H2('Week 4  ·  31 August to 6 September  ·  Email marketing'))
children.push(check('Leaderboard 3 published.'))
children.push(check('Cost check after the first leaderboard: 15 brands x 20 prompts x 3 runs is 900 calls per category per week.'))

children.push(H2('Week 5  ·  7 to 13 September  ·  Helpdesk'))
children.push(check('Leaderboard 4 published.'))
children.push(check('Monday 7 September: run the go / no-go in section 5.', { bold: true }))

children.push(H2('Week 6  ·  14 to 20 September  ·  E-commerce platforms'))
children.push(check('Leaderboard 5 published.'))
children.push(check('Monday 14 September: launch or slip decision.', { bold: true }))
children.push(check('Launch prep: Product Hunt assets, Show HN draft framed as the dataset rather than the product, four to five AI tool directory submissions.'))

children.push(H2('Launch week  ·  21 to 24 September  ·  Gate 3'))
children.push(P('Product Hunt, Hacker News, r/SEO, Indie Hackers, BetaList, directories.'))
children.push(P('Directories count double for us: they are exactly the third-party pages AI retrieval pulls from, so they are simultaneously distribution and ranking.'))

children.push(H2('Week 7 onward  ·  Accounting, then keep going.'))

/* ── 4. Gate 2 blockers ────────────────────────────────────────────── */
children.push(H1('4. Gate 2 blockers'))
children.push(P('Three things must be true before a single rupee is taken honestly. All three are open as of 10 August.', { color: DANGER }))
children.push(spacer())
children.push(table([
  ['', 'Blocker', 'Impact'],
  [BOX, 'BILLING_TEST_MODE=false, production Polar webhook secret set, one real end-to-end purchase on our own card', 'No real payment can be taken'],
  [BOX, 'Cron actually fires on Coolify (configured for Vercel today)', 'Auto-scans and the weekly digest are a paid-tier promise; selling Pro while that is dead is exactly what the pre-launch document was written to prevent'],
  [BOX, 'ANTHROPIC_API_KEY set, or the Max feature list stops claiming Claude', 'Max sells three engines and delivers two'],
]))
children.push(spacer())
children.push(lead('Do not announce Gate 2. ', 'Turn it on and let the free-scan users who are already asking convert.'))
children.push(H3('Other known gaps as of 10 August'))
children.push(spacer())
children.push(table([
  ['', 'Gap', 'Status'],
  [BOX, 'Three blog posts dated January 2025', 'Stale-dated; AI retrieval weights freshness'],
  [BOX, 'index_entries empty in live Supabase', 'Index page and llms.txt render empty states. Run the seed import'],
  [BOX, 'Category leaderboard pages do not exist', 'The weekly rhythm cannot start without them'],
]))

/* ── 5. Go / no-go ─────────────────────────────────────────────────── */
children.push(H1('5. Go / no-go, checked Monday 7 September'))
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

/* ── 6. Parked ─────────────────────────────────────────────────────── */
children.push(H1('6. Parked until 24 September, deliberately'))
children.push(P('Written down so it reads as a decision instead of slippage.', { color: MUTED, italics: true }))
children.push(bulletLead('DSA and LeetCode. ', 'Parked. It is the only item with no forcing function, so it loses to everything with a deadline, and that is correct prioritisation rather than failure. It restarts on 25 September with a date attached, a contest or booked interviews, or not at all. Half-doing it was generating guilt without output.'))
children.push(bulletLead('Standalone web3 and AI gap research. ', 'Parked as a separate block, because the weekly rhythm already is one. Twelve weeks produces roughly 180 brands of proprietary data on where AI retrieval is broken per category. The next idea comes out of that dataset, not out of a browsing session.'))
children.push(H2('Not parked. These are inputs, not competitors.'))
children.push(bulletLead('Fitness. ', 'Fixed and untouchable. Ten-plus hours a week for three months on top of building runs on sleep and training. Never schedule it against work; work always wins that fight, and then work degrades too.'))
children.push(bulletLead('Books. ', 'Off the desk. Commute and before bed only, so they never compete with build hours.'))
children.push(bulletLead('Becoming a good programmer. ', 'Served by the pipeline, not beside it. Nine hundred calls per category per week is a real concurrency, rate-limiting, retry and cost-control problem; mention counting across runs is real aggregation, dedup and top-k. Code that costs money when it is bad teaches faster than code that costs a green checkmark.'))

/* ── 7. Log ────────────────────────────────────────────────────────── */
children.push(H1('7. Log: our own AI visibility score'))
children.push(P('The November post depends on this column being unbroken. Fifteen minutes, every Sunday.'))
children.push(spacer())
children.push(table([
  ['Date', 'Score', 'Note'],
  ['16 Aug', '', 'baseline'],
  ['23 Aug', '', ''],
  ['30 Aug', '', ''],
  ['6 Sept', '', ''],
  ['13 Sept', '', ''],
  ['20 Sept', '', ''],
]))

/* ── Assemble ──────────────────────────────────────────────────────── */
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children,
  }],
})

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, '..', 'SEO4AI_Weekly_Tracker.docx')
  fs.writeFileSync(out, buf)
  console.log('Wrote', out, '(' + buf.length + ' bytes)')
})
