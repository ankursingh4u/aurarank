import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { userDb } from '@/lib/pgq'
import { PLANS } from '@/lib/payment'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const brandId = request.nextUrl.searchParams.get('brandId')

    let query = db
      .from('scans')
      .select('*, brands!inner(user_id, brand_name)')
      .order('scan_date', { ascending: false })

    if (brandId) {
      query = query.eq('brand_id', brandId)
    }

    const { data, error } = await query
    if (error) {
      console.error('GET /api/scans error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/scans error:', error)
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = userDb(user.id)

    const { brandId } = await request.json()
    if (!brandId) return NextResponse.json({ error: 'brandId is required' }, { status: 400 })

    // Server-side plan enforcement — UI checks are bypassable
    const { data: userPlan } = await db
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = (userPlan?.plan as keyof typeof PLANS) || 'starter'
    const planConfig = PLANS[plan] || PLANS.starter

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Count scans by user_id — immune to brand deletion resets
    const { count: scanCount } = await db
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if ((scanCount || 0) >= planConfig.scanLimit) {
      return NextResponse.json({
        error: `Scan limit reached (${scanCount}/${planConfig.scanLimit} this month). Upgrade your plan at /dashboard/billing`,
      }, { status: 403 })
    }

    const { data: brand } = await db
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    const { data: scan, error } = await db
      .from('scans')
      .insert({ brand_id: brandId, user_id: user.id, status: 'pending' })
      .select()
      .single()

    if (error) {
      console.error('POST /api/scans error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(scan, { status: 201 })
  } catch (error) {
    console.error('POST /api/scans error:', error)
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
  }
}
