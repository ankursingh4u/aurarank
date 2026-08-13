import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPublicSiteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { scanId } = await request.json()
    if (!scanId) return NextResponse.json({ error: 'scanId is required' }, { status: 400 })

    // Verify the scan belongs to the user
    const { data: scan } = await supabase
      .from('scans')
      .select('id, brands!inner(user_id)')
      .eq('id', scanId)
      .single()

    if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

    // Generate share URL using base64-encoded scanId
    const token = Buffer.from(scanId).toString('base64url')
    const appUrl = getPublicSiteUrl()
    const shareUrl = `${appUrl}/report/${token}`

    return NextResponse.json({ shareUrl, token })
  } catch (error) {
    console.error('POST /api/share error:', error)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}
