import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategoryEntries, getIndexCategories } from '@/lib/index-data'
import { categoryMeta, sentenceCaseName, CATEGORIES } from '@/lib/categories'
import { getPublicSiteUrl } from '@/lib/site'

// Matches the parent index: a scan run from the admin page reaches the public
// site within five minutes, without a redeploy.
export const revalidate = 300

const appUrl = getPublicSiteUrl()

/**
 * Pre-render the six planned categories. Any other slug still renders on demand
 * — publishing a seventh category is a scan, not a deploy.
 */
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }))
}

interface Params {
  params: { category: string }
}

function describe(name: string, count: number, leader: string | null) {
  const lead = leader ? ` ${leader} ranks first.` : ''
  return `We asked AI assistants the questions buyers actually ask about ${sentenceCaseName(name)} and counted how often each of ${count} brands got named.${lead} No brand names in the questions.`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entries = await getCategoryEntries(params.category)
  if (entries.length === 0) return { title: 'Category not found' }

  const meta = categoryMeta(params.category, entries[0].industry)
  const title = `${meta.name}: the AI Visibility Index`
  const description = describe(meta.name, entries.length, entries[0]?.company ?? null)
  const url = `${appUrl}/ai-visibility-index/${meta.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | SEO4AI`, description, url, type: 'article' },
    twitter: { card: 'summary_large_image', title: `${title} | SEO4AI`, description },
  }
}

function scoreClasses(score: number) {
  if (score >= 66) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (score >= 26) return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-red-50 text-red-700 ring-red-600/20'
}

function barColor(score: number) {
  if (score >= 66) return 'bg-emerald-500'
  if (score >= 26) return 'bg-amber-500'
  return 'bg-red-500'
}

