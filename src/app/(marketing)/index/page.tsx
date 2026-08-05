import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedIndex } from '@/lib/index-data'

// Re-rendered at most once every 5 minutes, so a scan run from the admin page
// reaches the public site without a redeploy.
export const revalidate = 300

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seo4ai.app'
const title = 'The AI Visibility Index'

function describe(count: number) {
  return `How often ChatGPT names ${count || 'well-known'} SaaS brands when asked for recommendations in their own category. Real scores, real numbers, updated regularly.`
}

export async function generateMetadata(): Promise<Metadata> {
  const entries = await getPublishedIndex()
  const description = describe(entries.length)
  return {
    title,
    description,
    alternates: { canonical: `${appUrl}/index` },
    openGraph: {
      title: `${title} | SEO4AI`,
      description,
      url: `${appUrl}/index`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | SEO4AI`,
      description,
    },
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

export default async function AiVisibilityIndexPage() {
  const entries = await getPublishedIndex()

  const lastUpdated = entries.length
    ? new Date(
        Math.max(...entries.map((e) => new Date(e.scannedAt).getTime()))
      ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  const avg = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
    : 0
  const invisible = entries.filter((e) => e.score < 26).length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: title,
    description: describe(entries.length),
    url: `${appUrl}/index`,
    creator: { '@type': 'Organization', name: 'SEO4AI', url: appUrl },
    dateModified: entries[0]?.scannedAt,
    variableMeasured: 'AI visibility score (0-100)',
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="max-w-3xl">
          {lastUpdated && (
            <p className="text-sm font-medium text-violet-700 mb-3">
              Public data · updated {lastUpdated}
            </p>
          )}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
            The AI Visibility Index
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            Everyone assumes the biggest brands own AI search. They mostly don&apos;t. We asked
            ChatGPT the questions buyers actually ask &mdash; &ldquo;best CRM software&rdquo;,
            &ldquo;top issue tracking tools&rdquo; &mdash; and counted how often each brand got named.
          </p>
          <p className="mt-3 text-lg text-stone-600 leading-relaxed">
            No brand names in the questions. If a company shows up, it earned it.
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="mt-12 rounded-xl bg-white ring-1 ring-stone-200 p-10 text-center">
            <p className="text-stone-600">
              The first results are being scanned and will appear here shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl">
              {[
                { value: entries.length, label: 'brands scanned' },
                { value: avg, label: 'average score' },
                { value: invisible, label: 'scored under 26' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white ring-1 ring-stone-200 p-4 sm:p-5">
                  <div className="text-3xl font-bold text-stone-900 tabular-nums">{s.value}</div>
                  <div className="mt-1 text-xs sm:text-sm text-stone-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="mt-10 overflow-x-auto rounded-xl ring-1 ring-stone-200 bg-white">
              <table className="w-full text-left border-collapse min-w-[720px]">
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
                    <tr key={e.company} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors">
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
          </>
        )}

        {/* Methodology */}
        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white ring-1 ring-stone-200 p-6">
            <h2 className="text-base font-semibold text-stone-900">How this is measured</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone-600 leading-relaxed">
              <li>
                Each brand gets a set of category questions a real buyer would ask &mdash; never
                containing the brand&apos;s own name.
              </li>
              <li>
                Every question goes to ChatGPT. We record whether the brand was named, where in the
                list it landed, and which competitors appeared alongside it.
              </li>
              <li>
                The score weights how often the brand appeared (50%), how high it ranked (30%), and
                how positively it was described (20%).
              </li>
              <li>
                The <span className="font-medium text-stone-900">named in</span> and{' '}
                <span className="font-medium text-stone-900">top competitor</span> columns are
                counted over the same set of neutral category questions &mdash; ones that name
                neither the brand nor any competitor &mdash; so the head-to-head is like for like.
              </li>
              <li>
                Matching is whole-word, so &ldquo;Linear&rdquo; is not credited for
                &ldquo;linearly&rdquo;, and an answer saying it has never heard of a brand does not
                count as a mention.
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-stone-200 p-6">
            <h2 className="text-base font-semibold text-stone-900">How to read the score</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['81-100', 'Dominant', 'named in nearly every relevant answer'],
                ['66-80', 'Strong', 'a default recommendation in the category'],
                ['46-65', 'Moderate', 'shows up, but not reliably'],
                ['26-45', 'Low', 'occasionally mentioned, usually behind others'],
                ['0-25', 'Very low / invisible', 'buyers asking AI rarely hear this name'],
              ].map(([range, label, meaning]) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-20 shrink-0 tabular-nums text-stone-400">{range}</dt>
                  <dd className="text-stone-600">
                    <span className="font-medium text-stone-900">{label}</span> &mdash; {meaning}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-2xl bg-stone-900 px-6 py-10 sm:px-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Where would your brand land on this list?
          </h2>
          <p className="mt-3 text-stone-300 max-w-xl mx-auto">
            Run the same scan on your own brand and see the exact questions where your competitors
            get named and you don&apos;t.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-6 py-3 text-white font-medium transition-colors"
          >
            Run my free scan
          </Link>
          <p className="mt-3 text-xs text-stone-400">Free scan · no credit card</p>
        </section>

        <p className="mt-8 text-xs text-stone-400 leading-relaxed max-w-3xl">
          Scores reflect ChatGPT responses at the time of scanning and will move as models are
          updated. This index is published by SEO4AI and is not affiliated with, endorsed by, or
          sponsored by any company listed.
        </p>
      </div>
    </div>
  )
}
