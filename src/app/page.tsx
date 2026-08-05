import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/landing/navbar'
import { FreeScan } from '@/components/landing/free-scan'
import { getPublishedIndex } from '@/lib/index-data'
import type { IndexEntry } from '@/lib/index-scan'

// Keeps the proof band in step with the index without a redeploy.
export const revalidate = 300
import {
  ArrowRight, Check, Lock, Search, Target, FileText,
  TrendingUp, ShieldCheck, Sparkles, AlertTriangle, Quote,
  Database, Globe, MessageSquare, Star,
} from 'lucide-react'

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

// The engines we measure against. ChatGPT, Gemini and Claude are live; the rest
// are the roadmap shown as "soon".
const ENGINES = [
  { name: 'ChatGPT', live: true },
  { name: 'Gemini', live: true },
  { name: 'Claude', live: true },
  { name: 'Perplexity', live: false },
  { name: 'AI Overviews', live: false },
  { name: 'Grok', live: false },
  { name: 'Copilot', live: false },
]

/**
 * Credibility band built from our own published scan data rather than testimonials
 * we don't have yet. Numbers come straight from the AI Visibility Index, so they
 * update whenever the index is re-scanned.
 */
function IndexProofBand({ entries }: { entries: IndexEntry[] }) {
  if (entries.length < 3) return null

  const sorted = [...entries].sort((a, b) => a.score - b.score)
  const worst = sorted[0]
  const invisible = entries.filter((e) => e.score < 26)

  return (
    <section className="px-4 py-16 bg-white border-y border-stone-200">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
          <div className="lg:flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-[#FBF8F4] px-3 py-1 text-xs font-medium text-stone-600 mb-4">
              <Database className="h-3 w-3 text-violet-700" />
              Our own public data
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              We ran this scan on {entries.length} well-known SaaS brands.
              {invisible.length > 0 && (
                <span className="block mt-1 text-violet-700">
                  {invisible.length === 1 ? 'One' : invisible.length} of them barely register.
                </span>
              )}
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed max-w-xl">
              {worst.company} is a product plenty of people in tech love. Ask ChatGPT for the best
              tools in its category without naming it, and it scores{' '}
              <span className="font-semibold text-stone-900">{worst.score}/100</span>. Brand
              recognition and AI visibility are not the same thing, and the gap is measurable.
            </p>
            <Link
              href="/index"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-800 transition-colors"
            >
              See the full index
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="lg:w-[380px] shrink-0">
            <div className="rounded-xl border border-stone-200 bg-[#FBF8F4] overflow-hidden">
              {sorted.slice(0, 5).map((e) => (
                <div
                  key={e.company}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-200 last:border-0"
                >
                  <span className="text-sm font-medium text-stone-900">{e.company}</span>
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-16 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          e.score >= 66 ? 'bg-emerald-500' : e.score >= 26 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(e.score, 2)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-stone-700 w-7 text-right">
                      {e.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-400 text-center">
              Lowest 5 of {entries.length} · scored on ChatGPT
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function LandingPage() {
  const indexEntries = await getPublishedIndex()
  return (
    <div className="min-h-screen bg-[#FBF8F4] text-stone-900 antialiased">
      <Navbar />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: copy + scan */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 mb-6">
              <Sparkles className="h-3 w-3 text-violet-700" />
              The visibility layer for AI search
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.05] tracking-tight text-balance">
              Your customers are asking AI.
              <span className="block mt-2 text-violet-700">
                Is it naming you, or your competitor?
              </span>
            </h1>

            <p className="mt-6 text-lg text-stone-600 leading-relaxed max-w-xl">
              ChatGPT, Gemini and Perplexity now answer &ldquo;what&apos;s the best
              option?&rdquo; directly, no more ten blue links. We show you whether
              AI recommends your brand, who it picks instead, and exactly what to
              change so it picks you.
            </p>

            <div className="mt-8">
              <FreeScan />
            </div>
          </div>

          {/* Right: the shock, a live-looking scan result */}
          <div className="relative">
            <div className="absolute inset-0 -m-3 rounded-[28px] bg-gradient-to-tr from-violet-600/10 to-transparent pointer-events-none" />
            <div className="relative rounded-2xl border border-stone-200 bg-white shadow-[0_20px_60px_rgba(28,25,23,0.10)] overflow-hidden">
              {/* window chrome */}
              <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                <span className="ml-3 text-[11px] text-stone-400">AI Visibility Report · live</span>
              </div>

              <div className="p-5">
                {/* score headline */}
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Invisible to AI</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold text-red-600 leading-none">8%</span>
                    <span className="text-sm text-stone-500 pb-1">visibility score</span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Your brand was named in <span className="font-semibold text-red-600">1 of 12</span> questions
                    customers ask AI. The rest went to competitors.
                  </p>
                </div>

                {/* you vs competitor bars */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-500">Your brand</span>
                      <span className="font-semibold text-red-600">8%</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-red-500" style={{ width: '8%' }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-500">Top competitor</span>
                      <span className="font-semibold text-emerald-600">84%</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: '84%' }} /></div>
                  </div>
                </div>

                {/* prompt rows */}
                <div className="space-y-1.5">
                  {[
                    { q: '“best CRM for startups”', win: false },
                    { q: '“top CRM software 2026”', win: false },
                    { q: '“which CRM should I use”', win: false },
                  ].map((r) => (
                    <div key={r.q} className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                      <XIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span className="text-stone-600 truncate">{r.q}</span>
                      <span className="ml-auto text-[11px] text-red-500 shrink-0">not mentioned</span>
                    </div>
                  ))}
                </div>

                {/* engine chips */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ENGINES.map((e) => (
                    <span
                      key={e.name}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                        e.live
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      {!e.live && <Lock className="h-2.5 w-2.5" />}
                      {e.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-stone-400">Example report. Run yours to see your real numbers.</p>
          </div>
        </div>
      </section>

      {/* ───────────────────── The shift (problem) ───────────────────── */}
      <section className="px-4 py-16 border-y border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Search didn&apos;t die. It moved.</h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              People used to Google, scroll ten links, and click. Now they ask one
              question and trust one answer. If your brand isn&apos;t in that answer,
              you don&apos;t lose a ranking, you lose the customer entirely, and you
              never even see it happen.
            </p>
            <p className="mt-4 text-stone-600 leading-relaxed">
              Traditional SEO tools can&apos;t measure this. They watch Google&apos;s
              blue links. We watch the answer itself.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { big: 'No ranking', small: 'There are no positions to track, just in, or out.' },
              { big: 'No clicks', small: 'AI answers without sending traffic to your site.' },
              { big: 'No referrer', small: 'You can’t see these lost customers in analytics.' },
              { big: 'No second place', small: 'AI usually names a few brands. Miss the cut, miss it all.' },
            ].map((c) => (
              <div key={c.big} className="rounded-xl border border-stone-200 bg-[#FBF8F4] p-4">
                <p className="text-lg font-bold text-violet-700">{c.big}</p>
                <p className="mt-1 text-sm text-stone-600">{c.small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Proof: our own public data ──────────── */}
      <IndexProofBand entries={indexEntries} />

      {/* ──────────── Education: how AI decides who to recommend ──────────── */}
      <section id="why" className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 mb-4">
              <Sparkles className="h-3 w-3 text-violet-700" />
              How it really works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Why does AI recommend some brands and not others?</h2>
            <p className="mt-3 text-stone-600 max-w-2xl mx-auto">
              It&apos;s not random, and it&apos;s not magic. An AI answer is built from two
              things, and both can be influenced.
            </p>
          </div>

          {/* The two doors */}
          <div className="grid md:grid-cols-2 gap-5 mb-10">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 mb-4">
                <Database className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-lg">1. What the model already learned</h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Models like ChatGPT were trained on a huge slice of the web. A brand
                that&apos;s mentioned often, on sources the model trusts, review
                sites, &ldquo;best of&rdquo; lists, news, communities, gets
                &ldquo;remembered&rdquo; and named in answers. Mentioned nowhere?
                The model simply doesn&apos;t know you exist.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 mb-4">
                <Globe className="h-5 w-5" />
              </span>
              <h3 className="font-semibold text-lg">2. What it reads live, right now</h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Newer assistants (Perplexity, AI Overviews, ChatGPT Search) pull
                live web pages while answering and cite them. If your page, or a
                page that names you, is clear, structured and trusted, it gets
                pulled into the answer. This is the part you can move fastest.
              </p>
            </div>
          </div>

          {/* Worked example with proof */}
          <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden">
            <div className="border-b border-stone-100 px-6 py-3 text-xs text-stone-500 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-violet-700" />
              Worked example · how a real AI answer is built
            </div>
            <div className="p-6 sm:p-8">
              {/* user question */}
              <div className="flex justify-end mb-4">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-700 text-white px-4 py-2.5 text-sm">
                  What&apos;s the best project management tool for a small team?
                </div>
              </div>
              {/* AI answer */}
              <div className="flex justify-start mb-2">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-stone-100 text-stone-800 px-4 py-3 text-sm leading-relaxed">
                  <p>For a small team, the most recommended options are:</p>
                  <ul className="mt-2 space-y-1">
                    <li>1. <span className="font-semibold">Trello</span>, simple and visual</li>
                    <li>2. <span className="font-semibold">Asana</span>, great for workflows</li>
                    <li>3. <span className="font-semibold">ClickUp</span>, all-in-one</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-stone-400 mb-6">Illustrative example of a typical AI answer.</p>

              {/* the why */}
              <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start rounded-2xl bg-[#FBF8F4] border border-stone-200 p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-900">Notice what&apos;s missing: your brand.</p>
                  <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                    Those three weren&apos;t picked by luck. They appear because
                    they&apos;re named across the review sites, listicles and threads
                    the model trusts, so it learned them as &ldquo;the answer.&rdquo;
                    If you&apos;re not on those sources, you&apos;re not in the
                    conversation, no matter how good your product is.
                  </p>
                </div>
              </div>

              {/* where answers come from */}
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-3">Where that answer came from</p>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {[
                      { icon: Star, label: 'Review sites' },
                      { icon: FileText, label: '“Best of” listicles' },
                      { icon: MessageSquare, label: 'Communities & forums' },
                      { icon: Globe, label: 'Your own site' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs text-stone-600">
                        <s.icon className="h-3.5 w-3.5 text-violet-700 shrink-0" />
                        {s.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center text-stone-300">
                    <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
                  </div>
                  <div className="flex items-center justify-center rounded-xl bg-violet-700 text-white px-5 py-3 text-sm font-medium text-center">
                    The AI&apos;s answer
                  </div>
                </div>
              </div>

              <p className="mt-6 text-sm text-stone-600">
                <span className="font-semibold text-stone-900">That&apos;s the whole game.</span>{' '}
                We measure exactly where you stand across these sources, show you who&apos;s
                winning and why, and hand you the specific fixes, on your site and off it,
                to get into the answer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── How it works ───────────────────── */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Find. Fix. Prove.</h2>
            <p className="mt-3 text-stone-600">Not just a diagnosis, the whole loop, end to end.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Search, step: '01', title: 'Find the gap',
                desc: 'We ask AI the real questions your customers ask and record whether you appear, who beats you, and on which engine.',
              },
              {
                icon: Target, step: '02', title: 'Fix it, on-site & off-site',
                desc: 'We generate the on-site content AI needs (FAQ, schema, comparisons) and surface the third-party pages naming competitors so you can get listed too.',
              },
              {
                icon: TrendingUp, step: '03', title: 'Prove it moved',
                desc: 'Re-scan and watch your visibility score climb. Real before/after, not promises.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-mono text-stone-300">{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── The difference ───────────────────── */}
      <section className="px-4 py-20 bg-white border-y border-stone-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Most AI-SEO tools stop at the easy half.</h2>
            <p className="mt-3 text-stone-600 max-w-2xl mx-auto">
              They write a blog and publish it to your own website, then call it
              done. But that&apos;s the part AI trusts least. The real wins are
              off your site.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* them */}
            <div className="rounded-2xl border border-stone-200 bg-[#FBF8F4] p-6">
              <p className="text-sm font-semibold text-stone-500 mb-4">Typical AI-SEO tool</p>
              <ul className="space-y-3 text-sm text-stone-600">
                {[
                  'Publishes blogs to your own site, and stops there',
                  'Ignores the third-party sources AI actually cites',
                  'Often $89+ / month',
                  'Implies AI visibility happens fast',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-stone-300 mt-0.5 shrink-0">•</span>{t}
                  </li>
                ))}
              </ul>
            </div>

            {/* us */}
            <div className="rounded-2xl border border-violet-300 ring-2 ring-violet-200 bg-white p-6">
              <p className="text-sm font-semibold text-violet-700 mb-4">SEO4AI</p>
              <ul className="space-y-3 text-sm text-stone-700">
                {[
                  'Publishes to your site too, in one click',
                  'AND shows you the off-site sources AI trusts, with outreach to get listed',
                  'Free to start · up to $49.99 / month',
                  'Honest: it takes weeks, here’s the real work, on-site and off',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── Engines ───────────────────── */}
      <section id="engines" className="px-4 py-20 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">One brand. Every AI answer engine.</h2>
          <p className="mt-3 text-stone-600 max-w-2xl mx-auto">
            Your customers don&apos;t use just one assistant. Track your brand across
            all of them, and unlock the citation-based engines that reveal <em>why</em>
            competitors win.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {ENGINES.map((e) => (
              <div
                key={e.name}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${
                  e.live
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-stone-200 bg-[#FBF8F4]'
                }`}
              >
                <span className={`text-sm font-semibold ${e.live ? 'text-violet-700' : 'text-stone-500'}`}>
                  {e.name}
                </span>
                {e.live ? (
                  <span className="rounded-full bg-violet-700 px-2 py-0.5 text-[10px] font-medium text-white">Live</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                    <Lock className="h-2.5 w-2.5" /> Soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Features ───────────────────── */}
      <section id="features" className="px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to win the answer</h2>
            <p className="mt-3 text-stone-600">Measurement and the fix, in one place.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Search, title: 'AI Visibility Score', desc: 'A clear 0–100 score for how often AI names your brand, weighted by position and sentiment.' },
              { icon: Target, title: 'Competitor gap', desc: 'See exactly which competitors AI picks instead of you, and on which questions.' },
              { icon: Quote, title: 'Off-site opportunity finder', desc: 'The review sites, listicles and communities AI trusts in your category, and a plan to get you listed on them.' },
              { icon: FileText, title: 'Write & publish', desc: 'Generate AI-optimized articles and publish them to your WordPress in one click, plus FAQ and schema for AI to read.' },
              { icon: ShieldCheck, title: 'Prioritised fix plan', desc: 'Ranked, specific actions by impact and effort, what to do first, and why.' },
              { icon: TrendingUp, title: 'Progress tracking', desc: 'Re-scan over time and prove your visibility actually moved.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6 hover:border-violet-200 transition-colors">
                <f.icon className="h-7 w-7 text-violet-700 mb-3" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Honesty / trust ───────────────────── */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto rounded-3xl border border-stone-200 bg-white p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">No magic. Just the truth, and the work.</h2>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Getting recommended by AI takes weeks, not minutes, anyone promising an
            instant fix is selling you something. Here&apos;s exactly what we do, and
            what we don&apos;t pretend to:
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-emerald-700 mb-3">We do this for you</p>
              <ul className="space-y-2.5 text-sm text-stone-600">
                {['Measure your visibility across AI engines', 'Pinpoint every gap vs competitors', 'Show the exact pages AI cites', 'Generate the on-site content AI needs', 'Draft the outreach to get you listed', 'Re-scan to prove it worked'].map((t) => (
                  <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />{t}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-500 mb-3">We&apos;re honest about</p>
              <ul className="space-y-2.5 text-sm text-stone-600">
                {['No tool can edit an AI model’s memory directly', 'Some wins are outreach we hand you ready-to-send', 'Durable visibility builds over weeks', 'We show the path, you (or we) walk it'].map((t) => (
                  <li key={t} className="flex gap-2"><span className="text-stone-400 shrink-0 mt-0.5">•</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── Pricing ───────────────────── */}
      <section id="pricing" className="px-4 py-20 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Start free. Upgrade for more engines.</h2>
            <p className="mt-3 text-stone-600">The more engines you track, the more of the picture you see.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {[
              {
                name: 'Starter', price: 'Free', suffix: 'forever', engines: '1 engine (ChatGPT)',
                highlight: false,
                features: ['1 brand', '3 scans / month', 'AI Visibility Score', 'Competitor gap (basic)'],
              },
              {
                name: 'Pro', price: '$24.99', suffix: '/mo', engines: 'ChatGPT + Gemini',
                highlight: true, badge: 'Most popular',
                features: ['3 brands', '15 scans / month', 'ChatGPT + Gemini engines', 'Competitor gap analysis', 'Off-site opportunity finder', 'Write 5 AI SEO articles / mo · publish 1 live to WordPress', 'Progress history'],
              },
              {
                name: 'Max', price: '$49.99', suffix: '/mo', engines: 'ChatGPT + Gemini + Claude',
                highlight: false, badge: 'Full power',
                features: ['10 brands', '60 scans / month', 'ChatGPT + Gemini + Claude engines', 'Write 20 AI SEO articles / mo · publish 3 live to WordPress', 'Fix plan + outreach drafts', 'Priority support'],
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-2xl border bg-[#FBF8F4] p-6 ${
                  p.highlight ? 'border-violet-300 ring-2 ring-violet-200 bg-white' : 'border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {p.badge && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${p.highlight ? 'bg-violet-700 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-stone-500"> {p.suffix}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-violet-700">{p.engines}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-stone-600 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />{f}</li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6">
                  <Button
                    className={`w-full ${p.highlight ? 'bg-violet-700 hover:bg-violet-800 text-white' : 'bg-stone-900 hover:bg-stone-800 text-white'}`}
                  >
                    {p.price === 'Free' ? 'Get started free' : `Choose ${p.name}`}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Final CTA ───────────────────── */}
      <section className="px-4 py-24">
        <div className="max-w-3xl mx-auto text-center rounded-3xl bg-violet-700 px-6 py-14 text-white">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Find out what AI says about you</h2>
          <p className="mt-4 text-violet-100 max-w-lg mx-auto">
            It takes 60 seconds. You might be fine. You might be invisible. Either
            way, you should know before your competitor does.
          </p>
          <Link href="/signup" className="inline-block mt-8">
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 h-12 px-8 text-base font-semibold">
              Run my free scan <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ───────────────────── Footer ───────────────────── */}
      <footer className="border-t border-stone-200 bg-white px-4 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Image src="/logo.png" alt="SEO4AI, AI Visibility & Brand Intelligence" width={170} height={53} className="h-10 w-auto mb-3" />
              <p className="text-sm text-stone-500 max-w-xs leading-relaxed">
                The visibility layer for AI search. See whether ChatGPT, Gemini and Perplexity
                recommend your brand, and fix it.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">Product</p>
              <ul className="space-y-2 text-sm text-stone-600">
                <li><a href="#why" className="hover:text-stone-900 transition-colors">How it works</a></li>
                <li><a href="#engines" className="hover:text-stone-900 transition-colors">Engines</a></li>
                <li><a href="#features" className="hover:text-stone-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-stone-900 transition-colors">Pricing</a></li>
                <li><Link href="/index" className="hover:text-stone-900 transition-colors">AI Visibility Index</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">Legal</p>
              <ul className="space-y-2 text-sm text-stone-600">
                <li><Link href="/terms" className="hover:text-stone-900 transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-stone-900 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/refund" className="hover:text-stone-900 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">Contact</p>
              <ul className="space-y-2 text-sm text-stone-600">
                <li><a href="mailto:support@seo4ai.app" className="hover:text-stone-900 transition-colors">support@seo4ai.app</a></li>
                <li className="text-stone-500">Built &amp; operated by SEO4AI</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-400">
            <p>&copy; 2026 SEO4AI. All rights reserved.</p>
            <p>Cancel anytime · <Link href="/refund" className="underline hover:text-stone-600">Refund Policy</Link></p>
          </div>
        </div>
      </footer>
    </div>
  )
}
