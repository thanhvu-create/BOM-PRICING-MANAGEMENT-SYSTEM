import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/gold/trigger/config — save LF and trigger hour to sys_config
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: profile } = await db.from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { lf, hour, enabled } = await request.json()

    const upserts = []
    if (lf !== undefined) {
      upserts.push({ key: 'GOLD_TRIGGER_LF', value: String(parseFloat(lf) || 1.06) })
    }
    if (hour !== undefined) {
      const h = Math.max(0, Math.min(23, parseInt(hour) || 8))
      upserts.push({ key: 'GOLD_TRIGGER_HOUR', value: String(h) })
    }
    if (enabled !== undefined) {
      upserts.push({ key: 'GOLD_TRIGGER_ENABLED', value: enabled ? 'true' : 'false' })
    }

    for (const u of upserts) {
      await db.from('sys_config').upsert({ key: u.key, value: u.value }, { onConflict: 'key' })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/gold/trigger/config — load current config
export async function GET() {
  try {
    const db = createServiceClient()
    const { data } = await db
      .from('sys_config')
      .select('key, value')
      .in('key', ['GOLD_TRIGGER_LF', 'GOLD_TRIGGER_HOUR', 'GOLD_TRIGGER_ENABLED'])

    const cfg: Record<string, string> = {}
    for (const row of data || []) cfg[row.key] = row.value

    return NextResponse.json({
      success: true,
      lf: cfg['GOLD_TRIGGER_LF'] || '1.06',
      hour: cfg['GOLD_TRIGGER_HOUR'] || '8',
      enabled: cfg['GOLD_TRIGGER_ENABLED'] !== 'false',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
