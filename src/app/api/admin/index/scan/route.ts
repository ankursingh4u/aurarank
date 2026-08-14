import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dbAdmin } from '@/lib/pgq'
import { requireAdmin } from '@/lib/admin'
import { scanIndexCompany, resultToRow } from '@/lib/index-scan'
import type { EngineKey } from '@/lib/engines'

export const dynamic = 'force-dynamic'
// A 25-prompt scan takes roughly 60-90s, so one company per request. The admin UI
// loops over companies client-side, which also gives it per-company progress.
export const maxDuration = 300

const ScanSchema = z.object({
  company: z.string().trim().min(1),
  engines: z.array(z.enum(['openai', 'gemini', 'claude'])).min(1).optional(),
})

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ScanSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'company is required' }, { status: 400 })
  }
  const { company } = parsed.data
  const engines = (parsed.data.engines || ['openai']) as EngineKey[]

  const admin = dbAdmin()

  const { data: entry } = await admin
    .from('index_entries')
    .select('company, industry, competitors')
    .eq('company', company)
    .single()

  if (!entry) {
    return NextResponse.json({ error: `${company} is not in the index` }, { status: 404 })
  }

  await admin
    .from('index_entries')
    .update({ status: 'running', error_message: null })
    .eq('company', company)

  try {
    const { result, rows } = await scanIndexCompany(
      {
        name: entry.company,
        industry: entry.industry,
        competitors: entry.competitors || [],
      },
      engines
    )

    const { error } = await admin
      .from('index_entries')
      .update(resultToRow(result, rows))
      .eq('company', company)

    if (error) throw error

    return NextResponse.json({
      company: result.company,
      score: result.score,
      label: result.label,
      discoveryMentions: result.discoveryMentions,
      discoveryPrompts: result.discoveryPrompts,
      topCompetitor: result.topCompetitor,
      topCompetitorMentions: result.topCompetitorMentions,
      erroredPrompts: result.erroredPrompts,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed'
    console.error(`Index scan failed for ${company}:`, err)
    await admin
      .from('index_entries')
      .update({ status: 'failed', error_message: message.slice(0, 500) })
      .eq('company', company)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
