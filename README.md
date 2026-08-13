# SEO4AI

**Live:** https://seo4ai.app

SEO4AI measures whether AI assistants recommend a brand, shows the exact pages they read to decide, and tells you which of those pages you can realistically get onto.

Repo note: the directory and `package.json` are still named `aurarank`, the product's original name. Everything user-facing is SEO4AI.

---

## The idea in one page

An AI names a brand through two independent channels, and confusing them is the single most expensive mistake in this category.

| | Parametric | Retrieval (grounded) |
|---|---|---|
| What it is | What the model absorbed during training | What it fetches from the live web while answering |
| Who uses it | Plain API calls, ChatGPT with search off | ChatGPT search, Perplexity, AI Overviews, Copilot |
| Can a customer move it? | Not on any sellable timescale | Yes, in roughly 2 to 8 weeks |
| Changes when | The model is retrained, every 6 to 18 months | Continuously |

Both are driven mainly by **third-party pages**, not the brand's own site. So the product's job is not to hand out a score. It is to name the pages an AI read, show which of them mention a competitor and not you, and grade how realistically you can get onto each one.

SEO4AI uses both channels deliberately:

- **Public AI Visibility Index → parametric.** A leaderboard that reshuffles weekly because search results moved is a bad leaderboard. Frozen weights make it comparable across months.
- **Customer scans → grounded.** Responsive to work, produces citations, justifies a subscription.

---

## What makes the numbers defensible

The scoring is deliberately harsher than it needs to be, because every published figure has to survive a hostile founder re-running the query.

- **Brand-echo prompts are excluded.** A question containing the brand name ("is X any good") guarantees the name comes back. That is not a recommendation, so it never counts toward the score.
- **"Never heard of it" is not a mention.** An answer saying it is unfamiliar with a brand does not credit that brand.
- **Whole-word matching.** "Linear" is not credited for "linearly".
- **Sentiment contributes zero** when the brand was not genuinely named, rather than defaulting to a neutral midpoint.
- **Multi-run sampling.** Models are sampled at temperature 0.7, so a single ask is a coin flip on borderline brands. Every prompt is asked three times and scored on the majority verdict, with the per-prompt split kept so the UI can say "named in 1 of 3 runs" instead of flatly claiming absence.
- **Stability is published** alongside the score: the share of questions where every run agreed. A single-run scan reports 0, not 100, because absence of measured variance is not evidence of stability.

Head-to-head numbers are counted over the same set of neutral category questions for the brand and its competitors, so the comparison is like for like.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Open http://localhost:3000.

### Environment

See `.env.example` for the full list. The ones that change behaviour:

| Variable | Effect |
|---|---|
| `BILLING_TEST_MODE` | `true` uses Polar sandbox (card 4242…, no real charges). `false` takes real money. Defaults to test when unset or unrecognized, so you cannot accidentally charge a card. |
| `OPENAI_GROUNDED_MODEL` | Model used for grounded scans. Defaults to `gpt-4o-mini`, which supports forced web search and is far cheaper than `gpt-4o`. `gpt-4o` retrieves better sources if you need the quality. |
| `ANTHROPIC_API_KEY` | Without it the Claude engine skips silently, so Max delivers two engines while advertising three. Set it or remove Claude from the Max feature list. |
| `GEMINI_API_KEY` | Required for Pro and Max multi-engine scans. |
| `ADMIN_EMAILS` | Comma-separated emails allowed to manage the public index at `/dashboard/index-admin`. Empty locks the admin pages for everyone. |

`NEXT_PUBLIC_APP_URL` should be the production domain in production. `src/lib/site.ts` refuses to emit a localhost URL from a production build, so a stale value cannot silently publish a sitemap of unreachable links, but set it correctly anyway.

### Database

Run the SQL in `supabase/` in the Supabase SQL editor, in this order:

```
schema.sql                 # fresh projects only
add_user_plans.sql
add_polar_billing.sql
add_market_region.sql
add_scan_user_id.sql       # critical for existing projects; scan creation fails without it
add_auto_scan.sql
add_ai_visibility_index.sql
add_article_generations.sql
add_wordpress_publishes.sql
add_index_sampling.sql     # multi-run sampling
add_grounded_scanning.sql  # citations, channel, winnability
```

---

## How a scan works

1. Generate buyer-intent prompts for the category. The brand name never appears in a scored question.
2. Ask every engine on the plan, three times each, with web search forced on for grounded scans.
3. Collapse the runs by majority verdict, keeping the per-run split and stability figure.
4. Record per prompt: named or not, position, sentiment, competitors named, and **the source domains the engines actually read**.
5. Score: 50% mention frequency, 30% position, 20% sentiment.
6. Grade each missed question by how open its retrieved set is.

