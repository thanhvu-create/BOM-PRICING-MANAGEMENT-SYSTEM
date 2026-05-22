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
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    // Last 30 days window
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceISO = since.toISOString()

    const { data: rows, error } = await db
      .from('audit_log')
      .select('created_at, action, entity, actor')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true })

    if (error) throw error
    const logs = rows ?? []

    // 1. Actions per day (last 30 days)
    const dayMap: Record<string, number> = {}
    for (const r of logs) {
      const day = r.created_at.slice(0, 10)
      dayMap[day] = (dayMap[day] ?? 0) + 1
    }
    const byDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // 2. By entity
    const entityMap: Record<string, number> = {}
    for (const r of logs) {
      entityMap[r.entity] = (entityMap[r.entity] ?? 0) + 1
    }
    const byEntity = Object.entries(entityMap)
      .sort(([, a], [, b]) => b - a)
      .map(([entity, count]) => ({ entity, count }))

    // 3. By action
    const actionMap: Record<string, number> = {}
    for (const r of logs) {
      actionMap[r.action] = (actionMap[r.action] ?? 0) + 1
    }
    const byAction = Object.entries(actionMap)
      .sort(([, a], [, b]) => b - a)
      .map(([action, count]) => ({ action, count }))

    // 4. Top actors (top 10)
    const actorMap: Record<string, number> = {}
    for (const r of logs) {
      actorMap[r.actor] = (actorMap[r.actor] ?? 0) + 1
    }
    const topActors = Object.entries(actorMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([actor, count]) => ({ actor, count }))

    // 5. Total counts
    const { count: totalCount } = await db
      .from('audit_log')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      total: totalCount ?? 0,
      last30: logs.length,
      byDay,
      byEntity,
      byAction,
      topActors,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
