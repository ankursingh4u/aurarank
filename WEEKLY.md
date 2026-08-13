# SEO4AI — Weekly Tracker

**Companion to:** `SEO4AI_Launch_Plan.docx` (the strategy) · this file is the thing you actually tick off.
**Window:** Mon 10 Aug 2026 → Thu 24 Sept 2026 · **6 weeks**

---

## 0. The one rule

Between now and 24 September, **SEO4AI is the only thing with a deadline.** Everything else is either an input (fitness, sleep), a background process (books), or explicitly parked (see §6).

The launch plan's own risk section is the reason:

> *The plan fails from skipped weeks far more often than from bad strategy.*

A skipped week costs a leaderboard, which costs a launch criterion. A skipped DSA session costs nothing measurable. Weight them accordingly and stop feeling equally bad about both.

---

## 1. Gates

| Gate | Meaning | Date | Status |
|---|---|---|---|
| 1. Publish | Data and content public. No revenue, no announcement. | week of 10 Aug | ☐ |
| 2. Sell | Billing live, real money can be taken. Quiet. | by 31 Aug | ☐ |
| 3. Launch | Product Hunt, HN, directories, the loud push. | 21–24 Sept | ☐ |

**Gate 3 ships only if all three are true on 14 Sept:** 6 category leaderboards live · 3+ paying customers · own AI visibility score visibly moving. If not — **slip a week.** A weak launch is worse than a late one.

---

## 2. The weekly rhythm

~6h of GTM, evening-sized. Build hours are mornings. This is the engine — protect it above all else.

| Day | Action | Time |
|---|---|---|
| Mon | Pick the category. Scan 15 brands. | 1h + compute |
| Tue | Publish `/ai-visibility-index/[category]`. | 1h |
| Wed | Leaderboard post on X. **Tag the top three only.** | 1h |
| Thu | Email the ten low scorers their own scorecard. | 2h |
| Fri | One single-brand post. Reply to everything. | 1h |
| **Sat** | **Deep work on SEO4AI.** One thread, not three. | block |
| Sun | Re-scan seo4ai.app. Log the number. | 15m |

**Never tag a brand to tell them they are invisible.** Tag winners, describe losers. Winners amplify; losers DM.

**Always screenshot the result** and always state the method in one line — *"20 buyer questions, no brand names in the prompt"* — which preempts the cherry-picking accusation.

---

## 3. Week by week

### Week 1 · 10–16 Aug — Gate 1: Publish

**Today, before anything else:** confirm we own `seo4ai.app`. Everything downstream has lead time — DNS, Resend verification, Search Console, Polar. If it is not registered, register it within the hour. **This is the only true blocker on the critical path.**

| # | Task | Owner | Time | ☐ |
|---|---|---|---|---|
| 1 | Point seo4ai.app at Coolify; set `NEXT_PUBLIC_APP_URL=https://seo4ai.app`; 301 the bolddev subdomain | Ankur | 1h | ☐ |
| 2 | Run `supabase/add_index_sampling.sql`; add `ANTHROPIC_API_KEY` | Ankur | 15m | ☐ |
| 3 | Verify seo4ai.app in Resend; switch `EMAIL_FROM` off bolddev | Ankur | 30m | ☐ |
| 4 | Submit sitemap to Google Search Console **and Bing Webmaster Tools** | Ankur | 30m | ☐ |
| 5 | Build category leaderboard pages `/ai-visibility-index/[category]` | Claude | — | ☐ |
| 6 | Fix the cron so it runs on Coolify | Both | — | ☐ |
| 7 | Scan seo4ai.app itself and publish the number, however bad | Both | 1h | ☐ |

Bing matters more than its market share suggests: it feeds Copilot and indexes new sites faster than Google.

Item 7 is the single best long-term asset. **Publish the embarrassing baseline now** so the "same number, ninety days later" post is credible in November. That post only works if the first number is on the record.

### Week 2 · 17–23 Aug — **CRM**
Rhythm starts. Leaderboard #1. ☐

### Week 3 · 24–30 Aug — **Project management**
Leaderboard #2. ☐ · **Gate 2 must close by Sunday 31 Aug** — see §4.

### Week 4 · 31 Aug–6 Sept — **Email marketing**
Leaderboard #3. ☐ · Cost check after the first leaderboard: 15 × 20 × 3 = **900 calls per category per week.** ☐

