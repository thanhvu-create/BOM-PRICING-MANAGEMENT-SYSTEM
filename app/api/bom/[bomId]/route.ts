import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

    // Header
    const { data: bomRow, error: bomErr } = await db
      .from('bom').select('*').eq('bom_id', bomId).single()
    if (bomErr || !bomRow) return NextResponse.json({ error: 'BOM not found' }, { status: 404 })

    // Golds
    const { data: golds } = await db
      .from('bom_gold').select('*').eq('bom_id', bomId).order('idx')

    // Stones + enName
    const { data: stones } = await db
      .from('bom_stone').select('*').eq('bom_id', bomId).order('idx')

    // Build enName map từ stone_material
    const groupCodes = [...new Set((stones || []).map((s: any) => s.group_code).filter(Boolean))]
    let enNameMap: Record<string, string> = {}
    if (groupCodes.length > 0) {
      const { data: smRows } = await db
        .from('stone_material')
        .select('group_code, full_name_en')
        .in('group_code', groupCodes)
      ;(smRows || []).forEach((r: any) => {
        if (r.group_code && !enNameMap[r.group_code]) {
          enNameMap[r.group_code] = r.full_name_en || ''
        }
      })
    }

    const stonesWithName = (stones || []).map((s: any) => ({
      ...s,
      en_name: enNameMap[s.group_code] || '',
    }))

    // Logo từ mk_price_list_type
    let logoUrl = ''
    if (bomRow.price_list_type) {
      const { data: pltRow } = await db
        .from('mk_price_list_type')
        .select('logo_url')
        .eq('price_list_type', bomRow.price_list_type)
        .single()
      logoUrl = pltRow?.logo_url || ''
    }

    return NextResponse.json({
      header: { ...bomRow, logoUrl },
      golds:  golds || [],
      stones: stonesWithName,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
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

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { bomId } = await params
    const db = createServiceClient()

    // Cascade delete via FK (bom_gold + bom_stone auto-deleted)
    const { error } = await db.from('bom').delete().eq('bom_id', bomId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
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

    const { data: profile } = await supabase
      .from('users').select('username').eq('id', user.id).single()
    const username = profile?.username || user.email || ''

    const { bomId } = await params
    const payload = await request.json()
    const { header, golds, stones, calculatedCosts } = payload
    const costs = calculatedCosts || {}

    const db = createServiceClient()

    // Verify BOM exists
    await db.from('bom').select('bom_id').eq('bom_id', bomId).single()

    const discountPct = Number(payload.discountPct) || 0
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
      labor_hours:     Number(header.laborHours) || 0,
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
      updated_by:      username,
      customer_name:   header.customerName || '',
      discount_pct:    discountPct / 100,
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
      .filter(s => s.groupCode && Number(s.qty) > 0)
      .map((s: any, i: number) => ({
        bom_id: bomId, idx: i + 1,
        group_code: s.groupCode, grade_id: s.gradeId || '',
        size: s.size || '', ctw1pc: Number(s.ctw1pc) || 0,
        qty: Number(s.qty) || 0,
        tl_hot: Number(s.tlHot) || (Number(s.ctw1pc) * Number(s.qty)),
        input_type: s.inputType || 'mm', gia_ban: Number(s.giaBan) || 0,
      }))
    if (stoneRows.length > 0) await db.from('bom_stone').insert(stoneRows)

    return NextResponse.json({ bomId })
  } catch (err: any) {
    console.error('[PUT /api/bom/[bomId]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
