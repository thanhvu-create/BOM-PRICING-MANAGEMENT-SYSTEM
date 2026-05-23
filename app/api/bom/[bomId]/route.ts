import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// GET /api/bom/[bomId] — lấy chi tiết BOM
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bomId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { bomId } = await params
    const db = createServiceClient()

    // Parallel: header + golds + stones + logo (stones needed before enName lookup)
    const [
      { data: bomRow, error: bomErr },
      { data: golds },
      { data: stones },
    ] = await Promise.all([
      db.from('bom').select('*').eq('bom_id', bomId).is('deleted_at', null).single(),
      db.from('bom_gold').select('idx, gold_type, color, weight').eq('bom_id', bomId).order('idx'),
      db.from('bom_stone').select('idx, group_code, grade_id, size, ctw1pc, qty, tl_hot, input_type, gia_ban').eq('bom_id', bomId).order('idx'),
    ])

    if (bomErr || !bomRow) return NextResponse.json({ error: 'BOM not found' }, { status: 404 })

    // Parallel: enName lookup + logo (now that we have stones + bomRow)
    const groupCodes = [...new Set((stones || []).map((s: any) => s.group_code).filter(Boolean))]
    const [smResult, logoResult] = await Promise.all([
      groupCodes.length > 0
        ? db.from('stone_material').select('group_code, full_name_en').in('group_code', groupCodes)
        : Promise.resolve({ data: [] }),
      bomRow.price_list_type
        ? db.from('mk_price_list_type').select('logo_url').eq('price_list_type', bomRow.price_list_type).single()
        : Promise.resolve({ data: null }),
    ])

    const enNameMap: Record<string, string> = {}
    ;(smResult.data || []).forEach((r: any) => {
      if (r.group_code && !enNameMap[r.group_code]) enNameMap[r.group_code] = r.full_name_en || ''
    })

    const stonesWithName = (stones || []).map((s: any) => ({
      ...s,
      en_name: enNameMap[s.group_code] || '',
    }))

    const logoUrl = (logoResult as any).data?.logo_url || ''

    return NextResponse.json({
      header: { ...bomRow, logoUrl },
      golds:  golds || [],
      stones: stonesWithName,
    })
  } catch (err: any) {
    console.error('[GET /api/bom/[bomId]]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// DELETE /api/bom/[bomId] — xóa BOM (Admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bomId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (profile?.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { bomId } = await params

    // Fetch before delete for audit
    const { data: oldBom } = await db.from('bom').select('bom_id, so_mo, model, sell_price').eq('bom_id', bomId).single()

    // Soft delete — giữ record trong DB để có thể khôi phục
    const { error } = await db.from('bom').update({
      deleted_at: new Date().toISOString(),
      updated_by: profile?.username || user.email || '',
      updated_at: new Date().toISOString(),
    }).eq('bom_id', bomId)
    if (error) throw error

    logAction({
      actor:    profile?.username || user.email || '',
      role:     profile?.role,
      action:   'DELETE',
      entity:   'bom',
      entityId: bomId,
      summary:  `Xóa BOM ${bomId} — SO/MO: ${oldBom?.so_mo || ''}`,
      diff:     { before: { bom_id: bomId, so_mo: oldBom?.so_mo, model: oldBom?.model, sell_price: oldBom?.sell_price } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/bom/[bomId]]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// PUT /api/bom/[bomId] — cập nhật BOM
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bomId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    const username = profile?.username || user.email || ''

    const { bomId } = await params
    const payload = await request.json()
    const { header, golds, stones, calculatedCosts } = payload
    const costs = calculatedCosts || {}

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

    // Fetch before update for audit diff
    const { data: oldBom } = await db.from('bom').select('sell_price, discount_pct, so_mo, model').eq('bom_id', bomId).single()
    const discountPrice = discountPct > 0
      ? Math.round((costs.sellPrice || 0) * (1 - discountPct / 100) * 100) / 100
      : 0

    // Update BOM
    const { error: updateErr } = await db.from('bom').update({
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
      updated_at:      new Date().toISOString(),
      updated_by:      username,
      customer_name:   header.customerName || '',
      discount_pct:    discountPct / 100,   // stored as decimal (0.05 = 5%)
      discount_price:  discountPrice,
      sales_person:    header.salesPerson || '',
      store:           header.store || '',
    }).eq('bom_id', bomId)
    if (updateErr) throw updateErr

    // Xóa gold/stone cũ, thêm mới
    await db.from('bom_gold').delete().eq('bom_id', bomId)
    await db.from('bom_stone').delete().eq('bom_id', bomId)

    const goldRows = (golds as any[] || [])
      .filter(g => Number(g.weight) > 0)
      .map((g: any, i: number) => ({ bom_id: bomId, idx: i + 1, gold_type: g.goldType, color: g.color, weight: Number(g.weight) }))
    if (goldRows.length > 0) await db.from('bom_gold').insert(goldRows)

    const stoneRows = (stones as any[] || [])
      .filter(s => String(s.groupCode || '').trim() !== '' || (Number(s.ctw1pc) || 0) > 0 || (Number(s.qty) || 0) > 0)
      .map((s: any, i: number) => ({
        bom_id: bomId, idx: i + 1,
        group_code: s.groupCode, grade_id: s.gradeId || '',
        size: s.size || '', ctw1pc: Number(s.ctw1pc) || 0,
        qty: Number(s.qty) || 0,
        tl_hot: Number(s.tlHot) || (Number(s.ctw1pc) * Number(s.qty)),
        input_type: s.inputType || 'mm', gia_ban: Number(s.giaBan) || 0,
      }))
    if (stoneRows.length > 0) await db.from('bom_stone').insert(stoneRows)

    logAction({
      actor:    username,
      role:     profile?.role,
      action:   'UPDATE',
      entity:   'bom',
      entityId: bomId,
      summary:  `Cập nhật BOM ${bomId} — SO/MO: ${header.soMo || ''}`,
      diff: {
        before: { sell_price: oldBom?.sell_price, so_mo: oldBom?.so_mo, model: oldBom?.model },
        after:  { sell_price: costs.sellPrice, so_mo: header.soMo, model: header.model },
      },
    })

    return NextResponse.json({ bomId })
  } catch (err: any) {
    console.error('[PUT /api/bom/[bomId]]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
