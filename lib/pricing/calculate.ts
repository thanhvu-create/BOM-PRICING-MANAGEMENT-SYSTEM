/**
 * calculateBOMCost — port từ Server_API_BOM.gs
 * Chạy server-side trong Next.js API Route
 */
import { createServiceClient } from '@/lib/supabase/server'
import type { BOMPayload, PricingResult } from '@/types'

export async function calculateBOMCost(payload: BOMPayload): Promise<PricingResult> {
  const db = createServiceClient()

  try {
    const { header, golds, stones } = payload
    const hasStones = stones.some(
      s => String(s.groupCode || '').trim() !== '' && (Number(s.qty) || 0) > 0
    )

    // ── 1. GOLD COST ─────────────────────────────────────────
    let totalGoldCost = 0
    let totalGoldWeight = 0
    const goldResults: PricingResult['data']['golds'] = []

    const { data: goldRow } = await db
      .from('gold_material')
      .select('karat_prices, loss_factor, amark_gold_oz, amark_pt_oz, amark_ag_oz')
      .lte('price_date', header.date)
      .order('price_date', { ascending: false })
      .limit(1)
      .single()

    for (let i = 0; i < golds.length; i++) {
      const g = golds[i]
      const w = Number(g.weight) || 0
      totalGoldWeight += w

      let pricePerGr = 0
      if (goldRow) {
        const { karat_prices, loss_factor, amark_gold_oz, amark_pt_oz, amark_ag_oz } = goldRow
        const lf = Number(loss_factor) || 1.06
        const type = g.goldType

        if (karat_prices && karat_prices[type] != null) {
          pricePerGr = Number(karat_prices[type])
        } else if (type === 'PT') {
          pricePerGr = (Number(amark_pt_oz) / 31.103) * lf
        } else if (type === 'AG') {
          pricePerGr = (Number(amark_ag_oz) / 31.103) * lf
        } else {
          const karat = parseInt(type) || 18
          pricePerGr = (Number(amark_gold_oz) / 31.103) * (karat / 24) * lf
        }
      }

      const cost = pricePerGr * w
      totalGoldCost += cost
      goldResults.push({ idx: i + 1, pricePerGr, cost })
    }

    // ── 2. STONE COST ────────────────────────────────────────
    let totalStoneCost = 0
    let totalStoneQty = 0
    const stoneResults: PricingResult['data']['stones'] = []

    for (let i = 0; i < stones.length; i++) {
      const s = stones[i]
      totalStoneCost += Number(s.giaBan) || 0
      totalStoneQty += Number(s.qty) || 0
      stoneResults.push({
        idx: i + 1,
        gradeId: s.gradeId,
        inputType: s.inputType,
        giaBan: s.giaBan,
      })
    }

    // ── 3. LABOR COST ────────────────────────────────────────
    let totalLaborCost = 0
    if (hasStones) {
      const { data: fees } = await db.from('mk_process_fee').select('unit_name, unit_price')
      let feePerStone = 0
      let feePerHour = 0

      fees?.forEach(f => {
        const name = (f.unit_name || '').toLowerCase().trim()
        // Normalize Vietnamese diacritics to ASCII for robust matching (handles NFD/NFC DB encoding)
        const nameAscii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
        if (name.includes('nhận hột') || nameAscii.includes('nhan hot') || name.includes('setting') || name.includes('stone')) {
          feePerStone = Number(f.unit_price) || 0
        } else if (name.includes('lắp ráp') || nameAscii.includes('lap rap') || name.includes('assembl') || name.includes('labor') || name.includes('labour')) {
          feePerHour = Number(f.unit_price) || 0
        }
      })

      // Fallback từ sys_config
      if (feePerHour === 0) {
        const { data: cfg } = await db
          .from('sys_config').select('value').eq('key', 'PROCESS_FEE_LAPRAP').single()
        feePerHour = Number(cfg?.value) || 10
      }

      totalLaborCost = totalStoneQty * feePerStone + (header.laborHours || 0) * feePerHour
    }

    // ── 4. CIF RATE ──────────────────────────────────────────
    let cifRate = 0.10
    if (hasStones && header.priceListType) {
      const { data: cifRow } = await db
        .from('mk_cif_rate')
        .select('cif_rate')
        .eq('price_list_type', header.priceListType)
        .single()
      if (cifRow && Number(cifRow.cif_rate) > 0) {
        cifRate = Number(cifRow.cif_rate)
      }
    }

    // ── 5. SELL PRICE ────────────────────────────────────────
    let costSubtotal: number
    let costCif: number
    let costTotal: number
    let sellPrice = 0

    if (!hasStones) {
      // CASE A: Chỉ vàng
      totalLaborCost = 0
      costSubtotal = totalGoldCost
      costCif = 0
      costTotal = totalGoldCost

      const { data: pgRows } = await db
        .from('mk_price_gram')
        .select('markup_factor, additional_price')
        .eq('sp_type', header.spType || '')
        .lte('weight_from', totalGoldWeight)
        .gte('weight_to', totalGoldWeight)
        .limit(1)

      const pg = pgRows?.[0]
      if (pg && Number(pg.markup_factor) > 0) {
        sellPrice = totalGoldCost * Number(pg.markup_factor)
          + (Number(pg.additional_price) || 0) * totalGoldWeight
      } else {
        sellPrice = totalGoldCost * 1.5
      }
    } else {
      // CASE B: Có hột
      costSubtotal = totalGoldCost + totalStoneCost + totalLaborCost
      costCif = costSubtotal * cifRate
      costTotal = costSubtotal + costCif

      const { data: smRows } = await db
        .from('mk_store_markup')
        .select('markups')
        .lte('value_from', costTotal)
        .gte('value_to', costTotal)
        .limit(1)

      const sm = smRows?.[0]
      // markups may be stored as a serialized JSON string — parse if needed
      let markupsObj: Record<string, number> = {}
      if (sm?.markups) {
        markupsObj = typeof sm.markups === 'string' ? JSON.parse(sm.markups) : sm.markups
      }
      let markup = markupsObj[header.priceListType || '']
      // Normalize fallback: strip leading prefix like "1)HPUS -P" → "HPUS -P"
      if ((!markup || Number(markup) === 0) && header.priceListType) {
        const normalized = header.priceListType.replace(/^[\dB]+[\d.]*\)\s*/, '').trim()
        const matchKey = Object.keys(markupsObj).find(k =>
          k.replace(/^[\dB]+[\d.]*\)\s*/, '').trim() === normalized
        )
        if (matchKey) markup = markupsObj[matchKey]
      }
      if (markup && Number(markup) > 0) {
        sellPrice = costTotal * Number(markup)
      } else {
        sellPrice = costTotal * 1.5
      }
    }

    // ── DEBUG ────────────────────────────────────────────────
    const dbgFees = await db.from('mk_process_fee').select('unit_name, unit_price')
    const dbgCif  = await db.from('mk_cif_rate').select('price_list_type, cif_rate')
    const dbgSM   = await db.from('mk_store_markup').select('value_from, value_to, markups')
      .lte('value_from', costTotal)
      .gte('value_to', costTotal)
      .limit(3)

    return {
      success: true,
      data: {
        golds: goldResults,
        stones: stoneResults,
        costGold: totalGoldCost,
        costStones: totalStoneCost,
        costLabor: totalLaborCost,
        costSubtotal,
        costCif,
        costTotal,
        sellPrice,
        _debug: {
          hasStones,
          totalStoneQty,
          laborHoursInput: header.laborHours,
          priceListType: header.priceListType,
          processFeeRows: dbgFees.data,
          cifRateRows: dbgCif.data,
          markupRowsForCost: dbgSM.data,
        },
      },
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
