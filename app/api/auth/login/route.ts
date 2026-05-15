/**
 * POST /api/auth/login
 * Nhận { username, password }
 * → Tra cứu email thực từ auth.users theo id trong public.users
 * → Trả về { email } để client signInWithPassword
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const db = createServiceClient()

    // Bước 1: tìm user id từ public.users theo username
    const { data: profile, error: profileError } = await db
      .from('users')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (profileError || !profile) {
      console.error('[login] profile lookup error:', profileError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Bước 2: lấy email từ auth.users theo id
    const { data: authUser, error: authError } = await db.auth.admin.getUserById(profile.id)

    if (authError || !authUser?.user?.email) {
      console.error('[login] auth user lookup error:', authError)
      return NextResponse.json({ error: 'Auth user not found' }, { status: 404 })
    }

    return NextResponse.json({ email: authUser.user.email })
  } catch (err) {
    console.error('[login] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
