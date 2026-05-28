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
    const lf = cfg['GOLD_TRIGGER_LF'] || cfg['GOLD_LOSS_FACTOR'] || '1.06'

    // Cron schedule is hardcoded in vercel.json: "0 1 * * *" = 01:00 UTC = 08:00 VN
    const CRON_UTC_HOUR = 1
    const CRON_VN_HOUR  = CRON_UTC_HOUR + 7

    return NextResponse.json({
      success: true,
      data: {
        active: enabled,
        enabled,
        schedule: `0 ${CRON_UTC_HOUR} * * *`,
        nextRunVN: `${String(CRON_VN_HOUR).padStart(2, '0')}:00 VN (${String(CRON_UTC_HOUR).padStart(2, '0')}:00 UTC)`,
        lossFactor: parseFloat(lf),
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
