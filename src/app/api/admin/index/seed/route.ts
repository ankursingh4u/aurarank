import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin'
import { resultToRow, type CompanyResult } from '@/lib/index-scan'
import seed from '@/data/ai-visibility-index.json'

export const dynamic = 'force-dynamic'

/**
 * One-time import of the bootstrap scan results into the database, so the first
 * ten companies do not have to be re-scanned (and re-paid for) through the UI.
 *
 * Safe to run more than once: companies already present are skipped rather than
 * overwritten, so a fresher scan is never clobbered by the seed file.
 */
export async function POST() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = seed as CompanyResult[]
  if (!results.length) {
    return NextResponse.json({ error: 'Seed file is empty' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existingRows } = await admin.from('index_entries').select('company')
  const existing = new Set((existingRows || []).map((r) => r.company))

  const toInsert = results
    .filter((r) => !existing.has(r.company))
    .map((r) => ({
      ...resultToRow(r, []),
      // The scan config is recoverable from the result: the breakdown lists every
      // competitor that was tested, whether or not it was ever mentioned.
      competitors: (r.competitorBreakdown || []).map((c) => c.name),
    }))

  if (!toInsert.length) {
    return NextResponse.json({ imported: 0, skipped: results.length })
  }

  const { error } = await admin.from('index_entries').insert(toInsert)
  if (error) {
    console.error('POST /api/admin/index/seed error:', error)
    return NextResponse.json({ error: 'Failed to import seed data' }, { status: 500 })
  }

  return NextResponse.json({
    imported: toInsert.length,
    skipped: results.length - toInsert.length,
  })
}
