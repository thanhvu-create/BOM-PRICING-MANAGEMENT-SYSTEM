import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createServiceClient()

    // 1. Find all stone_material rows where type_input is not lowercase
    const { data: rows, error: fetchErr } = await db
      .from('stone_material')
      .select('grade_id, type_input, group_code')
      .not('type_input', 'is', null)

    if (fetchErr) throw fetchErr

    const toFix = (rows || []).filter(r => r.type_input && r.type_input !== r.type_input.toLowerCase())

    // 2. Fix each row
    const fixed: string[] = []
    for (const row of toFix) {
      const { error } = await db
        .from('stone_material')
        .update({ type_input: row.type_input.toLowerCase() })
        .eq('grade_id', row.grade_id)
      if (error) throw error
      fixed.push(`${row.grade_id}: "${row.type_input}" → "${row.type_input.toLowerCase()}"`)
    }

    // 3. Check NDI-OV after fix
    const { data: ndiov } = await db
      .from('stone_material')
      .select('grade_id, type_input, min_size, max_size, selling_price')
      .eq('group_code', 'NDI-OV')
      .order('min_size')

    return NextResponse.json({
      success: true,
      fixed_count: fixed.length,
      fixed_rows: fixed,
      ndi_ov_rows: ndiov || [],
      next_step: 'Run the lookup_stone_grade DDL in Supabase SQL Editor to make the function case-insensitive',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
