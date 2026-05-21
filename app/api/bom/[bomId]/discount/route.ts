import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// POST /api/bom/[bomId]/discount — áp dụng chiết khấu
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bomId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('username, role').eq('id', user.id).single()
    const username = profile?.username || ''
    const role = profile?.role || ''

    const { bomId } = await params
    const { discountPct, newSellPrice } = await request.json()
    const pct = Number(discountPct) || 0

    // Validate giới hạn discount theo role
    const db = createServiceClient()
    if (role !== 'Admin') {
      let maxPct = 20
      if (role === 'Manager') {
        const { data: cfg } = await db
          .from('sys_config').select('value').eq('key', 'MANAGER_MAX_DISCOUNT').single()
        maxPct = Number(cfg?.value) || 20
      }
      if (pct > maxPct) {
        return NextResponse.json({ error: `Discount không được vượt quá ${maxPct}%` }, { status: 400 })
      }
    }

    // Fetch original sell_price for audit diff
    const { data: oldBom } = await db.from('bom').select('sell_price, discount_pct').eq('bom_id', bomId).single()

    const { error } = await db.from('bom').update({
      discount_pct:   pct / 100,          // lưu dạng decimal
      discount_price: Number(newSellPrice) || 0,
      updated_at:     new Date().toISOString(),
      updated_by:     username,
      // sell_price KHÔNG thay đổi — giữ giá gốc
    }).eq('bom_id', bomId)

    if (error) throw error

    logAction({
      actor:    username,
      role,
      action:   'DISCOUNT',
      entity:   'bom',
      entityId: bomId,
      summary:  `Chiết khấu BOM ${bomId}: ${pct.toFixed(1)}% → $${(Number(newSellPrice) || 0).toFixed(2)}`,
      diff: {
        before: { sell_price: oldBom?.sell_price, discount_pct: (oldBom?.discount_pct || 0) * 100 },
        after:  { discount_pct: pct, discount_price: Number(newSellPrice) || 0 },
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
