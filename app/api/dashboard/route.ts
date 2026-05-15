import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createServiceClient()
    const { data: rows, error } = await db
      .from('bom')
      .select('bom_id, date, product_type, model, sell_price, discount_pct, sales_person, store')
      .order('date', { ascending: false })
    if (error) throw error

    const today = new Date().toISOString().substring(0, 10)
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

    return NextResponse.json({
      data: {
        totalBOMs, todayBOMs, monthBOMs,
        totalValue,
        avgSellPrice: totalBOMs > 0 ? totalValue / totalBOMs : 0,
        discountedCount,
        byStore:       Object.entries(storeMap).map(([s, v]) => ({ store: s, count: v.count, value: v.value })).sort((a, b) => b.count - a.count),
        byProductType: Object.entries(ptMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        bySalesPerson: Object.entries(spMap).map(([name, v]) => ({ name, count: v.count, value: v.value })).sort((a, b) => b.count - a.count).slice(0, 5),
        recentBOMs:    recentArr.slice(0, 5),
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
