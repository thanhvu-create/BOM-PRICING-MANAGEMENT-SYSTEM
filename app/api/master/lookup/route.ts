/**
 * GET /api/master/lookup?groupCode=DIA&size=2.5&ctw=0.06
 * Thay thế lookupStoneGrade() trong Server_API_BOM.gs
 *
 * mm type → tra cứu theo size (MM SIZE); ct type → tra cứu theo ctw1pc (CTW/1PC).
 * Khi không tìm thấy match, vẫn trả về type_input của group để client hiển thị đúng cột.
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
  const ctw1pc    = parseFloat(searchParams.get('ctw')  || '0')

  // Primary lookup: mm type uses mmSize range; ct type uses ctw1pc range
  const { data, error } = await supabase.rpc('lookup_stone_grade', {
    p_group_code: groupCode,
    p_mm_size:    mmSize,
    p_ctw1pc:     ctw1pc,
  })

  if (error) return NextResponse.json({ success: false, message: error.message })

  if (data && data.length > 0) {
    return NextResponse.json({ success: true, ...data[0] })
  }

  // Fallback: no size match — still return type_input so the client can show the correct column type
  const { data: fallback } = await supabase
    .from('stone_material')
    .select('type_input')
    .eq('group_code', groupCode)
    .limit(1)
    .single()

  return NextResponse.json({
    success: false,
    type_input: fallback?.type_input ?? null,
    message: `No grade found for "${groupCode}" size=${mmSize} ctw=${ctw1pc}`,
  })
}
