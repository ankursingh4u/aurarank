'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard, Settings, LogOut, Menu, Eye, CreditCard, Home, BarChart3
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/', label: 'Home page', icon: Home },
]

const adminNavItem = { href: '/dashboard/index-admin', label: 'Visibility Index', icon: BarChart3 }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email || '')
    })
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Eye className="h-6 w-6 text-violet-700" />
          <span className="text-xl font-bold bg-gradient-to-r from-violet-700 to-violet-400 bg-clip-text text-transparent">
            SEO4AI
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {(isAdmin ? [...navItems.slice(0, 1), adminNavItem, ...navItems.slice(1)] : navItems).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-500/10 text-violet-700'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-stone-200">
        <div className="text-xs text-stone-500 truncate mb-3 px-3">{userEmail}</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-500 hover:text-red-400 hover:bg-stone-100 w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FBF8F4] text-stone-900">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-56 lg:flex-col border-r border-stone-200 bg-[#FBF8F4]">
        <SidebarContent />
      </aside>

      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-4 bg-[#FBF8F4]/80 backdrop-blur-lg border-b border-stone-200 px-4 py-3">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-md h-10 w-10 text-stone-500 hover:bg-stone-100 transition-colors">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0 bg-[#FBF8F4] border-stone-200">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="text-lg font-bold bg-gradient-to-r from-violet-700 to-violet-400 bg-clip-text text-transparent">
          SEO4AI
        </span>
      </div>

      <main className="lg:pl-56">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
