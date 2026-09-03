import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/site'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Light per-IP throttle so the public register endpoint can't be hammered.
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 8
const hits = new Map<string, { count: number; windowStart: number }>()

function throttled(ip: string): boolean {
  const now = Date.now()
  const e = hits.get(ip)
  if (!e || now - e.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now })
    return false
  }
  e.count++
  return e.count > MAX_PER_WINDOW
}

function confirmEmailHtml(link: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h1 style="font-size:20px;color:#1c1917;margin-bottom:8px;">Confirm your email</h1>
      <p style="color:#57534e;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Welcome to SEO4AI! Click the button below to verify your email and activate your account.
      </p>
      <a href="${link}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Confirm my email
      </a>
      <p style="color:#a8a29e;font-size:12px;line-height:1.6;margin-top:24px;">
        If the button doesn't work, paste this link into your browser:<br>
        <span style="color:#6d28d9;word-break:break-all;">${link}</span>
      </p>
      <p style="color:#a8a29e;font-size:12px;margin-top:24px;">If you didn't create this account, you can ignore this email.</p>
    </div>`
}

/**
 * Registration with REAL email verification, but the confirmation email is sent
 * via Resend (our verified domain) instead of Supabase's built-in mailer — so we
 * get proper verification AND avoid Supabase's tiny email rate limit.
 *
 * Flow: admin.generateLink() creates the user (unconfirmed) and returns the
 * confirmation link WITHOUT sending anything; we email that link ourselves.
 * The user stays unconfirmed (can't log in / can't farm free plans) until they
 * click it.
 */
export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password } = await request.json()
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (throttled(ip)) {
      return NextResponse.json({ error: 'Too many sign-ups from this network. Please try again later.' }, { status: 429 })
    }

    // Redirect back to wherever the user actually signed up from.
    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin

    const admin = createAdminClient()

    // Creates the user (unconfirmed) and returns the confirmation link.
    // Does NOT send an email — we send it via Resend below.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: `${origin}/auth/callback` },
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Try signing in instead.' },
          { status: 409 }
        )
      }
      if (msg.includes('password')) {
        return NextResponse.json({ error: 'Password is too weak. Use at least 8 characters.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message || 'Sign-up failed.' }, { status: 400 })
    }

    // Build the confirmation link against our own domain rather than emailing
    // Supabase's action_link. That link redirects via Supabase, which replaces
    // the redirect target with the project's Site URL whenever the requested one
    // is not in the Redirect URL allow-list — a project setting this app cannot
    // read, and which sent every confirmed user to localhost. /auth/confirm
    // exchanges the token server-side, so no Supabase setting can misdirect it.
    const tokenHash = data?.properties?.hashed_token
    const link = tokenHash
      ? `${getAppUrl()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup`
      : data?.properties?.action_link

    if (!link) {
      return NextResponse.json({ error: 'Could not generate a confirmation link. Please try again.' }, { status: 500 })
    }

    await sendEmail({
      to: email,
      subject: 'Confirm your SEO4AI account',
      html: confirmEmailHtml(link),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Sign-up failed. Please try again.' }, { status: 500 })
  }
}
