import { createClient } from '@/lib/supabase/server'

/**
 * Emails allowed to manage the AI Visibility Index, from the ADMIN_EMAILS env var
 * (comma separated). Kept in env rather than the database so an attacker who can
 * write to a user row still cannot grant themselves admin.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowed = adminEmails()
  // An empty allowlist grants nobody access — failing closed matters more here
  // than convenience, since these routes spend money and publish public data.
  if (allowed.length === 0) return false
  return allowed.includes(email.toLowerCase())
}

/** Returns the signed-in user when they are an admin, otherwise null. */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return null
  return user
}
