/**
 * GET /api/gold/trigger — Vercel Cron target (0 1 * * * = 8AM VN)
 * Also callable manually from Gold page "Run Now" button
 * Does NOT require user session — uses service role key
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // Optional secret check for cron (skip if not configured)
    const secret = process.env.AMARK_FETCH_SECRET
    if (secret) {
      const authHeader = req.headers.get('authorization') || req.headers.get('x-amark-secret') || ''
      const querySecret = req.nextUrl.searchParams.get('secret') || ''
      if (authHeader !== `Bearer ${secret}` && querySecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const db = createServiceClient()

    // Fetch from amark.com
    const res = await fetch('https://www.amark.com/api/prices', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Amark fetch failed: ${res.status}`)
    const data = await res.json()

    // Parse ASK prices
    const goldOz = parseFloat(data?.gold?.ask || data?.XAU?.ask || '0')
    const ptOz   = parseFloat(data?.platinum?.ask || data?.XPT?.ask || '0')
    const agOz   = parseFloat(data?.silver?.ask || data?.XAG?.ask || '0')

    if (goldOz === 0) throw new Error('Could not parse gold price from Amark response')

    // Get loss factor from sys_config
    const { data: cfg } = await db
      .from('sys_config').select('value').eq('key', 'GOLD_TRIGGER_LF').single()
    const lossFactor = parseFloat(cfg?.value || process.env.LOSS_FACTOR_DEFAULT || '1.06')

    // Compute karat prices
    const karats = [10, 14, 18, 20, 22, 24]
    const karatPrices: Record<string, number> = {}
    karats.forEach(k => {
      karatPrices[`${k}K`] = parseFloat(((goldOz / 31.103) * (k / 24) * lossFactor).toFixed(4))
    })
    karatPrices['PT'] = parseFloat(((ptOz / 31.103) * lossFactor).toFixed(4))
    karatPrices['AG'] = parseFloat(((agOz / 31.103) * lossFactor).toFixed(4))

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

    // Upsert into gold_material
    const { error } = await db.from('gold_material').upsert({
      price_date:    today,
      amark_gold_oz: goldOz,
      amark_pt_oz:   ptOz,
      amark_ag_oz:   agOz,
      loss_factor:   lossFactor,
      karat_prices:  karatPrices,
    }, { onConflict: 'price_date' })

    if (error) throw error

    return NextResponse.json({ success: true, date: today, goldOz, ptOz, agOz, karatPrices })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
