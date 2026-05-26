/**
 * GET  /api/config?key=VND_RATE  → getVndRate()
 * POST /api/config               → saveVndRate()
 * Body: { key: string, value: string }
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key') || 'VND_RATE'

  const db = createServiceClient()
  const { data, error } = await db
    .from('sys_config').select('value').eq('key', key).single()

  if (error) return NextResponse.json({ success: false })
  return NextResponse.json({ success: true, rate: parseFloat(data.value) }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { key = 'VND_RATE', value } = body

  const db = createServiceClient()
  const { data: oldCfg } = await db.from('sys_config').select('value').eq('key', key).single()

  const { error } = await db
    .from('sys_config')
    .upsert({ key, value: String(value) }, { onConflict: 'key' })

  if (error) return NextResponse.json({ success: false, message: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })

  const profile = await getUserProfile(user.id, user.email)
  logAction({
    actor:    profile?.email || user.email || '',
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
