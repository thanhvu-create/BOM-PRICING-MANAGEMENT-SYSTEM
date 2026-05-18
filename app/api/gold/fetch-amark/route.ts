import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/gold/fetch-amark — Manual fetch gold prices from Amark (Admin/Manager only)
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin' && profile?.role !== 'Manager') {
      return NextResponse.json({ error: 'Admin or Manager only' }, { status: 403 })
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
    const lossFactor = parseFloat(cfg?.value || '1.06')

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
