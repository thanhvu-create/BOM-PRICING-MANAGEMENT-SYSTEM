import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

// GET — danh sách dm_size
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data, error } = await db.from('dm_size').select('*').order('master_code').order('grade_id')
    if (error) throw error
    return NextResponse.json({ data: data || [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: any) {
    console.error('[master/stone route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// POST — save/upsert dm_size row
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const payload = await request.json()
    const db = createServiceClient()

    const basePrice = Number(payload.base_price) || 0
    const mk        = Number(payload.mk) || 0

    const row = {
      category:         payload.category || '',
      type:             payload.type || '',
      shape_code:       payload.shape_code || '',
      color:            payload.color || '',
      quality:          payload.quality || '',
      master_code:      payload.master_code || '',
      grade_id:         payload.grade_id || '',
      pricing_unit:     payload.pricing_unit || 'ct',
      measurement_type: (payload.measurement_type || 'mm').toLowerCase(),
      min_size:         Number(payload.min_size) || 0,
      max_size:         Number(payload.max_size) || 0,
      display_name:     payload.display_name || '',
      base_price:       basePrice,
      mk:               mk,
      diamond_price:    basePrice * (1 + mk),  // always recompute = selling_price
      full_name_vi:     payload.full_name_vi || '',
      full_name_en:     payload.full_name_en || '',
    }

    const oldGradeId = payload.old_grade_id && payload.old_grade_id !== payload.grade_id
      ? payload.old_grade_id as string
      : null

    if (oldGradeId) {
      const { error } = await db.from('dm_size').update(row).eq('grade_id', oldGradeId)
      if (error) throw error
    } else {
      const { error } = await db.from('dm_size').upsert(row, { onConflict: 'grade_id' })
      if (error) throw error
    }

    // Sync this row → stone_material (application-layer, no RPC)
    const sellingPrice = basePrice * (1 + mk)
    const masterCode = row.master_code

    if (masterCode) {
      const smRow = {
        group_code:    masterCode,
        grade_id:      row.grade_id,
        display_name:  row.display_name,
        unit:          row.pricing_unit,
        type_input:    row.measurement_type,
        min_size:      row.min_size,
        max_size:      row.max_size,
        selling_price: sellingPrice,
        base_price:    basePrice,
        mkup:          mk,
        full_name_vi:  row.full_name_vi || row.display_name,
        full_name_en:  row.full_name_en || '',
      }
      if (oldGradeId) {
        // Grade ID changed: delete old row, upsert new
        const { error: delErr } = await db.from('stone_material').delete().eq('grade_id', oldGradeId)
        if (delErr) throw delErr
        const { error: insErr } = await db.from('stone_material').upsert(smRow, { onConflict: 'grade_id' })
        if (insErr) throw insErr
      } else {
        const { error } = await db.from('stone_material').upsert(smRow, { onConflict: 'grade_id' })
        if (error) throw error
      }
    } else if (oldGradeId) {
      // master_code cleared → remove from stone_material
      const { error } = await db.from('stone_material').delete().eq('grade_id', oldGradeId)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[master/stone POST]', err)
    return NextResponse.json({ error: err?.message || 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// DELETE — xóa dm_size row
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const gradeId = searchParams.get('gradeId')
    if (!gradeId) return NextResponse.json({ error: 'gradeId required' }, { status: 400 })

    const db = createServiceClient()
    const { error } = await db.from('dm_size').delete().eq('grade_id', gradeId)
    if (error) throw error
    await db.from('stone_material').delete().eq('grade_id', gradeId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[master/stone route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
