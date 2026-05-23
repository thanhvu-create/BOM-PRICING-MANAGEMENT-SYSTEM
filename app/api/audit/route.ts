import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

const VALID_ENTITIES = new Set(['bom', 'gold', 'user', 'config', 'stone', 'mk', 'dm', 'audit'])
const VALID_ACTIONS  = new Set(['CREATE', 'UPDATE', 'DELETE', 'CALCULATE'])

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

    // Sanitize actor: only allow safe characters, max 50 chars
    const actorRaw = searchParams.get('actor') || ''
    const actor = actorRaw.replace(/[^a-zA-Z0-9._@\-]/g, '').slice(0, 50)

    // Whitelist entity and action
    const entityRaw = searchParams.get('entity') || ''
    const entity = VALID_ENTITIES.has(entityRaw) ? entityRaw : ''

    const actionRaw = searchParams.get('action') || ''
    const action = VALID_ACTIONS.has(actionRaw) ? actionRaw : ''

    const from     = searchParams.get('from')     || ''
    const to       = searchParams.get('to')       || ''
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')))

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
    console.error('[GET /api/audit]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
