/**
 * POST /api/gold/trigger/run
 * Accepts pre-fetched metal prices from client-side and saves to DB.
 * Auth required: Admin or Manager.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const OZ = 31.103

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: profile } = await db.from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const goldOz = parseFloat(body.goldOz) || 0
    const ptOz   = parseFloat(body.ptOz)   || 0
    const agOz   = parseFloat(body.agOz)   || 0
    if (!goldOz) return NextResponse.json({ error: 'Missing goldOz' }, { status: 400 })

    // LF: from body → sys_config → env → 1.06
    let lossFactor = parseFloat(body.lf) || 0
    if (!lossFactor) {
      const { data: cfg } = await db.from('sys_config').select('value').eq('key', 'GOLD_TRIGGER_LF').single()
      lossFactor = parseFloat(cfg?.value || process.env.LOSS_FACTOR_DEFAULT || '1.06')
    }

    // Get any custom karat columns
    const { data: existingRows } = await db.from('gold_material').select('karat_prices').limit(5)
    const defaultSet = new Set([10, 14, 18, 20, 22, 24])
    const customKarats = new Set<number>()
    for (const row of existingRows || []) {
      let kp = row.karat_prices as any
      if (typeof kp === 'string') { try { kp = JSON.parse(kp) } catch {} }
      if (typeof kp === 'object' && kp) {
        for (const k of Object.keys(kp)) {
          if (!/^\d+$/.test(k) && k !== 'PT' && k !== 'AG') {
            const n = parseInt(k)
            if (!isNaN(n) && !defaultSet.has(n)) customKarats.add(n)
          }
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

    return NextResponse.json({ success: true, date: today, goldOz, ptOz, agOz, lossFactor, karatPrices })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
