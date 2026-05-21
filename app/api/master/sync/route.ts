import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createServiceClient()

    // Fetch all dm_size rows that have a master_code
    const { data: rows, error: fetchErr } = await db
      .from('dm_size')
      .select('*')
      .not('master_code', 'is', null)
      .neq('master_code', '')
    if (fetchErr) throw fetchErr

    // Build stone_material rows with selling_price computed in application layer
    const smRows = (rows || []).map((r: any) => {
      const basePrice = Number(r.base_price) || 0
      // mk stored as decimal (e.g. 0.3 = 30%)
      const mk        = Number(r.mk) || 0
      return {
        group_code:    r.master_code,
        grade_id:      r.grade_id,
        display_name:  r.display_name || '',
        unit:          r.pricing_unit || 'ct',
        type_input:    r.measurement_type || 'mm',
        min_size:      Number(r.min_size) || 0,
        max_size:      Number(r.max_size) || 0,
        selling_price: basePrice * (1 + mk),
        base_price:    basePrice,
        mkup:          mk,
        full_name_vi:  r.vietnamese_name || r.display_name || '',
        full_name_en:  r.full_name_en || '',
      }
    })

    // Full replace: delete all then insert
    const { error: delErr } = await db.from('stone_material').delete().neq('grade_id', '')
    if (delErr) throw delErr

    if (smRows.length > 0) {
      const { error: insErr } = await db.from('stone_material').insert(smRows)
      if (insErr) throw insErr
    }

    return NextResponse.json({ success: true, synced: smRows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
