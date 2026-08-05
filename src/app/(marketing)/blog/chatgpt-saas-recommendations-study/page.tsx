import { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedIndex } from '@/lib/index-data'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'We Asked ChatGPT for Software Recommendations 250 Times. Here Is Who It Named.',
  description:
    'A study of 10 well-known SaaS brands and how often ChatGPT names them when asked for recommendations in their own category. Two of the most loved products in tech barely register.',
  keywords: [
    'ChatGPT recommendations',
    'AI visibility study',
    'AI search data',
    'SaaS AI visibility',
    'generative engine optimization',
  ],
}

export default async function ChatGptSaasStudyPage() {
  const entries = await getPublishedIndex()
  const totalPrompts = entries.length * 25
  const laggards = entries.filter((e) => e.score < 46)
  const leaders = entries.filter((e) => e.score >= 66)

  return (
    <article className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 text-sm text-stone-500 mb-4">
            <time>August 4, 2026</time>
            <span className="text-stone-300">|</span>
            <span>6 min read</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            We asked ChatGPT for software recommendations {totalPrompts} times. Here is who it named.
          </h1>
          <p className="text-stone-500 text-sm">By the SEO4AI Team</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-6">
          <p className="text-lg text-stone-700 leading-relaxed">
            Everyone assumes the best-known software brands own AI search. We decided to check.
            We took {entries.length} SaaS companies that most people in tech could name from memory,
            asked ChatGPT the questions their buyers actually ask, and counted how often each brand
            got named. The results were not evenly distributed.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">What we tested</h2>
          <p className="text-stone-500 leading-relaxed">
            Each company got {25} questions, {totalPrompts} in total. The important detail is what we
            did <em>not</em> ask. We never mentioned the brand by name in a discovery question. Asking
            &ldquo;is Notion any good?&rdquo; guarantees ChatGPT says the word Notion, which measures
            nothing. Instead we asked things like &ldquo;best no-code database tools&rdquo; and
            &ldquo;which CRM should I use&rdquo;, then checked whether the brand showed up on its own.
          </p>
          <p className="text-stone-500 leading-relaxed">
            For the head-to-head numbers below, both the brand and its competitors are counted over
            the same {entries[0]?.discoveryPrompts ?? 11} neutral category questions, so nobody gets
            credit for a question that named them in the first place.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">The results</h2>

          <div className="not-prose my-8 overflow-x-auto rounded-xl ring-1 ring-stone-200 bg-white">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Company</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Score</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Named in</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Top competitor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.company} className="border-b border-stone-100 last:border-0">
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">{e.company}</td>
                    <td className="py-3 px-4 text-sm tabular-nums text-stone-700">{e.score}</td>
                    <td className="py-3 px-4 text-sm tabular-nums text-stone-700">
                      {e.discoveryMentions}/{e.discoveryPrompts}
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      {e.topCompetitor
                        ? `${e.topCompetitor} ${e.topCompetitorMentions}/${e.discoveryPrompts}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            Being loved is not the same as being visible
          </h2>
          {laggards.length > 0 && (
            <p className="text-stone-500 leading-relaxed">
              The clearest finding is the gap at the bottom.{' '}
              {laggards.map((l) => l.company).join(' and ')}{' '}
              {laggards.length === 1 ? 'is a product' : 'are products'} with real reputations among
              the people who use them daily. Ask ChatGPT for the best tools in their categories
              without naming them, and{' '}
              {laggards.length === 1 ? 'it' : 'they'} score{' '}
              {laggards.map((l) => `${l.score}/100`).join(' and ')}.
            </p>
          )}
          {laggards.map((l) => (
            <p key={l.company} className="text-stone-500 leading-relaxed">
              <strong className="text-stone-900">{l.company}</strong> was named in{' '}
              {l.discoveryMentions} of {l.discoveryPrompts} neutral category questions.
              {l.topCompetitor && (
                <>
                  {' '}
                  {l.topCompetitor} was named in {l.topCompetitorMentions} of the same{' '}
                  {l.discoveryPrompts}. A buyer researching this category through ChatGPT hears about{' '}
                  {l.topCompetitor} almost every time and {l.company}{' '}
                  {l.discoveryMentions === 0 ? 'not once' : 'rarely'}.
                </>
              )}
            </p>
          ))}

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            Why the leaders lead
          </h2>
          <p className="text-stone-500 leading-relaxed">
            {leaders.length} of the {entries.length} brands scored in the strong-to-dominant range.
            They share something that has little to do with product quality: they are written about
            constantly, by other people, in the listicles, comparison posts, documentation, forum
            threads and review sites that models train on. When a model has read a thousand
            &ldquo;best tools for X&rdquo; posts and a brand appears in most of them, that brand
            becomes the default answer.
          </p>
          <p className="text-stone-500 leading-relaxed">
            The laggards tend to grow through channels models cannot see: word of mouth, private
            communities, sales conversations, and a beautiful product that people show each other in
            person. That builds a brand. It does not build a corpus.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            What this means for your company
          </h2>
          <p className="text-stone-500 leading-relaxed">
            If brands this well known can be invisible in AI answers, brand recognition alone will
            not carry a smaller company. AI visibility is a separate thing from awareness, from
            traffic, and from Google rankings, and it has to be measured separately.
          </p>
          <p className="text-stone-500 leading-relaxed">
            The uncomfortable part is that you cannot see this in your analytics. There is no
            referrer, no impression count, and no ranking position for an answer that never mentioned
            you. The only way to know is to ask the models directly and count.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">Method and limits</h2>
          <p className="text-stone-500 leading-relaxed">
            Scores weight how often a brand appeared (50%), how high it ranked in the answer (30%),
            and how positively it was described (20%). Brand matching is whole-word, so
            &ldquo;Linear&rdquo; is not credited for &ldquo;linearly&rdquo;, and an answer stating it
            has never heard of a brand does not count as a mention.
          </p>
          <p className="text-stone-500 leading-relaxed">
            Two honest caveats. This run tested ChatGPT only, so it is not a claim about every AI
            assistant. And model outputs vary between runs, so treat individual scores as a reading
            with a margin rather than a fixed number. The gap between a brand named every time and
            one named never is far larger than that margin.
          </p>

          {/* CTA */}
          <div className="not-prose mt-12 rounded-2xl bg-stone-900 px-6 py-10 text-center">
            <h2 className="text-2xl font-bold text-white">
              See the full index, or scan your own brand
            </h2>
            <p className="mt-3 text-stone-300 max-w-lg mx-auto">
              The complete dataset is public and updated as we add companies. You can also run the
              same scan on your own brand for free.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/index"
                className="inline-flex items-center justify-center rounded-lg bg-white hover:bg-stone-100 px-6 py-3 text-stone-900 font-medium transition-colors"
              >
                View the AI Visibility Index
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-6 py-3 text-white font-medium transition-colors"
              >
                Run my free scan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
