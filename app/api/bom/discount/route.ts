import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/bom/discount — Apply discount to a BOM
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: profile } = await db
      .from('users').select('username, role').eq('id', user.id).single()
    const role = profile?.role || ''
    const username = profile?.username || user.email || ''

    const { bomId, newSellPrice, discountPct, discountAmt } = await request.json()

    // Lấy config limit
    const { data: cfg } = await db.from('sys_config').select('value').eq('key', 'MANAGER_MAX_DISCOUNT').single()
    const managerMax = Number(cfg?.value) || 20

    // Validate limit
    let maxPct = 20
    if (role === 'Admin') maxPct = 100
    else if (role === 'Manager') maxPct = managerMax

    if (discountPct > maxPct) {
      return NextResponse.json({ error: `Chiết khấu vượt quá giới hạn cho phép (${maxPct}%)` }, { status: 403 })
    }

    // Update discount
    const { error: updateErr } = await db.from('bom').update({
      discount_pct: discountPct / 100, // stored as decimal (0.05 = 5%)
      discount_price: newSellPrice,
      updated_at: new Date().toISOString(),
      updated_by: username
    }).eq('bom_id', bomId)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[POST /api/bom/discount]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
