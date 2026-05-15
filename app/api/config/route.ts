/**
 * GET  /api/config?key=VND_RATE  → getVndRate()
 * POST /api/config               → saveVndRate()
 * Body: { key: string, value: string }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase
    .from('sys_config')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ success: false, message: error.message })
  return NextResponse.json({ success: true })
}
