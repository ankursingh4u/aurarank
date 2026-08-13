# SEO4AI: five stages

Written 10 August 2026. Stage 1 is complete. Public launch is Stage 3, tomorrow.

**What "launch" means here:** ship the working product publicly, switch the free scan to grounded, publish our own honest baseline, and start posting scan results. It does not mean Product Hunt. PH is one shot and belongs in Stage 5, once there are leaderboards and paying customers to point at.

---

## Stage 1: the engine. DONE, 10 August

The blocker. Every scan previously asked the models with no web access, so it measured training weights: the one channel a customer cannot move. A customer could do all the recommended work, re-scan, and see the same number.

**Shipped:**

- Grounded scanning across OpenAI, Gemini and Claude, with the source domains each engine read captured per prompt and per engine.
- OpenAI search **forced** via `tool_choice`. Without it the model often declines to search and returns something worse than a plain completion.
- Gemini sources read from `web.title`, since `web.uri` is a Google redirect and `web.domain` is null.
- Claude tool version chosen per model, and its HTTP-200 search failures handled so a failed search is not silently read as zero sources.
- `src/lib/winnability.ts`: every missed question graded winnable / hard / locked from the retrieved set, with 12 unit tests.
- Migration `supabase/add_grounded_scanning.sql` for citations, per-engine citations, channel and winnability.
- `scripts/verify-grounded.mjs` to re-prove grounding in one command.

**Verified, not asserted.** Same brand, same question, both channels:

| | parametric | grounded |
|---|---|---|
| citations | 0 | 9 |
| competitors detected | none | Otterly, Peec |
| winnability | nothing to grade | hard, with reasons |

Build green, lint clean, 35 tests passing.

---

## Stage 2: surface it. Tonight and tomorrow morning

The engine now produces the citation map. Nothing shows it yet. This stage is the difference between a score everyone else also has and the thing nobody else has.

| # | Task | Owner |
|---|---|---|
| 1 | Run `add_index_sampling.sql` and `add_grounded_scanning.sql` in Supabase | Ankur |
| 2 | Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel | Ankur |
| 3 | Citation map on the scan result: the pages the AI read, which named a competitor, which named you | Claude |
| 4 | Winnable / hard / locked label per missed question, plus the headline split | Claude |
| 5 | Per-engine tabs, since ChatGPT and Gemini shared only one of about eleven sources each | Claude |
| 6 | Homepage pitch rewritten from "get your score" to "see the pages AI read and which you can get onto" | Claude |
| 7 | Seed the production index so the public page stops rendering its empty state | Ankur |
| 8 | Deploy everything. Roughly a week of work is currently unshipped | Both |

**Done when:** a real scan on seo4ai.app shows a named list of pages with a winnability split, and `/llms.txt` returns 200 in production.

---

## Stage 3: launch. Tomorrow

| # | Task |
|---|---|
| 1 | Free public scan switched to grounded, so what visitors see matches what a real ChatGPT user sees |
| 2 | Scan SEO4AI itself and publish the number, however bad. This is the before-half of the only proof that matters |
| 3 | First three posts: our own baseline, and two brand teardowns in the citation-map format |
| 4 | Post to r/SEO and Indie Hackers as data, not promotion |
| 5 | Submit the sitemap to Google Search Console and Bing Webmaster Tools |

**Post format.** Lead with the mechanism, not the score. People argue with a score; they cannot argue with which pages the model read:

> Asked ChatGPT "best CRM for small business". It read 8 pages to answer. [Brand] was on 0 of them. Its competitor was on 6. That is why AI recommends them and not [Brand]. Here are the 8 pages.

**Don't:** tag a brand to tell them they are invisible. Tag winners, describe losers. Winners amplify; losers DM.

**Done when:** the product is publicly usable end to end and our own baseline is on the record with a date.

---

## Stage 4: revenue and rhythm. Weeks 1 to 3 after launch

Two tracks in parallel.

**Commercial.** `BILLING_TEST_MODE=false` with the production Polar webhook secret, verified by one real purchase on our own card. Do not announce it; let the free-scan users who are already asking convert. Before this flips, the Max plan must actually run Claude or stop claiming it, and the cron must be confirmed firing on Vercel.

**Weekly rhythm**, roughly 8 to 10 hours a week:

| Day | Action |
|---|---|
| Mon | Pick a category. Scan 15 brands. |
| Tue | Publish `/ai-visibility-index/[category]`. |
| Wed | Leaderboard post. Tag the top three only. |
| Thu | Email the low scorers their own citation map. |
| Fri | One single-brand post. Reply to everything. |
| Sun | Re-scan seo4ai.app. Log the number. |

Category order, highest-intent buyers first: CRM, project management, email marketing, helpdesk, e-commerce platforms, accounting.

**Also here:** a pricing answer to Otterly, which bundles four engines at about $29 while Max is $49.99 for three. Either go narrower and cheaper, or lead with execution and charge more. Matching them at a worse ratio is not an option.

**Done when:** three or more paying customers, six category leaderboards live, and a measured reply rate on the cold citation-map emails.

---

## Stage 5: proof, and the loud launch. Final

Everything before this is setup. This stage is where the thesis is either confirmed or killed, on evidence.

**The proof.** Take one customer brand, execute only the retrieval levers, and re-scan weekly with the citation set recorded each time.

| Lever | Time to show |
|---|---|
| Listed on 3 to 4 sources already in the retrieved set | 2 to 6 weeks |
| Ranking in Bing for the category query | 3 to 8 weeks |
| Extractable content, FAQ, schema | 1 to 3 weeks |
| Community threads naming the brand | 2 to 6 weeks |

**Passes only if** the score rises *and* the new citations are the specific pages we caused to exist. A rising score with unrelated citations is coincidence, not proof.

**Then the loud launch:** Product Hunt, Show HN framed as the dataset rather than the product, BetaList, and AI tool directories. Directories count double: they are exactly the pages AI retrieval pulls from, so they are distribution and ranking at once.

**Also in scope:** the Shopify wedge. No competitor is in the Shopify App Store and we have a dozen prior apps of experience there. Long-tail queries only ("best organic cotton baby clothes for eczema"), never head terms, because head terms just return Amazon.

**What would kill it.** Stated now so it cannot be rationalised later: if the levers are genuinely executed for eight weeks and the score does not move, customers cannot move it either, and we should sell measurement only, at a measurement price.

---

## The honest risks

**Launching tomorrow costs something.** New pages take two to four weeks to be indexed and start surfacing in AI retrieval. Tomorrow we cannot yet pass our own test, so lead with the data and the mechanism, not with "we rank on ChatGPT". If anyone checks that claim tomorrow, it fails.

**Scans got three times more expensive.** Multi-run sampling plus grounded search. Fifteen brands times twenty prompts times three runs is 900 searched calls per category per week. Cheap on `gpt-4o-mini`, but check it after the first leaderboard rather than being surprised.

**The category is crowded at the listicle layer and thin at the retrieval layer.** The domains models actually cited were small unfunded sites, not Profound or Semrush. That is the opening, and it is why the citation map matters more than the score.

**The real risk is week four.** This plan fails from skipped weeks, not from bad strategy. If only half is possible, keep the leaderboard and the emails and drop the single-brand posts.
