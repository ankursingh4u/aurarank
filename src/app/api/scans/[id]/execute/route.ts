import { createClient } from '@/lib/supabase/server'
import { runScan } from '@/lib/scan-runner'
import { sendEmail, scanCompleteEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scanId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ownership is enforced by RLS — runScan will fail to read a scan the user
    // does not own.
    const result = await runScan(userDb(user.id), scanId)

    // Send scan complete email notification
    try {
      if (user.email) {
        const email = scanCompleteEmail(
          result.brandName,
          result.visibilityScore,
          result.mentionCount,
          result.opportunitiesFound
        )
        await sendEmail({ to: user.email, subject: email.subject, html: email.html })
      }
    } catch (emailError) {
      console.error('Failed to send scan complete email:', emailError)
    }

    return NextResponse.json({
      scanId: result.scanId,
      visibilityScore: result.visibilityScore,
      mentionCount: result.mentionCount,
      competitorMentionCount: result.competitorMentionCount,
      promptsProcessed: result.promptsProcessed,
      opportunitiesFound: result.opportunitiesFound,
    })
  } catch (error) {
    const { id: scanId } = await params
    // Best effort: mark the scan failed. The user is re-resolved because the
    // outer scope is not reachable from this catch.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await userDb(user.id).from('scans').update({ status: 'failed' }).eq('id', scanId)
    console.error('Scan execution failed:', error)
    return NextResponse.json({ error: 'Scan execution failed' }, { status: 500 })
  }
}
