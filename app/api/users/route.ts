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
    const { data, error } = await db.from('users').select('id, email, role, store, created_at').order('created_at')
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

    const normalizedEmail = email.trim().toLowerCase()

    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    })
    if (authErr) throw authErr

    const { error: profileErr } = await db.from('users').insert([{
      id:    authData.user.id,
      email: normalizedEmail,
      role:  role || 'Sales',
      store: store || '',
    }])
    if (profileErr) {
      // Rollback auth user nếu insert thất bại
      await db.auth.admin.deleteUser(authData.user.id)
      throw profileErr
    }

    logAction({
      actor:    actorProfile?.email || user.email || '',
      role:     'Admin',
      action:   'CREATE',
      entity:   'user',
      entityId: normalizedEmail,
      summary:  `Tạo user "${normalizedEmail}" — Role: ${role || 'Sales'}, Store: ${store || 'All'}`,
      diff:     { after: { email: normalizedEmail, role: role || 'Sales', store: store || '' } },
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

    const { id, email: reqEmail, role, store, newPassword } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Fetch old values for diff — use maybeSingle() so it doesn't throw when UUID is stale
    const { data: oldUser } = await db.from('users').select('email, role, store').eq('id', id).maybeSingle()
    const userEmail = reqEmail || oldUser?.email || ''

    // Update role/store by id (primary) or email fallback when UUID is stale post-migration
    if (oldUser) {
      const { error: updateErr } = await db.from('users').update({ role, store }).eq('id', id)
      if (updateErr) throw updateErr
    } else if (userEmail) {
      const { error: updateErr } = await db.from('users').update({ role, store }).eq('email', userEmail)
      if (updateErr) throw updateErr
    }

    if (newPassword && newPassword.trim()) {
      if (!userEmail) return NextResponse.json({ error: 'email required for password update' }, { status: 400 })
      // Look up auth user by email to get the correct auth UUID
      const { data: { users: authList }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 })
      if (listErr) throw listErr
      const authUser = (authList as any[]).find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase())

      if (authUser) {
        // Auth user exists — update password
        const { error: pwErr } = await db.auth.admin.updateUserById(authUser.id, { password: newPassword.trim() })
        if (pwErr) throw pwErr
        // Sync public.users.id if it differs from auth.users.id
        if (authUser.id !== id) {
          await db.from('users').update({ id: authUser.id }).eq('email', userEmail)
        }
      } else {
        // Auth user missing (migrated account) — create it now
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email: userEmail,
          password: newPassword.trim(),
          email_confirm: true,
        })
        if (createErr) throw createErr
        // Sync public.users.id to the new auth UUID
        await db.from('users').update({ id: created.user.id }).eq('email', userEmail)
      }
    }

    logAction({
      actor:    actorProfile?.email || user.email || '',
      role:     'Admin',
      action:   'UPDATE',
      entity:   'user',
      entityId: userEmail || id,
      summary:  `Cập nhật user "${userEmail || id}" — Role: ${oldUser?.role ?? '?'} → ${role}`,
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

    const { data: target } = await db.from('users').select('email, role, store').eq('id', id).single()
    if (target?.email === 'admin@ctyhp.vn')
      return NextResponse.json({ error: 'Cannot delete the super admin account.' }, { status: 403 })

    await db.from('users').delete().eq('id', id)
    await db.auth.admin.deleteUser(id)

    logAction({
      actor:    actorProfile?.email || user.email || '',
      role:     'Admin',
      action:   'DELETE',
      entity:   'user',
      entityId: target?.email || id,
      summary:  `Xóa user "${target?.email || id}" — Role: ${target?.role}`,
      diff:     { before: { email: target?.email, role: target?.role, store: target?.store } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[users route]', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
