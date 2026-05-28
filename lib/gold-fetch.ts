/**
 * Shared metal price fetching logic.
 * Used by both /api/gold/trigger (cron) and /api/gold/fetch-amark (manual).
 * Source priority: Amark (via AMARK_PROXY_URL worker) → Yahoo Finance → goldprice.org
 */

export interface MetalPrices {
  goldOz: number
  ptOz:   number
  agOz:   number
  source: string
  _debug: string[]
}

async function scrapeAmark(): Promise<{ goldOz: number; ptOz: number; agOz: number; _debug?: string } | null> {
  const proxyUrl = process.env.AMARK_PROXY_URL
  if (!proxyUrl) return { goldOz: 0, ptOz: 0, agOz: 0, _debug: 'NO_AMARK_PROXY_URL' }

  try {
    const res = await fetch(proxyUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { goldOz: 0, ptOz: 0, agOz: 0, _debug: `WORKER_HTTP_${res.status}` }

    const data = await res.json()
    const goldOz = Number(data.goldOz)
    if (!goldOz || goldOz < 1000 || goldOz > 15000)
      return { goldOz: 0, ptOz: 0, agOz: 0, _debug: `INVALID_GOLD_${goldOz}` }

    return { goldOz, ptOz: Number(data.ptOz) || 0, agOz: Number(data.agOz) || 0 }
  } catch (e: any) {
    return { goldOz: 0, ptOz: 0, agOz: 0, _debug: `EXCEPTION:${e.message}` }
  }
}

async function fetchYahooPrice(symbol: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&events=div%7Csplit`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Yahoo ${symbol}: HTTP ${res.status}`)
  const d = await res.json()
  const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!price || price <= 0) throw new Error(`Yahoo ${symbol}: no price data`)
  return Math.round(price * 100) / 100
}

export async function fetchMetalPrices(): Promise<MetalPrices> {
  const debug: string[] = []

  // Source 1: Amark.com via Cloudflare Worker proxy
  const amark = await scrapeAmark()
  if (amark?._debug) debug.push(`amark: ${amark._debug}`)
  if (amark?.goldOz) {
    return { goldOz: amark.goldOz, ptOz: amark.ptOz, agOz: amark.agOz, source: 'amark.com', _debug: debug }
  }

  // Source 2: Yahoo Finance (reliable from Vercel — never blocks cloud IPs)
  try {
    const [goldOz, agOz, ptOz] = await Promise.all([
      fetchYahooPrice('GC=F'),
      fetchYahooPrice('SI=F'),
      fetchYahooPrice('PL=F'),
    ])
    if (goldOz > 0) {
      return { goldOz, ptOz, agOz, source: 'Yahoo Finance (GC=F / SI=F / PL=F)', _debug: debug }
    }
  } catch (e: any) { debug.push(`Yahoo: ${e.message}`) }

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
          ptOz:   Math.round((item.xptPrice  || 0) * 100) / 100,
          agOz:   Math.round((item.xagPrice  || 0) * 100) / 100,
          source: 'goldprice.org',
          _debug: debug,
        }
      }
    } else {
      debug.push(`goldprice.org: HTTP ${res.status}`)
    }
  } catch (e: any) { debug.push(`goldprice.org: ${e.message}`) }

  throw new Error(`All sources failed — ${debug.join(' | ')}`)
}
