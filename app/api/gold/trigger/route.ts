/**
 * GET /api/gold/trigger — Vercel Cron + manual "Run Now"
 * Uses goldprice.org public API (no key needed) with fallbacks
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const OZ = 31.103

// ─── Amark.com scrape (per gold.md §8 spec) ───────────────────────────────
// Dùng AMARK_PROXY_URL (Cloudflare Worker) để bypass Cloudflare bot detection.
// Nếu không có proxy URL, thử direct fetch (hoạt động ở local dev).
async function scrapeAmark(): Promise<{ goldOz: number; ptOz: number; agOz: number } | null> {
  try {
    const proxyUrl = process.env.AMARK_PROXY_URL
    const targetUrl = proxyUrl || 'https://www.amark.com'

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    }
    if (!proxyUrl) {
      headers['Sec-Fetch-Dest'] = 'document'
      headers['Sec-Fetch-Mode'] = 'navigate'
      headers['Sec-Fetch-Site'] = 'none'
      headers['Sec-Ch-Ua'] = '"Chromium";v="124", "Google Chrome";v="124"'
    }

    const res = await fetch(targetUrl, { headers, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const html = await res.text()
    if (!html.includes('spotprice') && !html.includes('data-material')) return null

    function extractAsk(metal: string): number {
      const re = new RegExp(`data-material=["']${metal}["'][\\s\\S]{0,500}?\\$([\\d,]+\\.?\\d*)\\s*/\\s*([\\d,]+\\.?\\d*)`, 'i')
      const m = html.match(re)
      if (m) return parseFloat(m[2].replace(/,/g, ''))
      const re2 = new RegExp(`${metal}[\\s\\S]{0,600}?class=["']price["'][^>]*>\\$?([\\d,]+\\.?\\d*)\\s*/\\s*([\\d,]+\\.?\\d*)`, 'i')
      const m2 = html.match(re2)
      return m2 ? parseFloat(m2[2].replace(/,/g, '')) : 0
    }

    const goldOz = extractAsk('Gold')
    if (goldOz < 1000 || goldOz > 15000) return null
    return { goldOz, ptOz: extractAsk('Platinum'), agOz: extractAsk('Silver') }
  } catch { return null }
}

async function fetchMetalPrices(): Promise<{ goldOz: number; ptOz: number; agOz: number; source: string }> {
  const errors: string[] = []

  // Source 1: Amark.com qua Cloudflare Worker proxy (AMARK_PROXY_URL)
  const amark = await scrapeAmark()
  if (amark?.goldOz) {
    const label = process.env.AMARK_PROXY_URL ? 'amark.com (worker)' : 'amark.com (direct)'
    return { ...amark, source: label }
  }
  errors.push('amark.com: blocked or parse failed')

  // Source 2: Yahoo Finance futures (reliable from Vercel)
  try {
    async function yahooPrice(sym: string): Promise<number> {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (!price) throw new Error('no price')
      return Math.round(price * 100) / 100
    }
    const [g, s, p] = await Promise.all([yahooPrice('GC=F'), yahooPrice('SI=F'), yahooPrice('PL=F')])
    if (g > 0) return { goldOz: g, agOz: s, ptOz: p, source: 'Yahoo Finance' }
  } catch (e: any) { errors.push(`Yahoo: ${e.message}`) }

  // Source 3: goldprice.org
  try {
    const res = await fetch('https://data-asg.goldprice.org/dbXRates/USD', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const d = await res.json()
      const item = d?.items?.[0]
      if (item?.xauPrice > 0) {
        return {
          goldOz: Math.round(item.xauPrice * 100) / 100,
          ptOz:   Math.round((item.xptPrice || 0) * 100) / 100,
          agOz:   Math.round((item.xagPrice || 0) * 100) / 100,
          source: 'goldprice.org',
        }
      }
    }
    errors.push(`goldprice.org: HTTP ${res.status}`)
  } catch (e: any) { errors.push(`goldprice.org: ${e.message}`) }

  throw new Error(`All sources failed — ${errors.join(' | ')}`)
}


export async function GET(req: NextRequest) {
  try {
    // Optional secret check
    const secret = process.env.AMARK_FETCH_SECRET
    if (secret) {
      const auth = req.headers.get('authorization') || req.headers.get('x-amark-secret') || ''
      const qsec = req.nextUrl.searchParams.get('secret') || ''
      if (auth !== `Bearer ${secret}` && qsec !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const db = createServiceClient()

    // Get config
    const { data: configs } = await db
      .from('sys_config').select('key, value')
      .in('key', ['GOLD_TRIGGER_LF', 'GOLD_TRIGGER_HOUR', 'GOLD_TRIGGER_ENABLED'])
    const cfgMap: Record<string, string> = {}
    for (const c of configs || []) cfgMap[c.key] = c.value

    // Check if trigger is enabled (soft disable — cron vẫn chạy nhưng skip save)
    const isEnabled = cfgMap['GOLD_TRIGGER_ENABLED'] !== 'false'
    if (!isEnabled) {
      return NextResponse.json({ success: false, message: 'Trigger đang tắt. Bật lại trong trang Gold.' })
    }

    const lossFactor = parseFloat(cfgMap['GOLD_TRIGGER_LF'] || process.env.LOSS_FACTOR_DEFAULT || '1.06')

    // Fetch metal prices
    const { goldOz, ptOz, agOz, source } = await fetchMetalPrices()

    // Get any custom karat columns from existing rows
    const { data: existingRows } = await db.from('gold_material').select('karat_prices').limit(5)
    const customKarats = new Set<number>()
    const defaultSet = new Set([10, 14, 18, 20, 22, 24])
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

    // Compute karat prices
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

    return NextResponse.json({ success: true, date: today, goldOz, ptOz, agOz, lossFactor, karatPrices, source })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
