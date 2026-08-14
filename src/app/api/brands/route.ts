import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'
import { z } from 'zod'
import { PLANS } from '@/lib/payment'

export const dynamic = 'force-dynamic'

const marketRegionSchema = z.object({
  type: z.enum(['global', 'country', 'state', 'city']).default('global'),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
}).optional()

const brandSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required').max(100),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  industry: z.string().min(1, 'Industry is required').max(100),
  competitors: z.array(z.string().max(100)).max(3, 'Maximum 3 competitors allowed').default([]),
  marketRegion: marketRegionSchema,
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: 'Authentication failed: ' + authError.message }, { status: 401 })
    }
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const db = userDb(user.id)

    const { data, error } = await db
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('GET /api/brands error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/brands error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch brands'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ error: 'Authentication failed: ' + authError.message }, { status: 401 })
    }
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const db = userDb(user.id)

    // Server-side brand limit enforcement
    const { data: userPlan } = await db
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = (userPlan?.plan as keyof typeof PLANS) || 'starter'
    const planConfig = PLANS[plan] || PLANS.starter

    const { count: brandCount } = await db
      .from('brands')
      .select('id', { count: 'exact', head: true })

    if (brandCount !== null && brandCount >= planConfig.brandLimit) {
      return NextResponse.json({
        error: `Brand limit reached (${brandCount}/${planConfig.brandLimit}). Upgrade your plan to add more brands.`,
      }, { status: 403 })
    }

    const body = await request.json()
    const validation = brandSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    const { brandName, website, industry, competitors, marketRegion } = validation.data

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      brand_name: brandName,
      website: website || null,
      industry,
      competitors: competitors.filter(c => c.trim() !== ''),
    }

    // Try inserting with market_region first, fall back without it
    if (marketRegion) {
      insertData.market_region = marketRegion
    }

    let result = await db.from('brands').insert(insertData).select().single()

    // If market_region column doesn't exist, retry without it
    if (result.error && (result.error.code === '42703' || result.error.message?.includes('market_region'))) {
      delete insertData.market_region
      result = await db.from('brands').insert(insertData).select().single()
    }

    const { data, error } = result

    if (error) {
      console.error('POST /api/brands error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/brands error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create brand'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
