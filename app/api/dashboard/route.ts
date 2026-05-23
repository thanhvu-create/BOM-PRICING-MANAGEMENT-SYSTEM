import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

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

    const profile = await getUserProfile(user.id, user.email)
    if (!profile?.role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const role = profile.role
    const userStore = profile.store || ''
    const isAdminOrManager = ['Admin', 'Manager'].includes(role)

    const db = createServiceClient()
    let query = db
      .from('bom')
      .select('bom_id, date, product_type, model, sell_price, discount_pct, sales_person, store, price_list_type')
      .order('date', { ascending: false })

    // Non-admin/manager with a specific store → filter by price_list_type
    if (!isAdminOrManager && userStore && STORE_PRICE_MAP[userStore]) {
      query = query.in('price_list_type', STORE_PRICE_MAP[userStore])
    }

    const { data: rows, error } = await query
    if (error) throw error

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const thisMonth = today.substring(0, 7)

    let totalBOMs = 0, todayBOMs = 0, monthBOMs = 0, totalValue = 0, discountedCount = 0
    const storeMap: Record<string, { count: number; value: number }> = {}
    const ptMap: Record<string, number> = {}
    const spMap: Record<string, { count: number; value: number }> = {}
    const recentArr: any[] = []

    for (const r of (rows || [])) {
      totalBOMs++
      const d = String(r.date || '').substring(0, 10)
      if (d === today) todayBOMs++
      if (d.substring(0, 7) === thisMonth) monthBOMs++
      const sell = Number(r.sell_price) || 0
      totalValue += sell
      if (Number(r.discount_pct) > 0) discountedCount++

      const store = String(r.store || '—')
      if (!storeMap[store]) storeMap[store] = { count: 0, value: 0 }
      storeMap[store].count++; storeMap[store].value += sell

      const pt = String(r.product_type || '—')
      ptMap[pt] = (ptMap[pt] || 0) + 1

      const sp = String(r.sales_person || '—')
      if (!spMap[sp]) spMap[sp] = { count: 0, value: 0 }
      spMap[sp].count++; spMap[sp].value += sell

      recentArr.push({ bom_id: r.bom_id, date: d, model: r.model, store, sell_price: sell })
    }

    const base = { totalBOMs, todayBOMs, monthBOMs, totalValue: 0, avgSellPrice: 0, discountedCount: 0, byStore: [], byProductType: [], bySalesPerson: [], recentBOMs: [] }

    if (isAdminOrManager) {
      return NextResponse.json({
        data: {
          ...base,
          totalValue,
          avgSellPrice: totalBOMs > 0 ? totalValue / totalBOMs : 0,
          discountedCount,
          byStore:       Object.entries(storeMap).map(([s, v]) => ({ store: s, count: v.count, value: v.value })).sort((a, b) => b.count - a.count),
          byProductType: Object.entries(ptMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 5),
          bySalesPerson: Object.entries(spMap).map(([name, v]) => ({ name, count: v.count, value: v.value })).sort((a, b) => b.count - a.count).slice(0, 5),
          recentBOMs:    recentArr.slice(0, 5),
        }
      })
    }

    // Sales / Sales Supervisor / Order: chỉ trả về 3 KPI counts
    return NextResponse.json({ data: base })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
