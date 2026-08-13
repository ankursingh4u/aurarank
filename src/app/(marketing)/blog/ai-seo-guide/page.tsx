import { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { articleSchema, breadcrumbSchema, graph } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'AI SEO: Why Your Business Needs to Optimize for AI Search in 2025',
  description:
    'The shift from Google to AI search is accelerating. Learn what businesses lose by ignoring AI search and how to adapt your SEO strategy for ChatGPT, Perplexity, and more.',
  keywords: [
    'AI SEO',
    'AI search optimization',
    'ChatGPT for business',
    'AI search strategy',
    'future of SEO',
  ],
}

const SCHEMA = graph(
  articleSchema({
    headline: 'AI SEO: Why Your Business Needs to Optimize for AI Search in 2025',
    description: 'The shift from Google to AI search is accelerating. Learn what businesses lose by ignoring AI search and how to adapt your SEO strategy for ChatGPT, Perplexity, and more.',
    slug: 'ai-seo-guide',
    datePublished: '2025-01-08',
  }),
  breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'AI SEO: Why Your Business Needs to Optimize for AI Search in 2025', path: '/blog/ai-seo-guide' },
  ])
)

export default function AISEOGuidePage() {
  return (
    <article className="py-20 px-4">
      <JsonLd data={SCHEMA} />
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 text-sm text-stone-500 mb-4">
            <time>January 8, 2025</time>
            <span className="text-stone-300">|</span>
            <span>7 min read</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            AI SEO: Why Your Business Needs to Optimize for AI Search in 2025
          </h1>
          <p className="text-stone-500 text-sm">
            By the SEO4AI Team
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-slate max-w-none space-y-6">
          <p className="text-lg text-stone-700 leading-relaxed">
            For two decades, search engine optimization meant one thing: ranking higher on Google.
            Businesses invested billions in keywords, backlinks, and content strategies designed to
            please Google&apos;s algorithm. But the rules of discovery are changing fast. AI-powered
            search tools like ChatGPT, Perplexity, Claude, and Gemini are fundamentally reshaping
            how consumers find, evaluate, and choose products and services.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            The Shift From Google to AI Search
          </h2>
          <p className="text-stone-500 leading-relaxed">
            Consider the numbers. ChatGPT reached 100 million users faster than any consumer
            application in history. Perplexity processes millions of search queries daily and is
            growing at triple-digit rates. Google itself has integrated AI overviews into its search
            results, acknowledging that users increasingly want synthesized answers rather than a
            list of links to click through.
          </p>
          <p className="text-stone-500 leading-relaxed">
            This is not a marginal shift. When a user asks an AI assistant &quot;What is the best CRM
            for small businesses?&quot; they receive a direct, authoritative-sounding answer with
            specific brand recommendations. They do not see ten blue links. They do not browse
            multiple websites. They trust the AI&apos;s curated response and often make their
            decision right there.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            The Statistics That Should Concern Every Business
          </h2>
          <p className="text-stone-500 leading-relaxed">
            The data paints a clear picture of where attention is heading:
          </p>
          <ul className="list-disc pl-6 space-y-3 text-stone-500">
            <li>
              Over <strong className="text-stone-800">40% of Gen Z and Millennials</strong> now
              prefer AI assistants over traditional search engines for product research.
            </li>
            <li>
              AI-powered search tools are projected to handle{' '}
              <strong className="text-stone-800">25% of all search queries</strong> by the end of
              2025, up from single digits in 2023.
            </li>
            <li>
              Businesses that appear in AI recommendations see{' '}
              <strong className="text-stone-800">3-5x higher conversion rates</strong> compared to
              traditional search clicks, because users already trust the AI&apos;s recommendation.
            </li>
            <li>
              <strong className="text-stone-800">Zero-click searches</strong> now account for over
              60% of Google queries, and AI search accelerates this trend dramatically.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            What Businesses Lose by Ignoring AI Search
          </h2>
          <p className="text-stone-500 leading-relaxed">
            If your brand does not show up when someone asks ChatGPT or Perplexity about your
            industry, the consequences compound over time:
          </p>
          <ul className="list-disc pl-6 space-y-3 text-stone-500">
            <li>
              <strong className="text-stone-800">Lost discovery</strong> &mdash; Potential customers
              never learn your brand exists. They are recommended your competitors instead.
            </li>
            <li>
              <strong className="text-stone-800">Eroded trust</strong> &mdash; When AI models
              consistently recommend competitors but not you, it creates a perception gap. Customers
              assume the AI knows best.
            </li>
            <li>
              <strong className="text-stone-800">Wasted ad spend</strong> &mdash; You may be
              spending heavily on Google Ads and social media campaigns to drive awareness, while AI
              search quietly funnels high-intent users to your competitors for free.
            </li>
            <li>
              <strong className="text-stone-800">Competitive moat</strong> &mdash; Early movers who
              establish strong AI visibility now will be harder to displace as AI models reinforce
              their training data over successive updates.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-stone-900">
            How to Adapt Your Strategy for AI Search
          </h2>
          <p className="text-stone-500 leading-relaxed">
            Optimizing for AI search requires a different mindset than traditional SEO. Here is how
            to start:
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-800">
            Measure Your Starting Point
          </h3>
          <p className="text-stone-500 leading-relaxed">
            You cannot improve what you do not measure. Systematically query AI models with the
            prompts your customers use and document where your brand appears (or does not). SEO4AI
            automates this across the assistants we scan, giving you a baseline AI
            Visibility Score and competitor comparison.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-800">
            Build an AI-Friendly Content Ecosystem
          </h3>
          <p className="text-stone-500 leading-relaxed">
            AI models learn from the web. Ensure your brand is mentioned positively and frequently
            across authoritative sources. This means investing in digital PR, earning reviews on
            major platforms, contributing expert content to industry publications, and maintaining
            a well-structured website with clear, factual information about your products and
            services.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-800">
            Think in Conversations, Not Keywords
          </h3>
          <p className="text-stone-500 leading-relaxed">
            Traditional SEO optimizes for keywords. AI SEO requires you to think about the
            conversational queries people use with AI assistants. These are often longer, more
            specific, and more intent-driven. Create content that directly answers these
            conversational queries in a clear, authoritative voice.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-800">
            Monitor Competitor AI Visibility
          </h3>
          <p className="text-stone-500 leading-relaxed">
            Understanding where competitors appear and you do not reveals your biggest opportunities.
            If a competitor consistently shows up for prompts related to your core offering, analyze
            what online presence they have that you lack and close the gap.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-800">
            Track Progress Over Time
          </h3>
          <p className="text-stone-500 leading-relaxed">
            AI models are updated regularly. Your visibility can change with each update. Run
            recurring scans to track your AI Visibility Score over time, measure the impact of your
            efforts, and adjust your strategy based on real data rather than guesswork.
          </p>

          {/* CTA */}
          <div className="mt-16 bg-gradient-to-br from-indigo-950/80 to-violet-950/80 border border-violet-500/20 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-bold mb-3 text-stone-900">
              Check Your AI Visibility Score for Free
            </h2>
            <p className="text-stone-500 mb-6 max-w-lg mx-auto">
              See how your brand performs across ChatGPT, Perplexity, Claude, and Gemini. Get
              actionable recommendations to improve your AI search presence.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-violet-700 hover:bg-violet-800 text-white font-medium px-8 py-3 transition-colors"
            >
              Start Free Scan &rarr;
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
