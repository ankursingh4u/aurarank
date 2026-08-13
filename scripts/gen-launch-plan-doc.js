// Generates SEO4AI_Launch_Plan.docx, the practical execution plan and public
// launch timing. Mirrors the styling of gen-gtm-doc.js so the two documents read
// as one set.
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
} = require('docx')

const ACCENT = '4F46E5'
const MUTED = '64748B'
const DANGER = 'B91C1C'

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: t, bold: true, color: ACCENT })] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 }, children: [new TextRun({ text: t, bold: true })] })
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t, ...opts })] })
const lead = (label, rest) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: label, bold: true }), new TextRun({ text: rest })] })
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text: t })] })
const quote = (t) => new Paragraph({
  spacing: { before: 120, after: 140 },
  indent: { left: 360 },
  children: [new TextRun({ text: t, italics: true, color: ACCENT })],
})

function cell(text, { header = false, align, bold = false } = {}) {
  return new TableCell({
    shading: header ? { fill: ACCENT } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(text), bold: bold || header, color: header ? 'FFFFFF' : undefined, size: 20 })] })],
  })
}
function table(rows, { firstColLeft = true } = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c, j) => cell(c, {
        header: i === 0,
        align: j === 0 && firstColLeft ? AlignmentType.LEFT : AlignmentType.LEFT,
      })),
    })),
  })
}
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] })

const children = []

/* ── Title ─────────────────────────────────────────────────────────── */
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'SEO4AI', bold: true, size: 56, color: ACCENT })] }))
children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Execution & Public Launch Plan', size: 30, color: MUTED })] }))
children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Prepared Monday 10 August 2026  ·  Target public launch: 21 to 24 September 2026', italics: true, color: MUTED })] }))

children.push(P('This plan covers two things: how SEO4AI gets recommended by AI assistants itself, and when to take the product public. The two are the same problem. The proof that the product works is the product working on us.'))

/* ── 1. Timing decision ────────────────────────────────────────────── */
children.push(H1('1. The core timing decision'))
children.push(P('Do not launch as one event. Split it into three gates that unlock separately. This matters more than any other choice in this document, for one reason:'))
children.push(quote('The most checkable claim about SEO4AI is our own AI visibility. If we launch loudly while ChatGPT does not recommend SEO4AI for "AI visibility tool", the first commenter will test it and post the screenshot.'))
children.push(P('New pages take two to four weeks to be indexed and start surfacing in AI retrieval. The content therefore has to go out before the loud launch, not with it. That lag is the entire reason for the gap between Gate 1 and Gate 3.'))
children.push(spacer())
children.push(table([
  ['Gate', 'What it means', 'Date'],
  ['1. Publish', 'Data and content go public. No revenue, no announcement.', 'Week of 10 Aug'],
  ['2. Sell', 'Billing live, real money can be taken. Deliberately quiet.', 'By 31 Aug'],
  ['3. Launch', 'Product Hunt, directories, the loud public push.', '21 to 24 Sept'],
]))
children.push(spacer())
children.push(H2('Why 21 to 24 September for the loud launch'))
;[
  'Our own pages will have had five to six weeks to be indexed and cited, so we can actually pass our own test.',
  'We will have five or six category leaderboards, which reads as a dataset rather than a demo.',
  'We will have real paying users, so the launch carries proof instead of promises.',
  'Mid-August is the worst B2B window of the year; buyers are away. Late September is one of the best: post-summer, pre-Q4 freeze.',
  'Product Hunt is a single shot. Spending it now, with ten SaaS companies in the index and no customers, wastes it.',
].forEach(t => children.push(bullet(t)))

