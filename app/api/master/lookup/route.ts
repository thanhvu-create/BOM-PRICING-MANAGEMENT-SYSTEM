/**
 * GET /api/master/lookup?groupCode=DIA&size=2.5&ctw=0.06
 * Thay thế lookupStoneGrade() trong Server_API_BOM.gs
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const groupCode = searchParams.get('groupCode') || ''
  const mmSize    = parseFloat(searchParams.get('size') || '0')
  const ctw1pc    = parseFloat(searchParams.get('ctw') || '0')

  const { data, error } = await supabase.rpc('lookup_stone_grade', {
    p_group_code: groupCode,
    p_mm_size:    mmSize,
    p_ctw1pc:     ctw1pc,
  })

  if (error) return NextResponse.json({ success: false, message: error.message })
  if (!data || data.length === 0) {
    return NextResponse.json({ success: false, message: `No grade found for ${groupCode} size=${mmSize}` })
  }

  return NextResponse.json({ success: true, ...data[0] })
}
