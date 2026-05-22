import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const STORE_PRICE_MAP: Record<string, string[]> = {
  VN:  ['B1)HPVN -P', 'B2)AGVN-P'],
  US:  ['1)HPUS -P', '2)HPUS FB -P', '5)HPB -P', '5.1) HPB-P (AHA)'],
  ADM: ['3)ADM1 -P', '4)ADM2 -P', 'ADM-MH'],
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: profile } = await db
      .from('users').select('role, store').eq('id', user.id).single()
    const store = profile?.store || ''
    const role = profile?.role || ''

    const [ptRes, pltRes, spRes, sgRes, spPersonRes, storeRes] = await Promise.all([
      db.from('mk_product_type').select('product_type'),
      db.from('mk_price_list_type').select('price_list_type'),
      db.from('mk_type_definition').select('type_definition'),
      db.from('stone_material').select('group_code').order('group_code'),
      db.from('salesperson').select('salesperson_name').order('salesperson_name'),
      db.from('stores').select('store_name').order('store_name'),
    ])

    const productTypes = [...new Set((ptRes.data || []).map((r: any) => r.product_type).filter(Boolean))]
    let priceListTypes = [...new Set((pltRes.data || []).map((r: any) => r.price_list_type).filter(Boolean))]
    // TSTT là auto-lock khi có hột — KHÔNG hiện trong dropdown SP Type
    const spTypes = [...new Set((spRes.data || []).map((r: any) => r.type_definition).filter(Boolean))].filter(t => t !== 'TSTT')
    const stoneGroupCodes = [...new Set((sgRes.data || []).map((r: any) => r.group_code).filter(Boolean))]
    const salesPersonNames = (spPersonRes.data || []).map((r: any) => r.salesperson_name).filter(Boolean)
    const storeNames = [...new Set((storeRes.data || []).map((r: any) => r.store_name).filter(Boolean))]

    // Lọc priceListTypes theo store (trừ Admin/Manager thấy tất cả)
    if (store && !['Admin', 'Manager'].includes(role) && STORE_PRICE_MAP[store]) {
      priceListTypes = priceListTypes.filter(t => STORE_PRICE_MAP[store].includes(t))
    }

    return NextResponse.json({
      productTypes,
      priceListTypes,
      spTypes,
      goldTypes: ['10K', '14K', '18K', '20K', '22K', '24K', 'PT', 'AG'],
      colors: ['Yellow', 'White', 'Rose', 'Platinum'],
      stoneGroupCodes,
      salesPersonNames,
      storeNames,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
