/**
 * Vercel Cron Job — chạy 8h sáng VN (= 1h UTC)
 * Thay thế setupDailyGoldTrigger() + autoFetchAndSaveGoldPrice() trong GAS
 *
 * Schedule trong vercel.json: "0 1 * * *"
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Bảo vệ endpoint
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.AMARK_FETCH_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createServiceClient()

    // Fetch giá từ amark.com
    const res = await fetch('https://www.amark.com/api/prices', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!res.ok) throw new Error(`Amark fetch failed: ${res.status}`)
    const data = await res.json()

    // Parse ASK prices
    const goldOz = parseFloat(data?.gold?.ask || data?.XAU?.ask || '0')
    const ptOz   = parseFloat(data?.platinum?.ask || data?.XPT?.ask || '0')
    const agOz   = parseFloat(data?.silver?.ask || data?.XAG?.ask || '0')

    if (goldOz === 0) throw new Error('Could not parse gold price from amark response')

    // Lấy loss factor từ sys_config
    const { data: cfg } = await db
      .from('sys_config').select('value').eq('key', 'GOLD_TRIGGER_LF').single()
    const lossFactor = parseFloat(cfg?.value || '1.06')

    // Tính karat prices
    const karats = [10, 14, 18, 20, 22, 24]
    const karatPrices: Record<string, number> = {}
    karats.forEach(k => {
      karatPrices[`${k}K`] = parseFloat(((goldOz / 31.103) * (k / 24) * lossFactor).toFixed(4))
    })
    karatPrices['PT'] = parseFloat(((ptOz / 31.103) * lossFactor).toFixed(4))
    karatPrices['AG'] = parseFloat(((agOz / 31.103) * lossFactor).toFixed(4))

    const today = new Date().toISOString().split('T')[0]

    // Upsert vào gold_material
    const { error } = await db.from('gold_material').upsert({
      price_date:    today,
      amark_gold_oz: goldOz,
      amark_pt_oz:   ptOz,
      amark_ag_oz:   agOz,
      loss_factor:   lossFactor,
      karat_prices:  karatPrices,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'price_date' })

    if (error) throw error

    return NextResponse.json({ success: true, date: today, goldOz, karatPrices })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
