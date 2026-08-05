import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog - AI Visibility & SEO Insights',
  description:
    'Learn how to improve your brand visibility across AI search engines like ChatGPT, Perplexity, Claude, and Gemini. Expert guides and actionable tips.',
}

const posts = [
  {
    slug: 'chatgpt-saas-recommendations-study',
    title: 'We Asked ChatGPT for Software Recommendations 250 Times. Here Is Who It Named.',
    date: 'August 4, 2026',
    readingTime: '6 min read',
    excerpt:
      'We scanned 10 well-known SaaS brands to see how often ChatGPT names them without being prompted. Most were named every time. Two of the most loved products in tech barely registered.',
  },
  {
    slug: 'how-to-rank-on-chatgpt',
    title: 'How to Rank on ChatGPT: The Complete Guide to AI Visibility',
    date: 'January 15, 2025',
    readingTime: '8 min read',
    excerpt:
      'AI search is replacing traditional search for millions of users. Learn the exact steps to get your brand recommended by ChatGPT and other AI models.',
  },
  {
    slug: 'ai-seo-guide',
    title: 'AI SEO: Why Your Business Needs to Optimize for AI Search in 2025',
    date: 'January 8, 2025',
    readingTime: '7 min read',
    excerpt:
      'The shift from Google to AI-powered search is accelerating. Discover what businesses are losing by ignoring AI search and how to adapt your strategy.',
  },
  {
    slug: 'chatgpt-vs-google',
    title: 'ChatGPT vs Google: How AI Search is Changing Brand Discovery',
    date: 'January 2, 2025',
    readingTime: '5 min read',
    excerpt:
      'Compare traditional SEO with AI visibility and understand the fundamental differences in how consumers discover brands through AI vs search engines.',
  },
]

export default function BlogPage() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Blog</h1>
        <p className="text-stone-500 text-lg mb-12">
          Insights on AI search visibility, brand intelligence, and the future of SEO.
        </p>

        <div className="space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-stone-200 pb-10 last:border-0">
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="flex items-center gap-3 text-sm text-stone-500 mb-3">
                  <time>{post.date}</time>
                  <span className="text-stone-300">|</span>
                  <span>{post.readingTime}</span>
                </div>
                <h2 className="text-2xl font-semibold mb-3 group-hover:text-violet-700 transition-colors">
                  {post.title}
                </h2>
                <p className="text-stone-500 leading-relaxed">{post.excerpt}</p>
                <span className="inline-block mt-4 text-violet-700 text-sm font-medium group-hover:underline">
                  Read more &rarr;
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
