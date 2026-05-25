import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// GET — danh sách users (Admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (profile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = createServiceClient()
    const { data, error } = await db.from('users').select('id, username, role, store, created_at').order('created_at')
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    console.error('[users route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// POST — tạo user mới (Admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const actorProfile = await getUserProfile(user.id, user.email)
    if (actorProfile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, password, role, store } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'email và password bắt buộc' }, { status: 400 })

    const username = email.trim().toLowerCase().split('@')[0]

    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    })
    if (authErr) throw authErr

    // Insert vào public.users
    const { error: profileErr } = await db.from('users').insert([{
      id:       authData.user.id,
      username,
      role:     role || 'Sales',
      store:    store || '',
    }])
    if (profileErr) {
      // Rollback auth user nếu insert thất bại
      await db.auth.admin.deleteUser(authData.user.id)
      throw profileErr
    }

    logAction({
      actor:    actorProfile?.username || user.email || '',
      role:     'Admin',
      action:   'CREATE',
      entity:   'user',
      entityId: username.trim(),
      summary:  `Tạo user "${username.trim()}" — Role: ${role || 'Sales'}, Store: ${store || 'All'}`,
      diff:     { after: { username: username.trim(), role: role || 'Sales', store: store || '' } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[users route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// PUT — cập nhật user (Admin only)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const actorProfile = await getUserProfile(user.id, user.email)
    if (actorProfile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, role, store, newPassword } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Fetch old values for diff
    const { data: oldUser } = await db.from('users').select('username, role, store').eq('id', id).single()

    const { error: updateErr } = await db.from('users').update({ role, store }).eq('id', id)
    if (updateErr) throw updateErr

    if (newPassword && newPassword.trim()) {
      const { error: pwErr } = await db.auth.admin.updateUserById(id, { password: newPassword.trim() })
      if (pwErr) throw pwErr
    }

    logAction({
      actor:    actorProfile?.username || user.email || '',
      role:     'Admin',
      action:   'UPDATE',
      entity:   'user',
      entityId: oldUser?.username || id,
      summary:  `Cập nhật user "${oldUser?.username || id}" — Role: ${oldUser?.role} → ${role}`,
      diff: {
        before: { role: oldUser?.role, store: oldUser?.store },
        after:  { role, store, passwordChanged: !!(newPassword && newPassword.trim()) },
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[users route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}

// DELETE — xóa user (Admin only)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const actorProfile = await getUserProfile(user.id, user.email)
    if (actorProfile?.role !== 'Admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: target } = await db.from('users').select('username, role, store').eq('id', id).single()
    if (target?.username === 'admin123')
      return NextResponse.json({ error: 'Cannot delete the super admin account.' }, { status: 403 })

    await db.from('users').delete().eq('id', id)
    await db.auth.admin.deleteUser(id)

    logAction({
      actor:    actorProfile?.username || user.email || '',
      role:     'Admin',
      action:   'DELETE',
      entity:   'user',
      entityId: target?.username || id,
      summary:  `Xóa user "${target?.username || id}" — Role: ${target?.role}`,
      diff:     { before: { username: target?.username, role: target?.role, store: target?.store } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[users route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