### Week 5 · 7–13 Sept — **Helpdesk**
Leaderboard #4. ☐ · **Mon 7 Sept: run the go/no-go in §5.** ☐

### Week 6 · 14–20 Sept — **E-commerce platforms**
Leaderboard #5. ☐ · **Mon 14 Sept: launch-or-slip decision.** ☐
Launch prep: Product Hunt assets, Show HN draft (framed as *the dataset*, not the product), 4–5 AI tool directory submissions. ☐

### Launch week · 21–24 Sept — Gate 3
Product Hunt · Hacker News · r/SEO · Indie Hackers · BetaList · directories.

Directories count double: they are exactly the third-party pages AI retrieval pulls from, so they are simultaneously distribution *and* ranking.

### Week 7+ — **Accounting**, then keep going.

---

## 4. Gate 2 blockers

Three things must be true before a single rupee is taken honestly. All three are open as of 10 Aug.

| Blocker | Impact | ☐ |
|---|---|---|
| `BILLING_TEST_MODE=false`, production Polar webhook secret set, one real end-to-end purchase on our own card | No real payment can be taken | ☐ |
| Cron actually fires on Coolify (configured for Vercel today) | Auto-scans + weekly digest are a **paid-tier promise**; selling Pro while that is dead is exactly what the pre-launch doc was written to prevent | ☐ |
| `ANTHROPIC_API_KEY` set — or the Max feature list stops claiming Claude | Max sells three engines, delivers two | ☐ |

**Do not announce Gate 2.** Turn it on and let the free-scan users who are already asking convert.

### Other known gaps (10 Aug)

| Gap | Status | ☐ |
|---|---|---|
| Three blog posts dated January 2025 | Stale-dated; AI retrieval weights freshness | ☐ |
| `index_entries` empty in live Supabase | Index page and llms.txt render empty states — run the seed import | ☐ |
| Category leaderboard pages do not exist | The weekly rhythm cannot start without them | ☐ |

---

## 5. Go/no-go — check Mon 7 Sept

| Signal | Healthy by wk 4 | Actual | If below |
|---|---|---|---|
| Reply rate on cold scorecards | 8–15% | | Wrong niche or subject line — **not** a product problem |
| Free scans per week | 50+ | | Distribution problem, post more |
| Free scan → signup | 15%+ | | The result is not scary or specific enough |
| Signup → paid | 3%+ | | The paywall is in the wrong place |
| Our own AI visibility score | moving at all | | Retrieval lag is real — do not panic before November |

**The one genuinely worrying signal:** reply rate under 5% after 40 emails. That means the "your competitor beats you" message is not landing, and no amount of building fixes it. **Change the niche, not the code.**

---

## 6. Parked until 24 Sept — deliberately, not by accident

Written down so it reads as a decision instead of slippage.

- **DSA / LeetCode.** Parked. It is the only item with no forcing function, so it loses to everything with a deadline — that is correct prioritisation, not failure. It restarts on 25 Sept *with a date attached* (a contest or booked interviews), or not at all. Half-doing it is what was generating guilt without output.
- **Separate web3 + AI gap research.** Parked as a standalone block, because the weekly rhythm already is one. Twelve weeks produces ~180 brands of proprietary data on where AI retrieval is broken per category. The next idea comes out of that dataset, not out of a browsing session.

### Not parked — these are inputs, not competitors

- **Fitness.** Fixed and untouchable. Ten-plus hours a week for three months on top of building runs on sleep and training. Never schedule it *against* work — work always wins that fight, and then work degrades too.
- **Books.** Off the desk. Commute and before bed only, so they never compete with build hours.
- **"Becoming a good programmer."** Served by the pipeline, not beside it. 900 calls/category/week is a real concurrency, rate-limiting, retry and cost-control problem; mention counting across runs is real aggregation, dedup and top-k. Code that costs money when it is bad teaches faster than code that costs a green checkmark.

---

## 7. Log — own AI visibility score

The November post depends on this column being unbroken. 15 minutes, every Sunday.

| Date | Score | Note |
|---|---|---|
| 16 Aug | | baseline |
| 23 Aug | | |
| 30 Aug | | |
| 6 Sept | | |
| 13 Sept | | |
| 20 Sept | | |
