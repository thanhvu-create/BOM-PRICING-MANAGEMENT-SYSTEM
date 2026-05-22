import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

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

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (profile?.role !== 'Admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { managerMax } = await request.json()

    // Fetch old value for diff
    const { data: oldCfg } = await db.from('sys_config').select('value').eq('key', 'MANAGER_MAX_DISCOUNT').single()

    const { error } = await db.from('sys_config').upsert({
      key: 'MANAGER_MAX_DISCOUNT',
      value: String(managerMax),
      updated_at: new Date().toISOString()
    })

    if (error) throw error

    logAction({
      actor:    profile?.username || user.email || '',
      role:     'Admin',
      action:   'UPDATE',
      entity:   'config',
      entityId: 'MANAGER_MAX_DISCOUNT',
      summary:  `Cập nhật Manager Max Discount: ${oldCfg?.value ?? '?'}% → ${managerMax}%`,
      diff: {
        before: { MANAGER_MAX_DISCOUNT: oldCfg?.value },
        after:  { MANAGER_MAX_DISCOUNT: String(managerMax) },
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
