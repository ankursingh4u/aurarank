import { createClient } from '@/lib/supabase/server'
import { getPublicSiteUrl } from '@/lib/site'
import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Confirms an email link without going through Supabase's redirect.
 *
 * The older flow emailed Supabase's own action_link, which redirects via
 * /auth/v1/verify. Supabase only honours the redirect_to on that link when it
 * matches the project's Redirect URL allow-list, and silently substitutes the
 * project Site URL when it does not. A project whose Site URL still points at
 * localhost therefore sends every confirmed user to a dead address, no matter
 * what the application asked for. That is a project setting the app cannot read
 * or change.
 *
 * Here the emailed link points at this route on our own domain, and the token is
 * exchanged server-side. Supabase never performs the redirect, so no allow-list
 * or Site URL value can misdirect a user.
 *
 * This does not cover OAuth: Google sign-in still returns through Supabase and
 * still depends on the allow-list.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  // Always the canonical site, never the request origin: the whole point is to
  // stop a host we did not choose from deciding where the user lands.
  const site = getPublicSiteUrl()

  // Only allow relative paths, so a crafted link cannot bounce a freshly
  // authenticated user to another site.
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  const fail = (message: string) =>
    NextResponse.redirect(`${site}/login?error=${encodeURIComponent(message)}`)

  if (!tokenHash || !type) {
    return fail('Invalid confirmation link. Please sign up again.')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) {
    return fail(error.message || 'Confirmation failed. The link may have expired.')
  }

  return NextResponse.redirect(`${site}${target}`)
}
