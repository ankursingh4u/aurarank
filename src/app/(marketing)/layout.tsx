import { Navbar } from '@/components/landing/navbar'
import Link from 'next/link'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#FBF8F4] text-stone-900">
      <Navbar />
      <main className="pt-16">{children}</main>
      <footer className="border-t border-stone-200 bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link
              href="/"
              className="text-lg font-bold bg-gradient-to-r from-violet-700 to-violet-400 bg-clip-text text-transparent"
            >
              SEO4AI
            </Link>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-500">
              <Link href="/ai-visibility-index" className="hover:text-stone-900 transition-colors">AI Visibility Index</Link>
              <Link href="/#pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
              <Link href="/blog" className="hover:text-stone-900 transition-colors">Blog</Link>
              <Link href="/terms" className="hover:text-stone-900 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-stone-900 transition-colors">Privacy</Link>
              <Link href="/refund" className="hover:text-stone-900 transition-colors">Refund Policy</Link>
              <a href="mailto:support@seo4ai.app" className="hover:text-stone-900 transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-stone-400">
            <p>&copy; 2026 SEO4AI. All rights reserved. · Built &amp; operated by SEO4AI</p>
            <p>Cancel anytime · billing questions welcome</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
