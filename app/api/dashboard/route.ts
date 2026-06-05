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

    const role      = profile.role
    const userStore = profile.store || ''
    const isAdminOrManager = ['Admin', 'Manager'].includes(role)
    const isOrder          = role === 'Order'

    const db = createServiceClient()
    const today     = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const thisMonth = today.substring(0, 7)

    // ── Admin / Manager ──────────────────────────────────────────────────────
    if (isAdminOrManager) {
      const [approvedRes, draftCnt, pendingCnt, approvedCnt, rejectedCnt] = await Promise.all([
        db.from('bom')
          .select('bom_id, date, model, store, sell_price, discount_pct, product_type, sales_person')
          .eq('approval_status', 'approved')
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(10000),
        db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'draft').is('deleted_at', null),
        db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null),
        db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').is('deleted_at', null),
        db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected').is('deleted_at', null),
      ])

      if (approvedRes.error) throw approvedRes.error

      const rows = approvedRes.data ?? []

      const totalBOMs       = approvedCnt.count ?? rows.length
      const todayBOMs       = rows.filter(r => String(r.date ?? '').substring(0, 10) === today).length
      const monthBOMs       = rows.filter(r => String(r.date ?? '').substring(0, 10).startsWith(thisMonth)).length
      const totalValue      = rows.reduce((s, r) => s + (Number(r.sell_price) || 0), 0)
      const avgSellPrice    = totalBOMs > 0 ? totalValue / totalBOMs : 0
      const discountedCount = rows.filter(r => Number(r.discount_pct) > 0).length

      // By store
      const storeAgg: Record<string, { count: number; value: number }> = {}
      for (const r of rows) {
        const k = r.store || '—'
        const a = (storeAgg[k] ??= { count: 0, value: 0 })
        a.count++
        a.value += Number(r.sell_price) || 0
      }
      const byStore = Object.entries(storeAgg)
        .map(([store, v]) => ({ store, ...v }))
        .sort((a, b) => b.count - a.count)

      // By product type (top 5)
      const typeAgg: Record<string, number> = {}
      for (const r of rows) {
        const k = r.product_type || '—'
        typeAgg[k] = (typeAgg[k] ?? 0) + 1
      }
      const byProductType = Object.entries(typeAgg)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // By salesperson (top 5)
      const salesAgg: Record<string, { count: number; value: number }> = {}
      for (const r of rows) {
        const k = r.sales_person || '—'
        const a = (salesAgg[k] ??= { count: 0, value: 0 })
        a.count++
        a.value += Number(r.sell_price) || 0
      }
      const bySalesPerson = Object.entries(salesAgg)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Recent 5 (already sorted desc)
      const recentBOMs = rows.slice(0, 5).map(r => ({
        bom_id:     r.bom_id,
        date:       String(r.date ?? '').substring(0, 10),
        model:      r.model,
        store:      r.store || '—',
        sell_price: Number(r.sell_price) || 0,
      }))

      return NextResponse.json({
        data: {
          totalBOMs, todayBOMs, monthBOMs,
          totalValue, avgSellPrice, discountedCount,
          byStore, byProductType, bySalesPerson, recentBOMs,
          approvalBreakdown: {
            draft:    draftCnt.count    ?? 0,
            pending:  pendingCnt.count  ?? 0,
            approved: approvedCnt.count ?? 0,
            rejected: rejectedCnt.count ?? 0,
          },
        }
      }, CC)
    }

    // ── Sales / Sales Supervisor / Order ─────────────────────────────────────
    const storePriceTypes = userStore && STORE_PRICE_MAP[userStore] ? STORE_PRICE_MAP[userStore] : null

    function addStore(q: any): any {
      return storePriceTypes ? q.in('price_list_type', storePriceTypes) : q
    }

    if (isOrder) {
      const [mainRes, draftR, pendingR, approvedR, rejectedR] = await Promise.all([
        addStore(db.from('bom').select('date, price_list_type', { count: 'exact' }).eq('approval_status', 'approved').is('deleted_at', null)),
        addStore(db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'draft').is('deleted_at', null)),
        addStore(db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending').is('deleted_at', null)),
        addStore(db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').is('deleted_at', null)),
        addStore(db.from('bom').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected').is('deleted_at', null)),
      ])

      let todayBOMs = 0, monthBOMs = 0
      for (const r of mainRes.data ?? []) {
        const d = String(r.date ?? '').substring(0, 10)
        if (d === today) todayBOMs++
        if (d.substring(0, 7) === thisMonth) monthBOMs++
      }

      return NextResponse.json({
        data: {
          totalBOMs: mainRes.count ?? 0, todayBOMs, monthBOMs,
          totalValue: 0, avgSellPrice: 0, discountedCount: 0,
          byStore: [], byProductType: [], bySalesPerson: [], recentBOMs: [],
          approvalBreakdown: {
            draft:    draftR.count    ?? 0,
            pending:  pendingR.count  ?? 0,
            approved: approvedR.count ?? 0,
            rejected: rejectedR.count ?? 0,
          },
        }
      }, CC)
    }

    // Sales / Sales Supervisor
    const { data: rows, count: totalBOMs } = await addStore(
      db.from('bom')
        .select('date, price_list_type', { count: 'exact' })
        .eq('approval_status', 'approved')
        .is('deleted_at', null)
    )

    let todayBOMs = 0, monthBOMs = 0
    for (const r of rows ?? []) {
      const d = String(r.date ?? '').substring(0, 10)
      if (d === today) todayBOMs++
      if (d.substring(0, 7) === thisMonth) monthBOMs++
    }

    return NextResponse.json({
      data: {
        totalBOMs: totalBOMs ?? 0, todayBOMs, monthBOMs,
        totalValue: 0, avgSellPrice: 0, discountedCount: 0,
        byStore: [], byProductType: [], bySalesPerson: [], recentBOMs: [],
      }
    }, CC)
  } catch (err: any) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