### Winnability

Placement on someone else's page is not ours to promise, so expectations are set at scan time rather than after the invoice.

| Class | Meaning | What we tell the customer |
|---|---|---|
| `winnable` | Retrieved set is thin, or contains self-serve sources (G2, Capterra, Product Hunt, directories) | Work on these |
| `hard` | Independent sites that accept pitches | Possible, but it is outreach, not a form |
| `locked` | Editorial or competitor-owned only | Do not spend money here |

Rival-owned pages never list a customer, so they count against a query no matter how well they rank.

---

## Engine quirks worth knowing before you touch `src/lib/engines.ts`

These were all found the hard way and are easy to reintroduce.

- **OpenAI web search must be forced.** Passing the `web_search` tool is not enough; the model frequently declines to search, answers from memory, and returns something *worse* than a plain completion. It named BI dashboards for "best AI visibility tools". `tool_choice: { type: 'web_search' }` is load-bearing.
- **The OpenAI SDK types lag the API.** `openai@6` only lists `web_search_preview` in its tool union, but the API accepts and honours `web_search`. The cast is deliberate; do not "fix" it by swapping to the preview tool without retesting.
- **Gemini returns redirect URLs, not domains.** `groundingChunks[].web.uri` is a `vertexaisearch.cloud.google.com` redirect and `web.domain` is null. The real source is in `web.title`.
- **Anthropic's newer search tool is model-gated.** `web_search_20260209` needs Opus 4.6+ or Sonnet 4.6+; Haiku takes `web_search_20250305`. `claudeSearchTool()` picks per model.
- **Anthropic search failures return HTTP 200.** A failed search comes back as a `web_search_tool_result` block whose `content` is an error object rather than an array, so unguarded iteration silently reads it as zero sources.
- **The engines barely overlap.** Measured 2026-08-10: ChatGPT and Gemini each cited about eleven domains for the same question and shared exactly one. Citations are stored per engine as well as merged, because a single list would hide a brand winning on one engine and absent on another.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (analyzer + winnability) |
| `npm run lint` | ESLint |
| `npx tsx scripts/verify-grounded.mjs` | Run one brand through both channels and print the difference. The fastest way to confirm grounding still works. |
| `node scripts/grounding-test.mjs` | Grounded vs parametric across OpenAI and Gemini |
| `node scripts/grounding-test2.mjs` | Forced-search and real-domain checks |
| `node scripts/grounding-test3.mjs` | Cost check: mini vs 4o for grounded search |
| `node scripts/gen-gtm-doc.js` | Regenerate the GTM docx |
| `node scripts/gen-launch-plan-doc.js` | Regenerate the launch plan docx |
| `node scripts/gen-technical-plan-doc.js` | Regenerate the technical plan docx |

The `grounding-test*` scripts hit live APIs and cost a few cents per run.

---

## Layout

```
src/app/(marketing)/     Public pages, blog, AI Visibility Index
src/app/dashboard/       Authenticated app
src/app/api/             Scans, billing, admin, cron, publishing
src/lib/analyzer.ts      Scoring. The tested core; channel-agnostic.
src/lib/engines.ts       Per-engine querying, grounding, citation extraction
src/lib/winnability.ts   Retrieved-set grading
src/lib/index-scan.ts    Index scanning, multi-run sampling
src/lib/scan-runner.ts   Customer scans
src/lib/site.ts          Canonical domain. One place decides the URL.
src/lib/schema.ts        schema.org builders
supabase/                Migrations, run in the order listed above
```

---

## House rules

- **No em dashes or en dashes in user-facing copy.** Use a colon when the second clause explains the first, a comma for an aside, "to" for ranges.
- **Structured data must describe what the page actually shows.** Schema claiming more than the page renders is both a policy violation and the exact dishonesty this product exists to measure.
- **Do not advertise an engine that is not running.** If a key is missing, remove the claim rather than letting the engine skip silently.

---

## Related documents

| File | Contents |
|---|---|
| `SEO4AI_Technical_Plan.docx` | Current stage, requirements, mechanism, proof protocol |
| `SEO4AI_Launch_Plan.docx` | Three-gate launch model and the weekly operating rhythm |
| `SEO4AI_PRODUCT_GTM.md` | Product and go-to-market. Pricing section is stale; see `src/lib/payment.ts`. |
| `PRODUCTION_READINESS.md` | Deployment checklist. Predates the Vercel move; treat host details with suspicion. |
