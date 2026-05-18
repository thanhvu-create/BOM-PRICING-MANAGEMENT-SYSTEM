import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/bom/stone-types — danh sách loại đá (group_code dedup)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data, error } = await db
      .from('stone_material')
      .select('group_code, full_name_vn, full_name_en')
      .order('group_code')

    if (error) throw error

    // Dedup theo group_code (giữ row đầu tiên mỗi group)
    const seen = new Set<string>()
    const result = (data || []).filter(r => {
      if (!r.group_code || seen.has(r.group_code)) return false
      seen.add(r.group_code)
      return true
    }).map(r => ({
      code:   r.group_code,
      viName: r.full_name_vn || '',
      enName: r.full_name_en || '',
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
