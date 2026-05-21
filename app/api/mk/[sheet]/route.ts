import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SHEET_TABLE: Record<string, string> = {
  'price_list_type': 'mk_price_list_type',
  'product_type':    'mk_product_type',
  'type_definition': 'mk_type_definition',
  'process_fee':     'mk_process_fee',
  'cif_rate':        'mk_cif_rate',
  'price_gram':      'mk_price_gram',
  'store_markup':    'mk_store_markup',
  'salesperson':     'salesperson',
  'store':           'stores',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sheet: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sheet } = await params
    const table = SHEET_TABLE[sheet]
    if (!table) return NextResponse.json({ error: 'Invalid sheet' }, { status: 400 })

    const db = createServiceClient()
    const { data, error } = await db.from(table).select('*').order('sort_order', { ascending: true, nullsFirst: false })
    if (error) {
      // Nếu sort_order không tồn tại, thử order by id
      const { data: d2, error: e2 } = await db.from(table).select('*')
      if (e2) throw e2
      return NextResponse.json({ data: d2 || [] })
    }
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sheet: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sheet } = await params
    const table = SHEET_TABLE[sheet]
    if (!table) return NextResponse.json({ error: 'Invalid sheet' }, { status: 400 })

    const payload = await request.json()
    const db = createServiceClient()

    if (payload.id) {
      const { id, ...rest } = payload
      const { error } = await db.from(table).update(rest).eq('id', id)
      if (error) throw error
    } else {
      const { id, ...rest } = payload
      const { error } = await db.from(table).insert([rest])
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sheet: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (!['Admin', 'Manager'].includes(profile?.role || ''))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sheet } = await params
    const table = SHEET_TABLE[sheet]
    if (!table) return NextResponse.json({ error: 'Invalid sheet' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = createServiceClient()
    const { error } = await db.from(table).delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
