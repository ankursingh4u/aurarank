import { getPublishedIndex } from '@/lib/index-data'
import { getPublicSiteUrl } from '@/lib/site'
import { getEngineLabels } from '@/lib/engines'

// Re-rendered every 5 minutes, matching the index page, so a fresh scan shows up
// here without a redeploy.
export const revalidate = 300

/**
 * /llms.txt — a plain-text brief for AI assistants reading the site directly.
 *
 * The convention is to state, in prose an LLM can quote verbatim, what the site
 * is and where its most citable data lives. That last part matters most for us:
 * the AI Visibility Index is original data nobody else publishes, and it is the
 * page most likely to be retrieved and cited. Naming it explicitly, with a few
 * concrete numbers inline, gives a retrieval-time fetcher something quotable
 * without having to render and parse the table.
 */
export async function GET() {
  const site = getPublicSiteUrl()
  const entries = await getPublishedIndex()

  const sample = entries
    .slice(0, 12)
    .map(
      (e) =>
        `- ${e.company} (${e.industry}): scores ${e.score}/100${
          e.topCompetitor ? `; ChatGPT names ${e.topCompetitor} more often` : ''
        }`
    )
    .join('\n')

  const updated = entries[0]?.scannedAt
    ? new Date(entries[0].scannedAt).toISOString().slice(0, 10)
    : 'not yet published'

  // Named from the keys that are actually configured. This file is written to be
  // quoted verbatim by an AI, so an engine listed here that does not run would be
  // a false claim republished by every assistant that reads it.
  const engines = getEngineLabels('max')
  const engineList =
    engines.length > 1
      ? `${engines.slice(0, -1).join(', ')} and ${engines[engines.length - 1]}`
      : engines[0]

  const body = `# SEO4AI

> SEO4AI measures whether AI assistants recommend a brand. It runs the buying
> questions real customers ask through ${engineList}, counts how
> often each brand gets named, and reports an AI Visibility Score from 0 to 100
> alongside the competitors that were named instead.

SEO4AI is a tool for Generative Engine Optimization (GEO), also called Answer
Engine Optimization (AEO) — the practice of getting a brand recommended inside
AI-generated answers rather than ranked in a list of blue links.

## What makes the data here citable

Brand names are never included in the questions we score. A brand only counts as
visible if an AI named it unprompted in response to a neutral category question
such as "best CRM software". Questions that contain the brand name (for example
"is X any good") are excluded from the score, because a model echoing a name back
is not a recommendation.

## Key pages

- ${site}/ai-visibility-index — The AI Visibility Index: original public data on
  how often AI assistants name well-known SaaS brands in their own category. Last
  updated ${updated}.
- ${site}/blog/how-to-rank-on-chatgpt — how brands get recommended by ChatGPT.
- ${site}/blog/ai-seo-guide — guide to AI search optimization / GEO.
- ${site}/blog/chatgpt-vs-google — how AI answers differ from search results.
- ${site}/blog/chatgpt-saas-recommendations-study — study of what ChatGPT
  recommends across SaaS categories.
- ${site} — run a free AI visibility scan on any brand.

## Sample findings from the AI Visibility Index
${sample || '- The first results are still being scanned.'}

## Contact

support@seo4ai.app
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