export default async function CategoryLeaderboardPage({ params }: Params) {
  const entries = await getCategoryEntries(params.category)

  // An empty leaderboard that Google indexes is worse than no page: it becomes
  // the cached impression of the dataset. 404 until there is something to show.
  if (entries.length === 0) notFound()

  const meta = categoryMeta(params.category, entries[0].industry)
  const others = (await getIndexCategories()).filter((c) => c.meta.slug !== meta.slug)

  const lastUpdated = new Date(
    Math.max(...entries.map((e) => new Date(e.scannedAt).getTime()))
  ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
  const invisible = entries.filter((e) => e.score < 26).length
  const podium = entries.slice(0, 3)

  // Provenance, reported as the weakest case across the category rather than the
  // average, so the footnote can never overstate how repeatable the table is.
  const sampled = entries.filter((e) => e.runsPerPrompt > 1)
  const runs = Math.min(...entries.map((e) => e.runsPerPrompt || 1))
  const stability = sampled.length ? Math.min(...sampled.map((e) => e.stability)) : null
  const engineLabel =
    Array.from(new Set(entries.flatMap((e) => e.engines)))
      .map((k) => ({ openai: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' })[k] || k)
      .join(' + ') || 'ChatGPT'

  const url = `${appUrl}/ai-visibility-index/${meta.slug}`

  // Two objects: the Dataset describes the measurement, the ItemList gives the
  // ranking in a form a model can lift directly. The ranking is the quotable
  // part, so it is stated as data rather than left implicit in the table markup.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${meta.name}: the AI Visibility Index`,
      description: describe(meta.name, entries.length, entries[0]?.company ?? null),
      url,
      creator: { '@type': 'Organization', name: 'SEO4AI', url: appUrl },
      dateModified: entries[0]?.scannedAt,
      isPartOf: { '@type': 'Dataset', name: 'The AI Visibility Index', url: `${appUrl}/ai-visibility-index` },
      variableMeasured: 'AI visibility score (0-100)',
      measurementTechnique: `${runs > 1 ? `${runs} runs` : 'One run'} per question across ${engineLabel}, with no brand name in the question`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${meta.name} ranked by AI visibility`,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: entries.length,
      itemListElement: entries.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: e.company,
        description: `AI visibility score ${e.score} of 100 — named in ${e.discoveryMentions} of ${e.discoveryPrompts} neutral buyer questions.`,
      })),
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="max-w-3xl">
          <nav className="text-sm text-stone-500 mb-4">
            <Link href="/ai-visibility-index" className="hover:text-stone-900 transition-colors">
              The AI Visibility Index
            </Link>
            <span className="mx-2 text-stone-300">/</span>
            <span className="text-stone-900">{meta.name}</span>
          </nav>

          <p className="text-sm font-medium text-violet-700 mb-3">
            Public data &middot; updated {lastUpdated}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
            Which {sentenceCaseName(meta.name)} does AI actually recommend?
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            We asked {engineLabel} the questions a real buyer asks &mdash; starting with{' '}
            <span className="font-medium text-stone-900">
              &ldquo;{meta.buyerQuestion}&rdquo;
            </span>{' '}
            &mdash; and counted how often {entries.length === 1 ? 'it got named' : `each of ${entries.length} brands got named`}.
          </p>
          <p className="mt-3 text-lg text-stone-600 leading-relaxed">
            {/* The one-line method statement. It preempts the cherry-picking
                objection before anyone reaches the table. */}
            No brand names in the questions. If a company shows up, it earned it.
          </p>
          {meta.angle && <p className="mt-3 text-base text-stone-500 leading-relaxed">{meta.angle}</p>}
        </header>

        {/* Summary stats */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { value: entries.length, label: entries.length === 1 ? 'brand scanned' : 'brands scanned' },
            { value: avg, label: 'average score' },
            { value: invisible, label: 'scored under 26' },
            {
              value: `${Math.round((invisible / entries.length) * 100)}%`,
              label: 'effectively invisible',
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white ring-1 ring-stone-200 p-4 sm:p-5">
              <div className="text-3xl font-bold text-stone-900 tabular-nums">{s.value}</div>
              <div className="mt-1 text-xs sm:text-sm text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Podium. The screenshot that goes on X — and the only three brands
            safe to name in the post, since winners amplify and losers DM. */}
        {podium.length === 3 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Most recommended
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {podium.map((e, i) => (
                <div
                  key={e.company}
                  className="rounded-xl bg-white ring-1 ring-stone-200 p-5 flex items-start gap-4"
                >
                  <div className="text-2xl font-bold text-stone-300 tabular-nums leading-none pt-1">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900 truncate">{e.company}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ring-1 ring-inset ${scoreClasses(e.score)}`}
                      >
                        {e.score}
                      </span>
                      <span className="text-xs text-stone-500">{e.label}</span>
                    </div>
                    <div className="mt-2 text-xs text-stone-500 tabular-nums">
                      named in {e.discoveryMentions} of {e.discoveryPrompts} questions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Full ranking */}
        <div className="mt-10 overflow-x-auto rounded-xl ring-1 ring-stone-200 bg-white">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <caption className="sr-only">
              {meta.name} ranked by how often AI assistants name them, {lastUpdated}
            </caption>
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/70">
                <th scope="col" className="py-3 pl-5 pr-3 text-xs font-semibold uppercase tracking-wide text-stone-500 w-12">#</th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Company</th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold uppercase tracking-wide text-stone-500 w-44">Visibility score</th>
                <th scope="col" className="py-3 px-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Named in</th>
                <th scope="col" className="py-3 px-3 pr-5 text-xs font-semibold uppercase tracking-wide text-stone-500">Top competitor</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.company}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors"
                >
                  <td className="py-4 pl-5 pr-3 text-sm text-stone-400 tabular-nums">{i + 1}</td>
                  <td className="py-4 px-3">
                    <div className="font-semibold text-stone-900">{e.company}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{e.industry}</div>
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ring-1 ring-inset ${scoreClasses(e.score)}`}
                      >
                        {e.score}
                      </span>
                      <span className="text-xs text-stone-500">{e.label}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full max-w-[120px] rounded-full bg-stone-100 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor(e.score)}`} style={{ width: `${e.score}%` }} />
                    </div>
                  </td>
                  <td className="py-4 px-3 text-sm text-stone-700 tabular-nums whitespace-nowrap">
                    {e.discoveryMentions}<span className="text-stone-400"> / {e.discoveryPrompts}</span>
                    <div className="text-xs text-stone-400 mt-0.5">category questions</div>
                  </td>
                  <td className="py-4 px-3 pr-5 text-sm">
                    {e.topCompetitor ? (
                      <>
                        <span className="font-medium text-stone-900">{e.topCompetitor}</span>
                        <div
                          className={`text-xs mt-0.5 tabular-nums ${
                            e.topCompetitorMentions > e.discoveryMentions ? 'text-red-600' : 'text-stone-400'
                          }`}
                        >
                          {e.topCompetitorMentions} / {e.discoveryPrompts}
                          {e.topCompetitorMentions > e.discoveryMentions ? ' · ahead' : ''}
                        </div>
                      </>
                    ) : (
                      <span className="text-stone-400">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Methodology. Shorter than the parent page: anyone landing here from a
            post wants the number first and the method second. */}
        <section className="mt-12 rounded-xl bg-white ring-1 ring-stone-200 p-6">
          <h2 className="text-base font-semibold text-stone-900">How this was measured</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600 leading-relaxed">
            <li>
              Every brand was asked the same set of neutral {sentenceCaseName(meta.name)} questions
              &mdash; never containing the brand&apos;s own name, and never naming a competitor.
            </li>
            <li>
              The score weights how often the brand appeared (50%), how high it ranked (30%), and
              how positively it was described (20%).
            </li>
            <li>
              Matching is whole-word, and an answer saying it has never heard of a brand does not
              count as a mention.
            </li>
            <li>
              AI answers vary between runs, so every question is asked{' '}
              {runs > 1 ? `${runs} times` : 'more than once'} and a brand only counts as named when
              the majority of runs name it.
            </li>
          </ul>
          <p className="mt-4 border-t border-stone-200 pt-4 text-xs text-stone-500 leading-relaxed">
            This run: {engineLabel} &middot;{' '}
            {runs > 1 ? `${runs} runs per question` : 'single run per question'}
            {stability !== null && ` · ${stability}% of questions agreed across every run`}
            {` · ${lastUpdated}`}
          </p>
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-2xl bg-stone-900 px-6 py-10 sm:px-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Not on this list?
          </h2>
          <p className="mt-3 text-stone-300 max-w-xl mx-auto">
            Run the same scan on your own brand and see the exact questions where these competitors
            get named and you don&apos;t.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-6 py-3 text-white font-medium transition-colors"
          >
            Run my free scan
          </Link>
          <p className="mt-3 text-xs text-stone-400">Free scan &middot; no credit card</p>
        </section>

        {/* Other categories. Internal links between leaderboards are the pages
            AI retrieval follows, so this block is distribution, not navigation. */}
        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Other categories
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((c) => (
                <Link
                  key={c.meta.slug}
                  href={`/ai-visibility-index/${c.meta.slug}`}
                  className="rounded-lg bg-white ring-1 ring-stone-200 px-3.5 py-2 text-sm text-stone-700 hover:ring-stone-300 hover:text-stone-900 transition-colors"
                >
                  {c.meta.name}
                  <span className="text-stone-400 tabular-nums"> · {c.entries}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-xs text-stone-400 leading-relaxed max-w-3xl">
          Scores reflect AI responses at the time of scanning and will move as models are updated.
          This index is published by SEO4AI and is not affiliated with, endorsed by, or sponsored by
          any company listed.
        </p>
      </div>
    </div>
  )
}
