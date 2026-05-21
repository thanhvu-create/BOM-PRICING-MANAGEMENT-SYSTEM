/**
 * GET  /api/config?key=VND_RATE  → getVndRate()
 * POST /api/config               → saveVndRate()
 * Body: { key: string, value: string }
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key') || 'VND_RATE'

  const { data, error } = await supabase
    .from('sys_config').select('value').eq('key', key).single()

  if (error) return NextResponse.json({ success: false })
  return NextResponse.json({ success: true, rate: parseFloat(data.value) })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { key = 'VND_RATE', value } = body

  // Fetch old value for diff
  const db = createServiceClient()
  const { data: oldCfg } = await db.from('sys_config').select('value').eq('key', key).single()

  const { error } = await supabase
    .from('sys_config')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ success: false, message: error.message })

  const { data: profile } = await db.from('users').select('username, role').eq('id', user.id).single()
  logAction({
    actor:    profile?.username || user.email || '',
    role:     profile?.role,
    action:   'UPDATE',
    entity:   'config',
    entityId: key,
    summary:  `Cập nhật ${key}: ${oldCfg?.value ?? '?'} → ${value}`,
    diff: {
      before: { [key]: oldCfg?.value },
      after:  { [key]: String(value) },
    },
  })

  return NextResponse.json({ success: true })
}
