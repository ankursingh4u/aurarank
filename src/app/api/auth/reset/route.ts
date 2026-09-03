import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/site'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Same shape of throttle as the register route: this endpoint emails whoever is
// named, so it must not be usable to spam an address.
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 8
const hits = new Map<string, { count: number; windowStart: number }>()

function throttled(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  return entry.count > MAX_PER_WINDOW
}

function resetEmailHtml(link: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h1 style="font-size:20px;color:#1c1917;margin-bottom:8px;">Reset your password</h1>
      <p style="color:#57534e;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Click the button below to choose a new password for your SEO4AI account. The link expires in one hour.
      </p>
      <a href="${link}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Set a new password
      </a>
      <p style="color:#a8a29e;font-size:12px;line-height:1.6;margin-top:24px;">
        If the button doesn't work, paste this link into your browser:<br>
        <span style="color:#6d28d9;word-break:break-all;">${link}</span>
      </p>
      <p style="color:#a8a29e;font-size:12px;margin-top:24px;">If you didn't request this, you can ignore this email. Your password will not change.</p>
    </div>`
}

/**
 * Sends a password reset link pointing at our own domain.
 *
 * The browser client's resetPasswordForEmail sends Supabase's own link, whose
 * redirect Supabase replaces with the project Site URL whenever the requested
 * target is not in the Redirect URL allow-list. That setting currently points at
 * localhost, so reset emails sent that way land nowhere. Generating the link
 * here and emailing it via Resend keeps the whole journey on seo4ai.app.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (throttled(ip)) {
      return NextResponse.json({ error: 'Too many reset requests. Please try again later.' }, { status: 429 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })

    // Deliberately reports success even when the address has no account, so this
    // endpoint cannot be used to discover which emails are registered.
    if (error || !data?.properties?.hashed_token) {
      if (error) console.error('Password reset link generation failed:', error.message)
      return NextResponse.json({ ok: true })
    }

    const link =
      `${getAppUrl()}/auth/confirm` +
      `?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
      `&type=recovery&next=${encodeURIComponent('/dashboard/settings')}`

    await sendEmail({
      to: email,
      subject: 'Reset your SEO4AI password',
      html: resetEmailHtml(link),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Password reset error:', err)
    return NextResponse.json({ error: 'Could not send the reset email. Please try again.' }, { status: 500 })
  }
}