/* ── 2. Gate 1 ─────────────────────────────────────────────────────── */
children.push(H1('2. Gate 1: Publish (week of 10 August)'))
children.push(lead('Today, before anything else: ', 'confirm we own seo4ai.app. Everything downstream has lead time: DNS propagation, Resend domain verification, Search Console verification, Polar configuration. If it is not registered, register it within the hour. This is the only true blocker on the critical path.'))
children.push(spacer())
children.push(table([
  ['#', 'Task', 'Owner', 'Time'],
  ['1', 'Point seo4ai.app at Coolify; set NEXT_PUBLIC_APP_URL=https://seo4ai.app; 301 the bolddev subdomain', 'Ankur', '1h'],
  ['2', 'Run supabase/add_index_sampling.sql; add ANTHROPIC_API_KEY', 'Ankur', '15m'],
  ['3', 'Verify seo4ai.app in Resend; switch EMAIL_FROM off bolddev', 'Ankur', '30m'],
  ['4', 'Submit sitemap to Google Search Console and Bing Webmaster Tools', 'Ankur', '30m'],
  ['5', 'Build category leaderboard pages /ai-visibility-index/[category]', 'Claude', 'n/a'],
  ['6', 'Fix the cron so it runs on Coolify', 'Both', 'n/a'],
  ['7', 'Scan seo4ai.app itself and publish the number, however bad', 'Both', '1h'],
]))
children.push(spacer())
children.push(P('Bing matters more than its market share suggests: it feeds Copilot, and it indexes new sites faster than Google.'))
children.push(lead('Item 7 is the single best long-term asset. ', 'Publish the embarrassing baseline now so that the "same number, ninety days later" post is credible in November. That post only works if the first number is on the record.'))

/* ── 3. Gate 2 ─────────────────────────────────────────────────────── */
children.push(H1('3. Gate 2: Sell (by 31 August)'))
children.push(P('Three things must be true before a single rupee can be taken honestly:'))
;[
  'BILLING_TEST_MODE=false, with the production Polar webhook secret set, and one real end-to-end purchase tested on our own card.',
  'Cron actually fires on Coolify. Auto-scans and the weekly digest are a paid-tier promise; selling Pro while that is dead is exactly what the pre-launch document was written to prevent.',
  'ANTHROPIC_API_KEY is set, or the Max feature list stops claiming Claude.',
].forEach(t => children.push(bullet(t)))
children.push(P('Do not announce Gate 2. Turn it on and let the free-scan users who are already asking convert.'))

/* ── 4. Gate 3 ─────────────────────────────────────────────────────── */
children.push(H1('4. Gate 3: Launch (21 to 24 September)'))
children.push(lead('Ship only when all three are true: ', 'six category leaderboards live, three or more paying customers, and our own AI visibility score visibly moving. If those are not true on 14 September, slip a week. A weak launch is worse than a late one.'))
children.push(P('Launch-day stack: Product Hunt, Hacker News (Show HN, framed as the dataset rather than the product), r/SEO, Indie Hackers, BetaList, and four to five AI tool directories.'))
children.push(P('Directories count double for us: they are exactly the third-party pages AI retrieval pulls from, so they are simultaneously distribution and ranking.'))

/* ── 5. Weekly rhythm ──────────────────────────────────────────────── */
children.push(H1('5. The weekly rhythm: the actual engine'))
children.push(P('Every week from week two onward, the same loop. Roughly eight to ten hours.'))
children.push(spacer())
children.push(table([
  ['Day', 'Action', 'Time'],
  ['Monday', 'Pick the category. Scan 15 brands.', '1h + compute'],
  ['Tuesday', 'Publish /ai-visibility-index/[category].', '1h'],
  ['Wednesday', 'Leaderboard post on X. Tag the top three only.', '1h'],
  ['Thursday', 'Email the ten low scorers their own scorecard.', '2h'],
  ['Friday', 'One single-brand post. Reply to everything.', '1h'],
  ['Sunday', 'Re-scan seo4ai.app. Log the number.', '15m'],
]))
children.push(spacer())
children.push(P('Twelve weeks of this produces twelve leaderboards, roughly 180 scanned brands, about 120 personalised cold emails, some 36 posts, and a dataset nobody else has.'))
children.push(lead('Category order (highest-intent buyers first, so outreach converts while the audience is still small): ', 'CRM, then project management, email marketing, helpdesk, e-commerce platforms, accounting.'))
children.push(lead('Never tag a brand to tell them they are invisible. ', 'Tag winners, describe losers. Winners amplify to their audience; losers send a DM. Tagging a loser gets you blocked and starts the wrong kind of thread.'))

