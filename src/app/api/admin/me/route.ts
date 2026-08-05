import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// Lets the dashboard show the Index link only to admins, without shipping the
// ADMIN_EMAILS list to the browser.
export async function GET() {
  const user = await requireAdmin()
  return NextResponse.json({ isAdmin: !!user })
}
