import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().min(1).max(100).optional(),
  competitors: z.array(z.string().max(100)).max(3).optional(),
  marketRegion: z.object({
    type: z.enum(['global', 'country', 'state', 'city']),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  autoScan: z.enum(['off', 'weekly', 'daily']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { data, error } = await db
      .from('brands')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const body = await request.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.brandName) updateData.brand_name = validation.data.brandName
    if (validation.data.website !== undefined) updateData.website = validation.data.website || null
    if (validation.data.industry) updateData.industry = validation.data.industry
    if (validation.data.competitors) updateData.competitors = validation.data.competitors.filter(c => c.trim() !== '')
    if (validation.data.marketRegion) updateData.market_region = validation.data.marketRegion

    // Auto-scan: Pro = weekly, Max = weekly/daily. Enforce server-side.
    if (validation.data.autoScan !== undefined) {
      const next = validation.data.autoScan
      if (next !== 'off') {
        const { data: userPlan } = await db
          .from('user_plans')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        const plan = userPlan?.plan || 'starter'
        const allowed = plan === 'max' ? ['weekly', 'daily'] : plan === 'pro' ? ['weekly'] : []
        if (!allowed.includes(next)) {
          return NextResponse.json({
            error: next === 'daily'
              ? 'Daily auto-scans require the Max plan.'
              : 'Scheduled scans require the Pro or Max plan.',
          }, { status: 403 })
        }
      }
      updateData.auto_scan = next
    }

    const { data, error } = await db
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { error } = await db.from('brands').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
  }
}
