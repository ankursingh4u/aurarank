'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session?.user))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FBF8F4]/85 backdrop-blur-lg border-b border-stone-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo-wordmark.png" alt="SEO4AI" width={132} height={41} className="h-9 w-auto" priority />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/ai-visibility-index" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Index</Link>
            <a href="#why" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">How it works</a>
            <a href="#engines" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Engines</a>
            <a href="#pricing" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Pricing</a>
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {loggedIn ? (
              <Link href="/dashboard">
                <Button className="bg-violet-700 hover:bg-violet-800 text-white shadow-sm">
                  Go to dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-stone-700 hover:text-stone-900 hover:bg-stone-200/60">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-violet-700 hover:bg-violet-800 text-white shadow-sm">
                    Run my free scan
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: primary button + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {loggedIn ? (
              <Link href="/dashboard">
                <Button size="sm" className="bg-violet-700 hover:bg-violet-800 text-white text-xs px-3 h-8">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button size="sm" className="bg-violet-700 hover:bg-violet-800 text-white text-xs px-3 h-8">
                  Free scan
                </Button>
              </Link>
            )}
            <button
              className="text-stone-600 hover:text-stone-900 p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 space-y-1">
            <Link href="/ai-visibility-index" className="block text-stone-600 hover:text-stone-900 px-2 py-2.5 rounded-lg hover:bg-stone-200/50 transition-colors" onClick={() => setMobileOpen(false)}>Index</Link>
            <a href="#why" className="block text-stone-600 hover:text-stone-900 px-2 py-2.5 rounded-lg hover:bg-stone-200/50 transition-colors" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#engines" className="block text-stone-600 hover:text-stone-900 px-2 py-2.5 rounded-lg hover:bg-stone-200/50 transition-colors" onClick={() => setMobileOpen(false)}>Engines</a>
            <a href="#features" className="block text-stone-600 hover:text-stone-900 px-2 py-2.5 rounded-lg hover:bg-stone-200/50 transition-colors" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" className="block text-stone-600 hover:text-stone-900 px-2 py-2.5 rounded-lg hover:bg-stone-200/50 transition-colors" onClick={() => setMobileOpen(false)}>Pricing</a>
            <div className="pt-2 border-t border-stone-200 mt-2">
              {loggedIn ? (
                <Link href="/dashboard" className="block text-violet-700 font-medium px-2 py-2.5 hover:text-violet-800 transition-colors" onClick={() => setMobileOpen(false)}>
                  Go to dashboard
                </Link>
              ) : (
                <Link href="/login" className="block text-stone-700 px-2 py-2.5 hover:text-stone-900 transition-colors" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
