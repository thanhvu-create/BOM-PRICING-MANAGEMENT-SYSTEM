import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — danh sách dm_size
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data, error } = await db.from('dm_size').select('*').order('master_code').order('grade_id')
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — save/upsert dm_size row
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const payload = await request.json()
    const db = createServiceClient()

    const row = {
      category:         payload.category || '',
      type:             payload.type || '',
      shape_code:       payload.shape_code || '',
      color:            payload.color || '',
      quality:          payload.quality || '',
      master_code:      payload.master_code || '',
      grade_id:         payload.grade_id || '',
      pricing_unit:     payload.pricing_unit || 'ct',
      measurement_type: payload.measurement_type || 'mm',
      min_size:         Number(payload.min_size) || 0,
      max_size:         Number(payload.max_size) || 0,
      display_name:     payload.display_name || '',
      base_price:       Number(payload.base_price) || 0,
      mk:               Number(payload.mk) || 0,
      diamond_price:    Number(payload.diamond_price) || null,
      vietnamese_name:  payload.vietnamese_name || '',
      full_name_en:     payload.full_name_en || '',
    }

    if (payload.old_grade_id && payload.old_grade_id !== payload.grade_id) {
      // Grade ID đổi → update by old_grade_id
      await db.from('dm_size').update(row).eq('grade_id', payload.old_grade_id)
    } else {
      // Upsert by grade_id
      const { error } = await db.from('dm_size').upsert(row, { onConflict: 'grade_id' })
      if (error) throw error
    }

    // Sync dm_size → stone_material
    await db.rpc('sync_dm_size_to_stone_material')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — xóa dm_size row
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const gradeId = searchParams.get('gradeId')
    if (!gradeId) return NextResponse.json({ error: 'gradeId required' }, { status: 400 })

    const db = createServiceClient()
    const { error } = await db.from('dm_size').delete().eq('grade_id', gradeId)
    if (error) throw error
    await db.rpc('sync_dm_size_to_stone_material')

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
