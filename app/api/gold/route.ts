import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const OZ = 31.103

function computeKaratPrices(goldOz: number, ptOz: number, agOz: number, lf: number) {
  const karats = [10, 14, 18, 20, 22, 24]
  const prices: Record<string, number> = {}
  karats.forEach(k => {
    prices[`${k}K`] = Math.round((goldOz / OZ) * (k / 24) * lf * 10000) / 10000
  })
  prices['PT'] = Math.round((ptOz / OZ) * lf * 10000) / 10000
  prices['AG'] = Math.round((agOz / OZ) * lf * 10000) / 10000
  return prices
}

// GET — danh sách gold material
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data, error } = await db
      .from('gold_material').select('*').order('price_date', { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — upsert gold row
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { date, goldOz, ptOz, agOz, lossFactor } = await request.json()
    const lf = Number(lossFactor) || 1.06
    const karat_prices = computeKaratPrices(Number(goldOz)||0, Number(ptOz)||0, Number(agOz)||0, lf)

    const db = createServiceClient()
    const { error } = await db.from('gold_material').upsert({
      price_date:    date,
      amark_gold_oz: Number(goldOz) || 0,
      amark_pt_oz:   Number(ptOz) || 0,
      amark_ag_oz:   Number(agOz) || 0,
      loss_factor:   lf,
      karat_prices,
    }, { onConflict: 'price_date' })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — xóa row theo date
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    const db = createServiceClient()
    const { error } = await db.from('gold_material').delete().eq('price_date', date)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
