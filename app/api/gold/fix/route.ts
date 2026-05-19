import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const OZ = 31.103

// Recalculate karat prices from raw oz values
function computeKaratPrices(
  goldOz: number,
  ptOz: number,
  agOz: number,
  lf: number,
  existingKeys: string[] = []
): Record<string, number> {
  // Default karats + any custom karats from existing data
  const defaultKarats = [10, 14, 18, 20, 22, 24]
  const customKarats: number[] = []

  for (const k of existingKeys) {
    const n = parseInt(k)
    if (!isNaN(n) && !defaultKarats.includes(n)) customKarats.push(n)
  }

  const allKarats = [...defaultKarats, ...customKarats]
  const prices: Record<string, number> = {}

  for (const k of allKarats) {
    prices[`${k}K`] = Math.round((goldOz / OZ) * (k / 24) * lf * 10000) / 10000
  }
  prices['PT'] = Math.round((ptOz / OZ) * lf * 10000) / 10000
  prices['AG'] = Math.round((agOz / OZ) * lf * 10000) / 10000

  return prices
}

// Parse karat_prices safely, returning only valid karat keys
function parseKaratPrices(raw: any): Record<string, number> {
  let kp = raw
  if (typeof kp === 'string') {
    try { kp = JSON.parse(kp) } catch {}
  }
  // Auto-heal: { "0": "{", "1": "\"", ... }
  if (kp && typeof kp === 'object' && kp['0'] === '{') {
    let str = ''; let j = 0
    while (kp[String(j)] !== undefined) { str += kp[String(j)]; j++ }
    try { kp = JSON.parse(str) } catch {
      try { kp = JSON.parse(str + '}') } catch { kp = {} }
    }
  }
  if (typeof kp !== 'object' || kp === null) return {}
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(kp)) {
    if (!/^\d+$/.test(k)) result[k] = v as number
  }
  return result
}

// GET /api/gold/fix — recompute all karat_prices from stored oz values
export async function GET() {
  try {
    const db = createServiceClient()

    const { data: rows, error } = await db.from('gold_material').select('*')
    if (error) throw error

    const results = []

    for (const row of rows || []) {
      const goldOz = Number(row.amark_gold_oz) || 0
      const ptOz   = Number(row.amark_pt_oz)   || 0
      const agOz   = Number(row.amark_ag_oz)   || 0
      const lf     = Number(row.loss_factor)   || 1.06

      if (!goldOz) {
        results.push({ date: row.price_date, status: 'skipped', reason: 'no gold oz' })
        continue
      }

      // Get existing custom karats to preserve them
      const existing = parseKaratPrices(row.karat_prices)
      const existingKeys = Object.keys(existing)

      // Recompute all karats from oz values
      const newPrices = computeKaratPrices(goldOz, ptOz, agOz, lf, existingKeys)

      const { error: updErr } = await db.from('gold_material')
        .update({ karat_prices: newPrices })
        .eq('price_date', row.price_date)

      results.push({
        date: row.price_date,
        status: updErr ? 'failed' : 'updated',
        error: updErr?.message,
        prices: updErr ? undefined : newPrices,
      })
    }

    const updated = results.filter(r => r.status === 'updated').length
    const failed  = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length

    return NextResponse.json({
      success: true,
      message: `Processed ${rows?.length || 0} rows: ${updated} updated, ${skipped} skipped, ${failed} failed`,
      details: results,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
