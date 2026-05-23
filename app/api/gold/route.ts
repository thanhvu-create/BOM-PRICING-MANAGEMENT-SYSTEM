import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

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
    return NextResponse.json({ data: data || [] }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    })
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

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { date, goldOz, ptOz, agOz, lossFactor, overwriteIfSameDate } = await request.json()
    const lf = Number(lossFactor) || 1.06
    const karat_prices = computeKaratPrices(Number(goldOz)||0, Number(ptOz)||0, Number(agOz)||0, lf)

    // Check if date already exists when overwrite is false
    const { data: existing } = await db.from('gold_material').select('price_date, amark_gold_oz').eq('price_date', date).single()
    if (!overwriteIfSameDate && existing) {
      return NextResponse.json({ error: `Đã có giá ngày ${date}. Bật "Ghi đè" để cập nhật.` }, { status: 409 })
    }

    const { error } = await db.from('gold_material').upsert({
      price_date:    date,
      amark_gold_oz: Number(goldOz) || 0,
      amark_pt_oz:   Number(ptOz) || 0,
      amark_ag_oz:   Number(agOz) || 0,
      loss_factor:   lf,
      karat_prices,
    }, { onConflict: 'price_date' })
    if (error) throw error

    const isUpdate = !!existing
    logAction({
      actor:    profile?.username || user.email || '',
      role:     profile?.role,
      action:   isUpdate ? 'UPDATE' : 'CREATE',
      entity:   'gold',
      entityId: date,
      summary:  `${isUpdate ? 'Cập nhật' : 'Thêm'} giá vàng ngày ${date} — Gold: $${Number(goldOz).toFixed(2)}/oz`,
      diff: isUpdate
        ? { before: { amark_gold_oz: existing.amark_gold_oz }, after: { amark_gold_oz: Number(goldOz) || 0, loss_factor: lf } }
        : { after: { price_date: date, amark_gold_oz: Number(goldOz) || 0, amark_pt_oz: Number(ptOz) || 0, amark_ag_oz: Number(agOz) || 0, loss_factor: lf } },
    })

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

    const db = createServiceClient()
    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    const { data: oldRow } = await db.from('gold_material').select('amark_gold_oz, amark_pt_oz, amark_ag_oz').eq('price_date', date).single()

    const { error } = await db.from('gold_material').delete().eq('price_date', date)
    if (error) throw error

    logAction({
      actor:    profile?.username || user.email || '',
      role:     profile?.role,
      action:   'DELETE',
      entity:   'gold',
      entityId: date,
      summary:  `Xóa giá vàng ngày ${date}`,
      diff:     { before: { price_date: date, amark_gold_oz: oldRow?.amark_gold_oz, amark_pt_oz: oldRow?.amark_pt_oz, amark_ag_oz: oldRow?.amark_ag_oz } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
