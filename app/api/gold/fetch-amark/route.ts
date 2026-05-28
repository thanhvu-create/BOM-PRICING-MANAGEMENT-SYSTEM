import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { fetchMetalPrices } from '@/lib/gold-fetch'

// GET /api/gold/fetch-amark — fetch today's prices, pre-fill modal (no auto-save)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Admin or Manager only' }, { status: 403 })

    const { goldOz, ptOz, agOz, source, _debug } = await fetchMetalPrices()

    if (!goldOz) {
      return NextResponse.json({
        success: false,
        message: `Không thể lấy giá. Vui lòng nhập thủ công. (${_debug.join(' | ')})`,
      }, { status: 502 })
    }

    const { data: cfg } = await db.from('sys_config').select('value').eq('key', 'GOLD_TRIGGER_LF').single()
    const lossFactor = parseFloat(cfg?.value || '1.06')
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

    return NextResponse.json({ success: true, date: today, goldOz, ptOz, agOz, lossFactor, source, _debug })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
