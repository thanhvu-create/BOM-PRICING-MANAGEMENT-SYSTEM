/**
 * POST /api/bom/calculate
 * Thay thế calculateBOMCost() trong Server_API_BOM.gs
 */
import { NextResponse } from 'next/server'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { calculateBOMCost } from '@/lib/pricing/calculate'
import type { BOMPayload } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const payload: BOMPayload = await request.json()
    const result = await calculateBOMCost(payload)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[POST /api/bom/calculate]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
