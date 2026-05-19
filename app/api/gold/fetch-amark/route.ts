import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ─── Yahoo Finance — gold/silver/platinum futures ─────────────────────────
// GC=F = Gold futures (≈ spot), SI=F = Silver futures, PL=F = Platinum futures
// Yahoo Finance is reliable from server-side (never blocks Vercel/AWS IPs)
async function fetchYahooPrice(symbol: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&events=div%7Csplit`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Yahoo ${symbol}: HTTP ${res.status}`)
  const d = await res.json()
  const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!price || price <= 0) throw new Error(`Yahoo ${symbol}: no price data`)
  return Math.round(price * 100) / 100
}

// ─── Amark.com scrape (per gold.md §8 spec) ───────────────────────────────
// Direct fetch bị Cloudflare block khi chạy trên Vercel (AWS IP).
// Giải pháp: set AMARK_PROXY_URL = Cloudflare Worker URL để bypass.
// Worker chạy trong Cloudflare network → không bị block khi fetch amark.com.
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
    // Direct fetch cần Sec-Fetch headers để bypass Cloudflare
    if (!proxyUrl) {
      headers['Sec-Fetch-Dest'] = 'document'
      headers['Sec-Fetch-Mode'] = 'navigate'
      headers['Sec-Fetch-Site'] = 'none'
      headers['Sec-Ch-Ua'] = '"Chromium";v="124", "Google Chrome";v="124"'
    }

    const res = await fetch(targetUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const html = await res.text()

    // Phải có marker của amark để tránh parse Cloudflare challenge page
    if (!html.includes('spotprice') && !html.includes('data-material')) return null

    // Parse ASK price (số sau /) từ mỗi div .spotprice
    // HTML: <div data-material="Gold"><p class="price">$4,533.93 / 4,549.29</p></div>
    function extractAsk(metal: string): number {
      const re = new RegExp(
        `data-material=["']${metal}["'][\\s\\S]{0,500}?\\$([\\d,]+\\.?\\d*)\\s*/\\s*([\\d,]+\\.?\\d*)`, 'i'
      )
      const m = html.match(re)
      if (m) return parseFloat(m[2].replace(/,/g, ''))
      // Fallback: class="price" gần tên metal
      const re2 = new RegExp(
        `${metal}[\\s\\S]{0,600}?class=["']price["'][^>]*>\\$?([\\d,]+\\.?\\d*)\\s*/\\s*([\\d,]+\\.?\\d*)`, 'i'
      )
      const m2 = html.match(re2)
      if (m2) return parseFloat(m2[2].replace(/,/g, ''))
      // Fallback: range-based regex (gold.md §8)
      const re3 = new RegExp(`${metal}[\\s\\S]{0,800}?([\\d,]+\\.\\d{2})`, 'i')
      const m3 = html.match(re3)
      return m3 ? parseFloat(m3[1].replace(/,/g, '')) : 0
    }

    const goldOz = extractAsk('Gold')
    if (goldOz < 1000 || goldOz > 15000) return null   // Validate range per gold.md §8
    return {
      goldOz,
      ptOz: extractAsk('Platinum'),
      agOz: extractAsk('Silver'),
    }
  } catch { return null }
}


// GET /api/gold/fetch-amark — fetch today's prices, pre-fill modal (no auto-save)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: profile } = await db.from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Admin or Manager only' }, { status: 403 })

    let goldOz = 0, ptOz = 0, agOz = 0, source = ''
    const errors: string[] = []

    // Attempt 1: Amark.com scrape (works in local dev / when not Cloudflare-blocked)
    const amark = await scrapeAmark()
    if (amark?.goldOz) {
      goldOz = amark.goldOz; ptOz = amark.ptOz; agOz = amark.agOz
      source = 'amark.com'
    }

    // Attempt 2: Yahoo Finance (most reliable from Vercel — never blocked)
    if (!goldOz) {
      try {
        goldOz = await fetchYahooPrice('GC=F')   // Gold futures $/oz
        agOz   = await fetchYahooPrice('SI=F')   // Silver futures $/oz
        ptOz   = await fetchYahooPrice('PL=F')   // Platinum futures $/oz
        source = 'Yahoo Finance (GC=F / SI=F / PL=F)'
      } catch (e: any) { errors.push(`Yahoo: ${e.message}`) }
    }

    // Attempt 3: goldprice.org
    if (!goldOz) {
      try {
        const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD', {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (r.ok) {
          const d = await r.json()
          const item = d?.items?.[0]
          if (item?.xauPrice > 0) {
            goldOz = Math.round(item.xauPrice * 100) / 100
            ptOz   = Math.round((item.xptPrice || 0) * 100) / 100
            agOz   = Math.round((item.xagPrice || 0) * 100) / 100
            source = 'goldprice.org'
          }
        }
      } catch (e: any) { errors.push(`goldprice.org: ${e.message}`) }
    }

    if (!goldOz) {
      return NextResponse.json({
        success: false,
        message: `Không thể lấy giá. Vui lòng nhập thủ công. (${errors.join(' | ')})`,
      }, { status: 502 })
    }

    const { data: cfg } = await db.from('sys_config').select('value').eq('key', 'GOLD_TRIGGER_LF').single()
    const lossFactor = parseFloat(cfg?.value || '1.06')
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

    return NextResponse.json({ success: true, date: today, goldOz, ptOz, agOz, lossFactor, source })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
