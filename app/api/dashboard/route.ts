import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

const STORE_PRICE_MAP: Record<string, string[]> = {
  VN:  ['B1)HPVN -P', 'B2)AGVN-P'],
  US:  ['1)HPUS -P', '2)HPUS FB -P', '5)HPB -P', '5.1) HPB-P (AHA)'],
  ADM: ['3)ADM1 -P', '4)ADM2 -P', 'ADM-MH'],
}

const CC = { headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=600' } }

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

    // Admin/Manager: dùng RPC aggregates — không fetch raw rows
    if (isAdminOrManager) {
      const [kpiRes, byStoreRes, byTypeRes, bySalesRes, trendRes, recentRes] = await Promise.all([
        db.rpc('stats_kpi'),
        db.rpc('stats_by_store'),
        db.rpc('stats_by_type'),
        db.rpc('stats_by_sales'),
        db.rpc('stats_daily_trend'),
        db.from('bom')
          .select('bom_id, date, model, store, sell_price')
          .order('date', { ascending: false })
          .limit(5),
      ])

      if (kpiRes.error) throw kpiRes.error

      const kpi = kpiRes.data as {
        total_boms: number; total_value: number; avg_value: number
        today_count: number; month_count: number; discounted: number
      }

      return NextResponse.json({
        data: {
          totalBOMs:      kpi.total_boms    ?? 0,
          todayBOMs:      kpi.today_count   ?? 0,
          monthBOMs:      kpi.month_count   ?? 0,
          totalValue:     kpi.total_value   ?? 0,
          avgSellPrice:   kpi.avg_value     ?? 0,
          discountedCount: kpi.discounted   ?? 0,
          byStore:        (byStoreRes.data  ?? []).map((r: any) => ({ store: r.store, count: Number(r.count), value: Number(r.total_value) })),
          byProductType:  (byTypeRes.data   ?? []).map((r: any) => ({ type: r.product_type, count: Number(r.count) })),
          bySalesPerson:  (bySalesRes.data  ?? []).map((r: any) => ({ name: r.name, count: Number(r.count), value: Number(r.total_value) })),
          recentBOMs:     (recentRes.data   ?? []).map((r: any) => ({ bom_id: r.bom_id, date: String(r.date || '').substring(0, 10), model: r.model, store: r.store || '—', sell_price: Number(r.sell_price) })),
          dailyTrend:     (trendRes.data    ?? []).map((r: any) => ({ date: r.day, count: Number(r.count), value: Number(r.total_value) })),
        }
      }, CC)
    }

    // Sales / Sales Supervisor / Order: chỉ cần 3 KPI counts, filter theo store
    let query = db
      .from('bom')
      .select('date, price_list_type', { count: 'exact' })

    if (userStore && STORE_PRICE_MAP[userStore]) {
      query = query.in('price_list_type', STORE_PRICE_MAP[userStore])
    }

    const { data: rows, count: totalBOMs } = await query
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const thisMonth = today.substring(0, 7)
    let todayBOMs = 0, monthBOMs = 0
    for (const r of rows ?? []) {
      const d = String(r.date || '').substring(0, 10)
      if (d === today) todayBOMs++
      if (d.substring(0, 7) === thisMonth) monthBOMs++
    }

    return NextResponse.json({
      data: {
        totalBOMs: totalBOMs ?? 0, todayBOMs, monthBOMs,
        totalValue: 0, avgSellPrice: 0, discountedCount: 0,
        byStore: [], byProductType: [], bySalesPerson: [], recentBOMs: [], dailyTrend: [],
      }
    }, CC)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
