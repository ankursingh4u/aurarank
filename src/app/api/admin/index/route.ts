import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin'
import { rowToEntry } from '@/lib/index-scan'

export const dynamic = 'force-dynamic'

const CompanySchema = z.object({
  company: z.string().trim().min(1).max(80),
  industry: z.string().trim().min(1).max(120),
  competitors: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
})

/** Lists every entry, including ones not yet scanned (admin view). */
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('index_entries')
    .select('*')
    .order('score', { ascending: false, nullsFirst: false })
    .order('company')

  if (error) {
    console.error('GET /api/admin/index error:', error)
    return NextResponse.json({ error: 'Failed to load index' }, { status: 500 })
  }

  return NextResponse.json({
    entries: (data || []).map((r) => ({
      ...rowToEntry(r),
      competitors: r.competitors || [],
      errorMessage: r.error_message,
    })),
  })
}

/** Adds a company to the index. Does not scan it — that is a separate call. */
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CompanySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Company, industry and at least one competitor are required' },
      { status: 400 }
    )
  }
  const { company, industry, competitors } = parsed.data

  const admin = createAdminClient()
  const { error } = await admin.from('index_entries').insert({
    company,
    industry,
    competitors,
    status: 'pending',
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `${company} is already in the index` }, { status: 409 })
    }
    console.error('POST /api/admin/index error:', error)
    return NextResponse.json({ error: 'Failed to add company' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, company })
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = request.nextUrl.searchParams.get('company')
  if (!company) return NextResponse.json({ error: 'company is required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('index_entries').delete().eq('company', company)
  if (error) {
    console.error('DELETE /api/admin/index error:', error)
    return NextResponse.json({ error: 'Failed to remove company' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