/* ── 6. X content ──────────────────────────────────────────────────── */
children.push(H1('6. X content formulas'))
children.push(P('Always screenshot the result: data reads as real, text reads as opinion. Always state the method in one line, "20 buyer questions, no brand names in the prompt", which preempts the accusation of cherry-picking.'))
children.push(H2('The betrayal: a beloved brand losing to a boring one'))
children.push(P('Every engineer on this app loves Linear. I asked ChatGPT 20 buying questions about issue tracking. Jira: 11 mentions. Asana: 11. Trello: 11. Linear: 5. Your users love you. The AI recommending you does not know that.', { italics: true }))
children.push(H2('The zero: highest engagement, use sparingly'))
children.push(P('Superhuman charges $30/month. ChatGPT mentioned it 0 times out of 20 when asked about email clients. It recommended Outlook 11 times.', { italics: true }))
children.push(H2('The leaderboard: the weekly anchor'))
children.push(P('I asked ChatGPT the 20 questions buyers ask about [category]. Counted every brand it named. No brand names in the questions. Here is who AI actually recommends.', { italics: true }))

/* ── 7. Metrics ────────────────────────────────────────────────────── */
children.push(H1('7. What tells us it is working'))
children.push(P('Check these on 7 September, at the end of week four, before committing to the launch date.'))
children.push(spacer())
children.push(table([
  ['Signal', 'Healthy by week 4', 'If it is below'],
  ['Reply rate on cold scorecards', '8 to 15%', 'Wrong niche or wrong subject line, not a product problem'],
  ['Free scans per week', '50+', 'Distribution problem, post more'],
  ['Free scan to signup', '15%+', 'The result is not scary or specific enough'],
  ['Signup to paid', '3%+', 'The paywall is in the wrong place'],
  ['Our own AI visibility score', 'Moving at all', 'Expected: retrieval lag is real, do not panic before November'],
]))
children.push(spacer())
children.push(lead('The one genuinely worrying signal: ', 'a reply rate under 5% after 40 emails. That means the "your competitor beats you" message is not landing, and no amount of building fixes it. Change the niche, not the code.'))

/* ── 8. Risks ──────────────────────────────────────────────────────── */
children.push(H1('8. Honest read on the risks'))
children.push(lead('Effort. ', 'This is ten-plus hours a week, every week, for three months, on top of building. The plan fails from skipped weeks far more often than from bad strategy. If only half is possible, keep the leaderboard and the emails and drop the single-brand posts.'))
children.push(lead('Cost. ', 'Multi-run sampling made scans three times more expensive. Fifteen brands x 20 prompts x 3 runs is 900 calls per category per week. Cheap on gpt-4o-mini, but check it after the first leaderboard rather than being surprised.'))
children.push(lead('The category is filling up. ', 'Profound, Peec and Otterly are funded and building. We will not win on features. We win by being the one with public data that everyone quotes, which is why the index is the strategy and the dashboard is what people pay for afterwards.'))

/* ── 9. Known gaps ─────────────────────────────────────────────────── */
children.push(H1('9. Known gaps in the product as of 10 August'))
children.push(P('Recorded here so they are not rediscovered mid-launch.', { color: MUTED, italics: true }))
children.push(spacer())
children.push(table([
  ['Gap', 'Impact', 'Status'],
  ['Cron configured for Vercel; deployment is Coolify', 'Auto-scans and the weekly digest, both paid features, never fire', 'Blocks Gate 2'],
  ['ANTHROPIC_API_KEY not set', 'Max sells three engines and delivers two', 'Blocks Gate 2'],
  ['BILLING_TEST_MODE=true', 'No real payment can be taken', 'Blocks Gate 2'],
  ['Three blog posts dated January 2025', 'Stale-dated content; AI retrieval weights freshness', 'Content refresh needed'],
  ['index_entries empty in live Supabase', 'Index page and llms.txt render empty states', 'Run the seed import'],
  ['Category leaderboard pages do not exist yet', 'The weekly rhythm cannot start', 'Being built'],
]))

/* ── 10. Next action ───────────────────────────────────────────────── */
children.push(H1('10. The immediate next action'))
children.push(P('Confirm ownership of seo4ai.app. Everything else waits on it.', { bold: true }))
children.push(P('In parallel: build the category leaderboard pages, since week two cannot begin without them, and fix the Coolify cron.'))

/* ── Assemble ──────────────────────────────────────────────────────── */
const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children,
  }],
})

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, '..', 'SEO4AI_Launch_Plan.docx')
  fs.writeFileSync(out, buf)
  console.log('Wrote', out, '(' + buf.length + ' bytes)')
})
