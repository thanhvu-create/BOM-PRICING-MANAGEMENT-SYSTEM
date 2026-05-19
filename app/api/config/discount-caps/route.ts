import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/config/discount-caps
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('sys_config').select('value').eq('key', 'MANAGER_MAX_DISCOUNT').single()

    const managerMax = error ? 20 : Number(data.value) || 20
    return NextResponse.json({ success: true, salesMax: 20, managerMax })
  } catch (err: any) {
    return NextResponse.json({ success: false, salesMax: 20, managerMax: 20 })
  }
}

// POST /api/config/discount-caps
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { managerMax } = await request.json()
    const db = createServiceClient()
    const { error } = await db.from('sys_config').upsert({
      key: 'MANAGER_MAX_DISCOUNT',
      value: String(managerMax),
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
