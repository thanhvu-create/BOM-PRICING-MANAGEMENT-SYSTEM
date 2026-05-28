/**
 * GET /api/gold/trigger — Vercel Cron (01:00 UTC = 08:00 VN) + manual "Run Now"
 * Auth: Vercel cron header | CRON_SECRET | AMARK_FETCH_SECRET | Admin/Manager session
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'
import { fetchMetalPrices } from '@/lib/gold-fetch'

const OZ = 31.103

export async function GET(req: NextRequest) {
  try {
    const cronSecret   = process.env.CRON_SECRET
    const customSecret = process.env.AMARK_FETCH_SECRET
    const authHeader   = req.headers.get('authorization') || ''
    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    const validCron    = cronSecret && authHeader === `Bearer ${cronSecret}`
    const validCustom  = customSecret && authHeader === `Bearer ${customSecret}`

    // Also allow Admin/Manager session users (for manual "Run Now" test)
    let isSessionAdmin = false
    if (!isVercelCron && !validCron && !validCustom) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const profile = await getUserProfile(user.id, user.email)
        isSessionAdmin = ['Admin', 'Manager'].includes(profile?.role || '')
      }
      if (!isSessionAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const db = createServiceClient()

    const { data: configs } = await db
      .from('sys_config').select('key, value')
      .in('key', ['GOLD_TRIGGER_LF', 'GOLD_TRIGGER_ENABLED', 'GOLD_LOSS_FACTOR'])
    const cfgMap: Record<string, string> = {}
    for (const c of configs || []) cfgMap[c.key] = c.value

    const isEnabled = cfgMap['GOLD_TRIGGER_ENABLED'] !== 'false'
    if (!isEnabled) {
      return NextResponse.json({ success: false, message: 'Trigger đang tắt. Bật lại trong trang Gold.' })
    }

    const lossFactor = parseFloat(cfgMap['GOLD_TRIGGER_LF'] || cfgMap['GOLD_LOSS_FACTOR'] || process.env.LOSS_FACTOR_DEFAULT || '1.06')

    const { goldOz, ptOz, agOz, source } = await fetchMetalPrices()

    // Include custom karat columns from existing rows
    const { data: existingRows } = await db.from('gold_material').select('karat_prices').limit(5)
    const customKarats = new Set<number>()
    const defaultSet = new Set([10, 14, 18, 20, 22, 24])
    for (const row of existingRows || []) {
      let kp = row.karat_prices as any
      if (typeof kp === 'string') { try { kp = JSON.parse(kp) } catch {} }
      if (typeof kp === 'object' && kp) {
        for (const k of Object.keys(kp)) {
          const n = parseInt(k)
          if (!isNaN(n) && !defaultSet.has(n)) customKarats.add(n)
        }
      }
    }

    const allKarats = [10, 14, 18, 20, 22, 24, ...Array.from(customKarats)]
    const karatPrices: Record<string, number> = {}
    for (const k of allKarats) {
      karatPrices[`${k}K`] = Math.round((goldOz / OZ) * (k / 24) * lossFactor * 10000) / 10000
    }
    karatPrices['PT'] = Math.round((ptOz / OZ) * lossFactor * 10000) / 10000
    karatPrices['AG'] = Math.round((agOz / OZ) * lossFactor * 10000) / 10000

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

    const { error } = await db.from('gold_material').upsert({
      price_date:    today,
      amark_gold_oz: goldOz,
      amark_pt_oz:   ptOz,
      amark_ag_oz:   agOz,
      loss_factor:   lossFactor,
      karat_prices:  karatPrices,
    }, { onConflict: 'price_date' })

    if (error) throw error

    await logAction({
      actor:    'system',
      role:     'system',
      action:   'CREATE',
      entity:   'gold',
      entityId: today,
      summary:  `[Auto Trigger] Thêm giá vàng ngày ${today} — Gold: $${goldOz.toFixed(2)}/oz (${source})`,
      diff:     { after: { price_date: today, amark_gold_oz: goldOz, source } },
    })

    return NextResponse.json({ success: true, date: today, goldOz, ptOz, agOz, lossFactor, karatPrices, source })
  } catch (err: any) {
    await logAction({
      actor:    'system',
      role:     'system',
      action:   'UPDATE',
      entity:   'gold',
      entityId: 'trigger-error',
      summary:  `[Auto Trigger] FAILED — ${err.message}`,
    })
    console.error('[gold/trigger]', err.message)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
