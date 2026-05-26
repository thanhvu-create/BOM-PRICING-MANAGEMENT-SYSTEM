import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

// GET /api/gold/trigger/status — trả về trạng thái trigger hiện tại
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createServiceClient()
    const { data } = await db
      .from('sys_config')
      .select('key, value')
      .in('key', ['GOLD_TRIGGER_LF', 'GOLD_TRIGGER_HOUR', 'GOLD_TRIGGER_ENABLED', 'GOLD_LOSS_FACTOR'])

    const cfg: Record<string, string> = {}
    for (const row of data || []) cfg[row.key] = row.value

    const enabled = cfg['GOLD_TRIGGER_ENABLED'] !== 'false' // default true
    const hour = parseInt(cfg['GOLD_TRIGGER_HOUR'] || '8')
    const lf = cfg['GOLD_TRIGGER_LF'] || cfg['GOLD_LOSS_FACTOR'] || '1.06'

    // Vercel Cron chạy theo UTC — VN là UTC+7
    const utcHour = (hour - 7 + 24) % 24
    const schedule = `0 ${utcHour} * * *`

    return NextResponse.json({
      success: true,
      data: {
        active: enabled,
        enabled,
        schedule,
        nextRunVN: `${String(hour).padStart(2, '0')}:00 VN (${String(utcHour).padStart(2, '0')}:00 UTC)`,
        lossFactor: parseFloat(lf),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
