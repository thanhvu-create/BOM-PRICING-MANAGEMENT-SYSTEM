import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/bom/gold-price?date=YYYY-MM-DD&goldType=18K
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const goldType = searchParams.get('goldType') || '18K'

    const db = createServiceClient()
    const { data: row } = await db
      .from('gold_material')
      .select('karat_prices, loss_factor, amark_gold_oz, amark_pt_oz, amark_ag_oz')
      .lte('price_date', date)
      .order('price_date', { ascending: false })
      .limit(1)
      .single()

    if (!row) return NextResponse.json({ pricePerGram: 0 })

    const OZ = 31.103
    const lf = Number(row.loss_factor) || 1.06
    let pricePerGram = 0
    const kp = (row.karat_prices || {}) as Record<string, number>

    if (kp[goldType] != null) {
      pricePerGram = Number(kp[goldType])
    } else if (goldType === 'PT') {
      pricePerGram = (Number(row.amark_pt_oz) / OZ) * lf
    } else if (goldType === 'AG') {
      pricePerGram = (Number(row.amark_ag_oz) / OZ) * lf
    } else {
      const karat = parseInt(goldType) || 18
      pricePerGram = (Number(row.amark_gold_oz) / OZ) * (karat / 24) * lf
    }

    return NextResponse.json({ pricePerGram })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
