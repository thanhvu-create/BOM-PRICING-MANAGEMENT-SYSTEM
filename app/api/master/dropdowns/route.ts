import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const [catRes, typRes, shaRes, colRes, quaRes, defRes] = await Promise.all([
      db.from('dm_category').select('name, code').order('name'),
      db.from('dm_types').select('name, code').order('name'),
      db.from('dm_shape').select('name, code').order('name'),
      db.from('dm_color').select('name, code').order('name'),
      db.from('dm_quality').select('name, code').order('name'),
      db.from('definition').select('en_name, vn_name, code').order('en_name'),
    ])

    return NextResponse.json({
      categories:  catRes.data || [],
      types:       typRes.data || [],
      shapes:      shaRes.data || [],
      colors:      colRes.data || [],
      qualities:   quaRes.data || [],
      definitions: defRes.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
