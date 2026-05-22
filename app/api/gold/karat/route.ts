import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

const OZ = 31.103

// POST /api/gold/karat — add a karat column (e.g. "16K") to all rows
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { label } = await request.json()
    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'label required (e.g. "16K")' }, { status: 400 })
    }
    const clean = label.trim().toUpperCase()
    const karatMatch = clean.match(/^(\d+)K$/)
    if (!karatMatch) {
      return NextResponse.json({ error: 'label must be like 16K, 20K, etc.' }, { status: 400 })
    }
    const karatNum = parseInt(karatMatch[1])

    const db = createServiceClient()
    const { data: rows, error: fetchErr } = await db.from('gold_material').select('*')
    if (fetchErr) throw fetchErr

    // Update each row — add the new karat price
    for (const row of (rows || [])) {
      // Parse existing karat_prices safely (handle corrupted data)
      let existing: Record<string, number> = {}
      let rawKp = row.karat_prices
      if (typeof rawKp === 'string') {
        try { rawKp = JSON.parse(rawKp) } catch {}
      }
      if (rawKp && typeof rawKp === 'object') {
        // Strip numeric index keys (corruption artifact)
        for (const [k, v] of Object.entries(rawKp)) {
          if (!/^\d+$/.test(k)) existing[k] = v as number
        }
      }
      if (existing[clean] !== undefined) continue // already exists
      const price = Math.round((row.amark_gold_oz / OZ) * (karatNum / 24) * row.loss_factor * 10000) / 10000
      const updated = { ...existing, [clean]: price }
      await db.from('gold_material').update({ karat_prices: updated }).eq('price_date', row.price_date)
    }

    return NextResponse.json({ success: true, label: clean })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/gold/karat?label=16K — remove a karat column from all rows
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const label = request.nextUrl.searchParams.get('label')
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })
    const clean = label.trim().toUpperCase()

    // Block removing default karats
    const defaults = ['10K', '14K', '18K', '20K', '22K', '24K', 'PT', 'AG']
    if (defaults.includes(clean)) {
      return NextResponse.json({ error: `Cannot remove default karat ${clean}` }, { status: 400 })
    }

    const db = createServiceClient()
    const { data: rows, error: fetchErr } = await db.from('gold_material').select('*')
    if (fetchErr) throw fetchErr

    for (const row of (rows || [])) {
      const existing = { ...row.karat_prices }
      if (existing[clean] === undefined) continue
      delete existing[clean]
      await db.from('gold_material').update({ karat_prices: existing }).eq('price_date', row.price_date)
    }

    return NextResponse.json({ success: true, label: clean })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
