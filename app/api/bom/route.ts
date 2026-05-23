import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

const STORE_PRICE_MAP: Record<string, string[]> = {
  VN:  ['B1)HPVN -P', 'B2)AGVN-P'],
  US:  ['1)HPUS -P', '2)HPUS FB -P', '5)HPB -P', '5.1) HPB-P (AHA)'],
  ADM: ['3)ADM1 -P', '4)ADM2 -P', 'ADM-MH'],
}

// GET /api/bom — lấy danh sách BOM
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const role = profile.role
    const store = profile.store || ''

    // List view: select only columns needed for table + thumbnail. img2/img3 loaded on-demand in detail modal.
    let query = db.from('bom')
      .select('id, bom_id, date, product_type, so_mo, model, total_stone_qty, total_stone_ctw, sell_price, discount_pct, discount_price, cost_total, sales_person, store, customer_name, created_by, img1, price_list_type, note, folder_url')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    // Filter theo store nếu không phải Admin/Manager
    if (store && !['Admin', 'Manager'].includes(role) && STORE_PRICE_MAP[store]) {
      query = query.in('price_list_type', STORE_PRICE_MAP[store])
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: any) {
    console.error('[GET /api/bom]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// POST /api/bom — lưu BOM mới
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    const username = profile?.username || user.email || ''
    const role = profile?.role || ''

    const payload = await request.json()
    const { header, golds, stones, calculatedCosts } = payload

    // Numeric validation
    const discountPct = Number(payload.discountPct) || 0
    if (!isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
      return NextResponse.json({ error: 'discountPct không hợp lệ' }, { status: 400 })
    }
    const laborHours = Number(header?.laborHours) || 0
    if (!isFinite(laborHours) || laborHours < 0 || laborHours > 9999) {
      return NextResponse.json({ error: 'laborHours không hợp lệ' }, { status: 400 })
    }
    for (const s of stones || []) {
      const qty = Number(s.qty) || 0
      const ctw = Number(s.ctw1pc) || 0
      if (!isFinite(qty) || qty < 0 || !isFinite(ctw) || ctw < 0) {
        return NextResponse.json({ error: 'Số lượng/carat đá không hợp lệ' }, { status: 400 })
      }
    }
    for (const g of golds || []) {
      const w = Number(g.weight) || 0
      if (w !== 0 && !isFinite(w)) {
        return NextResponse.json({ error: 'Trọng lượng vàng không hợp lệ' }, { status: 400 })
      }
    }

    // Generate BOM ID
    const { data: bomId } = await db.rpc('generate_bom_id', {
      p_date: header.date,
      p_model: header.model || '',
    })

    const costs = calculatedCosts || {}
    const discountPrice = discountPct > 0
      ? Math.round((costs.sellPrice || 0) * (1 - discountPct / 100) * 100) / 100
      : 0

    // Insert BOM_DB
    const { error: bomErr } = await db.from('bom').insert([{
      bom_id:          bomId,
      date:            header.date,
      product_type:    header.productType || '',
      so_mo:           header.soMo || '',
      model:           header.model || '',
      total_stone_qty: (stones || []).reduce((s: number, r: any) => s + (Number(r.qty) || 0), 0),
      total_stone_ctw: (stones || []).reduce((s: number, r: any) => s + (Number(r.ctw1pc) || 0) * (Number(r.qty) || 0), 0),
      labor_hours:     laborHours,
      price_list_type: header.priceListType || '',
      sp_type:         header.spType || '',
      cost_gold:       costs.costGold || 0,
      cost_stones:     costs.costStones || 0,
      cost_labor:      costs.costLabor || 0,
      cost_subtotal:   costs.costSubtotal || 0,
      cost_cif:        costs.costCif || 0,
      cost_total:      costs.costTotal || 0,
      sell_price:      costs.sellPrice || 0,
      note:            header.note || '',
      img1:            header.img1 || '',
      img2:            header.img2 || '',
      img3:            header.img3 || '',
      folder_url:      header.folderUrl || '',
      created_by:      username,
      customer_name:   header.customerName || '',
      discount_pct:    discountPct / 100,   // stored as decimal (0.05 = 5%)
      discount_price:  discountPrice,
      sales_person:    header.salesPerson || '',
      store:           header.store || '',
    }])
    if (bomErr) throw bomErr

    // Insert BOM_Gold
    if ((golds || []).length > 0) {
      const goldRows = (golds as any[])
        .filter(g => g.weight && Number(g.weight) > 0)
        .map((g: any, i: number) => ({
          bom_id:    bomId,
          idx:       i + 1,
          gold_type: g.goldType,
          color:     g.color,
          weight:    Number(g.weight),
        }))
      if (goldRows.length > 0) {
        const { error: gErr } = await db.from('bom_gold').insert(goldRows)
        if (gErr) throw gErr
      }
    }

    // Insert BOM_Stone
    if ((stones || []).length > 0) {
      const stoneRows = (stones as any[])
        .filter(s => String(s.groupCode || '').trim() !== '' || (Number(s.ctw1pc) || 0) > 0 || (Number(s.qty) || 0) > 0)
        .map((s: any, i: number) => ({
          bom_id:     bomId,
          idx:        i + 1,
          group_code: s.groupCode,
          grade_id:   s.gradeId || '',
          size:       s.size || '',
          ctw1pc:     Number(s.ctw1pc) || 0,
          qty:        Number(s.qty) || 0,
          tl_hot:     Number(s.tlHot) || (Number(s.ctw1pc) * Number(s.qty)),
          input_type: s.inputType || 'mm',
          gia_ban:    Number(s.giaBan) || 0,
        }))
      if (stoneRows.length > 0) {
        const { error: sErr } = await db.from('bom_stone').insert(stoneRows)
        if (sErr) throw sErr
      }
    }

    logAction({
      actor:    username,
      role,
      action:   'CREATE',
      entity:   'bom',
      entityId: bomId,
      summary:  `Tạo BOM ${bomId} — SO/MO: ${header.soMo || ''}`,
      diff:     { after: { bom_id: bomId, so_mo: header.soMo, model: header.model, sell_price: costs.sellPrice } },
    })

    return NextResponse.json({ bomId })
  } catch (err: any) {
    console.error('[POST /api/bom]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
