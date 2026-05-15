import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SHEET_TABLE: Record<string, string> = {
  'DM_Category': 'dm_category',
  'DM_Types':    'dm_types',
  'DM_Shape':    'dm_shape',
  'DM_Color':    'dm_color',
  'DM_Quality':  'dm_quality',
  'Definition':  'definition',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sheet: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sheet } = await params
    const table = SHEET_TABLE[sheet]
    if (!table) return NextResponse.json({ error: 'Invalid sheet' }, { status: 400 })

    const db = createServiceClient()
    const isDefinition = sheet === 'Definition'
    const select = isDefinition ? 'en_name, vn_name, code' : 'name, code'
    const orderBy = isDefinition ? 'en_name' : 'name'
    const { data, error } = await db.from(table).select(select).order(orderBy)
    if (error) throw error
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

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sheet } = await params
    const table = SHEET_TABLE[sheet]
    if (!table) return NextResponse.json({ error: 'Invalid sheet' }, { status: 400 })

    const payload = await request.json()
    const db = createServiceClient()
    const isDefinition = sheet === 'Definition'

    if (isDefinition) {
      const row = { en_name: payload.en_name, vn_name: payload.vn_name || '', code: payload.code || '' }
      const lookupKey = payload.old_en_name || payload.en_name
      const { data: existing } = await db.from(table).select('id').eq('en_name', lookupKey).single()
      if (existing) {
        await db.from(table).update(row).eq('en_name', lookupKey)
      } else {
        await db.from(table).insert([row])
      }
    } else {
      const row = { name: payload.name, code: payload.code }
      const lookupCode = payload.old_code || payload.code
      const { data: existing } = await db.from(table).select('id').eq('code', lookupCode).single()
      if (existing) {
        await db.from(table).update(row).eq('code', lookupCode)
      } else {
        await db.from(table).insert([row])
      }
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

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { sheet } = await params
    const table = SHEET_TABLE[sheet]
    if (!table) return NextResponse.json({ error: 'Invalid sheet' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const db = createServiceClient()
    const isDefinition = sheet === 'Definition'

    if (isDefinition) {
      const enName = searchParams.get('enName')
      if (!enName) return NextResponse.json({ error: 'enName required' }, { status: 400 })
      await db.from(table).delete().eq('en_name', enName)
    } else {
      const code = searchParams.get('code')
      if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
      await db.from(table).delete().eq('code', code)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
