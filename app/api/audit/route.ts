import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

// GET /api/audit?actor=&entity=&action=&from=&to=&page=&pageSize=
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Admin hoặc Manager mới có quyền xem nhật ký' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const actor    = searchParams.get('actor')    || ''
    const entity   = searchParams.get('entity')   || ''
    const action   = searchParams.get('action')   || ''
    const from     = searchParams.get('from')     || ''
    const to       = searchParams.get('to')       || ''
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(200, parseInt(searchParams.get('pageSize') || '50'))

    let query = db
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (actor)  query = query.ilike('actor', `%${actor}%`)
    if (entity) query = query.eq('entity', entity)
    if (action) query = query.eq('action', action)
    if (from)   query = query.gte('created_at', from)
    if (to)     query = query.lte('created_at', to + 'T23:59:59Z')

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
