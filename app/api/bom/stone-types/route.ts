import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/bom/stone-types — danh sách loại đá đầy đủ tất cả size range
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data, error } = await db
      .from('stone_material')
      .select('group_code, display_name, full_name_vi, full_name_en, unit, type_input, min_size, max_size, selling_price, grade_id')
      .order('group_code')
      .order('min_size')

    if (error) throw error

    const result = (data || [])
      .filter(r => r.group_code)
      .map(r => ({
        code:         r.group_code,
        gradeId:      r.grade_id || '',
        displayName:  r.display_name || '',
        viName:       r.full_name_vi || '',
        enName:       r.full_name_en || '',
        unit:         (r.unit || 'ct').toLowerCase(),
        typeInput:    (r.type_input || 'mm').toLowerCase(),
        minSize:      Number(r.min_size) || 0,
        maxSize:      Number(r.max_size) || 0,
        sellingPrice: Number(r.selling_price) || 0,
      }))

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
