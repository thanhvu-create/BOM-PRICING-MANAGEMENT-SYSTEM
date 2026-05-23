import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

// GET /api/audit/stats — aggregate data for charts (Admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Admin hoặc Manager mới có quyền xem thống kê' }, { status: 403 })

    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceISO = since.toISOString()

    // Run all aggregation queries in parallel — no JS-side loop over raw rows
    const [totalRes, last30Res, byDayRes, byEntityRes, byActionRes, topActorsRes] = await Promise.all([
      // Total all-time count
      db.from('audit_log').select('*', { count: 'exact', head: true }),
      // Count last 30 days
      db.from('audit_log').select('*', { count: 'exact', head: true }).gte('created_at', sinceISO),
      // Per-day count (last 30 days) — fetch minimal cols, group in JS (Supabase JS SDK has no GROUP BY)
      db.from('audit_log').select('created_at').gte('created_at', sinceISO).order('created_at', { ascending: true }),
      // By entity
      db.from('audit_log').select('entity').gte('created_at', sinceISO),
      // By action
      db.from('audit_log').select('action').gte('created_at', sinceISO),
      // Top actors
      db.from('audit_log').select('actor').gte('created_at', sinceISO),
    ])

    // Aggregate the minimal column results (much smaller payload than full rows)
    const dayMap: Record<string, number> = {}
    for (const r of byDayRes.data ?? []) {
      const day = r.created_at.slice(0, 10)
      dayMap[day] = (dayMap[day] ?? 0) + 1
    }
    const byDay = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))

    const entityMap: Record<string, number> = {}
    for (const r of byEntityRes.data ?? []) { entityMap[r.entity] = (entityMap[r.entity] ?? 0) + 1 }
    const byEntity = Object.entries(entityMap).sort(([, a], [, b]) => b - a).map(([entity, count]) => ({ entity, count }))

    const actionMap: Record<string, number> = {}
    for (const r of byActionRes.data ?? []) { actionMap[r.action] = (actionMap[r.action] ?? 0) + 1 }
    const byAction = Object.entries(actionMap).sort(([, a], [, b]) => b - a).map(([action, count]) => ({ action, count }))

    const actorMap: Record<string, number> = {}
    for (const r of topActorsRes.data ?? []) { actorMap[r.actor] = (actorMap[r.actor] ?? 0) + 1 }
    const topActors = Object.entries(actorMap).sort(([, a], [, b]) => b - a).slice(0, 10).map(([actor, count]) => ({ actor, count }))

    return NextResponse.json({
      total: totalRes.count ?? 0,
      last30: last30Res.count ?? 0,
      byDay,
      byEntity,
      byAction,
      topActors,
    }, {
      headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=600' },
    })
  } catch (err: any) {
    console.error('[GET /api/audit/stats]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
