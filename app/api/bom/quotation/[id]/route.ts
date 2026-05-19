import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/bom/quotation/[id] — lấy chi tiết BOM cho báo giá (ẩn cost)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = createServiceClient()

    // Lấy thông tin BOM, ẩn các trường cost nội bộ
    const { data: bomRow, error: bomErr } = await db
      .from('bom')
      .select('bom_id, date, product_type, so_mo, model, sell_price, note, img1, img2, img3, folder_url, created_by, customer_name, discount_pct, discount_price, sales_person, store, price_list_type')
      .eq('bom_id', id)
      .single()
      
    if (bomErr || !bomRow) return NextResponse.json({ error: 'BOM not found' }, { status: 404 })

    // Golds (chỉ lấy loại và trọng lượng, không lấy giá)
    const { data: golds } = await db
      .from('bom_gold')
      .select('idx, gold_type, color, weight')
      .eq('bom_id', id)
      .order('idx')

    // Stones (chỉ lấy mô tả, không lấy giá vốn/giá bán của từng hạt)
    const { data: stones } = await db
      .from('bom_stone')
      .select('idx, group_code, size, ctw1pc, qty, tl_hot, input_type')
      .eq('bom_id', id)
      .order('idx')

    const groupCodes = [...new Set((stones || []).map((s: any) => s.group_code).filter(Boolean))]
    let enNameMap: Record<string, string> = {}
    if (groupCodes.length > 0) {
      const { data: smRows } = await db.from('stone_material').select('group_code, full_name_en').in('group_code', groupCodes)
      ;(smRows || []).forEach((r: any) => { if (r.group_code) enNameMap[r.group_code] = r.full_name_en || '' })
    }

    const stonesWithName = (stones || []).map((s: any) => ({
      ...s,
      en_name: enNameMap[s.group_code] || '',
    }))

    // Logo từ mk_price_list_type
    let logoUrl = ''
    if (bomRow.price_list_type) {
      const { data: pltRow } = await db.from('mk_price_list_type').select('logo_url').eq('price_list_type', bomRow.price_list_type).single()
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
