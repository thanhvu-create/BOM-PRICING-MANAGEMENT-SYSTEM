import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET — danh sách users (Admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createServiceClient()
    const { data, error } = await db.from('users').select('id, username, role, store, created_at').order('created_at')
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — tạo user mới (Admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { username, password, role, store } = await request.json()
    if (!username || !password) return NextResponse.json({ error: 'username và password bắt buộc' }, { status: 400 })

    const db = createServiceClient()

    // Tạo auth user với email = username@bom.internal
    const email = `${username.toLowerCase().trim()}@bom.internal`
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authErr) throw authErr

    // Insert vào public.users
    const { error: profileErr } = await db.from('users').insert([{
      id:       authData.user.id,
      username: username.trim(),
      role:     role || 'Sales',
      store:    store || '',
    }])
    if (profileErr) {
      // Rollback auth user nếu insert thất bại
      await db.auth.admin.deleteUser(authData.user.id)
      throw profileErr
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT — cập nhật user (Admin only)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, role, store, newPassword } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = createServiceClient()
    const { error: updateErr } = await db.from('users').update({ role, store }).eq('id', id)
    if (updateErr) throw updateErr

    if (newPassword && newPassword.trim()) {
      const { error: pwErr } = await db.auth.admin.updateUserById(id, { password: newPassword.trim() })
      if (pwErr) throw pwErr
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — xóa user (Admin only)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await createServiceClient().from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = createServiceClient()
    await db.from('users').delete().eq('id', id)
    await db.auth.admin.deleteUser(id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
