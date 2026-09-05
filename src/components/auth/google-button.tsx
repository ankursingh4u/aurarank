'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

/**
 * Google sign-in is only rendered when it is known to work.
 *
 * OAuth necessarily returns through Supabase, which sends the user to the
 * project's Site URL whenever the requested redirect is not in its allow-list.
 * While that setting points at localhost:3000, clicking this button ends on a
 * page that cannot load, and the visitor has no way back. Email sign-in and
 * sign-up do not touch that path and work regardless.
 *
 * A broken option is worse than a missing one, so the button hides itself
 * unless NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is exactly "true". Set that after
 * Supabase → Authentication → URL Configuration has Site URL
 * https://seo4ai.app and https://seo4ai.app/** in Redirect URLs; no code
 * change is needed to bring it back.
 */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'
const GOOGLE_ENABLED = GOOGLE_AUTH_ENABLED

export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!GOOGLE_ENABLED) return null

  async function signInWithGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    // On success the browser is redirected to Google, so we only land here on error.
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        variant="outline"
        className="w-full bg-white border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900 h-10"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <span className="mr-2"><GoogleIcon /></span>}
        {label}
      </Button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}
