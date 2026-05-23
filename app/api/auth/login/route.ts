/**
 * POST /api/auth/login
 * Nhận { username, password }
 * → Tra cứu email thực từ auth.users theo id trong public.users
 * → Trả về { email } để client signInWithPassword
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const INVALID_CREDS = { error: 'Tên đăng nhập hoặc mật khẩu không đúng' }

export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json(INVALID_CREDS, { status: 401 })
    }

    // Validate format — block obviously invalid inputs before hitting DB
    if (!/^[a-zA-Z0-9._@\-]{2,50}$/.test(username.trim())) {
      return NextResponse.json(INVALID_CREDS, { status: 401 })
    }

    const db = createServiceClient()

    const { data: profile, error: profileError } = await db
      .from('users')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (profileError || !profile) {
      console.error('[login] profile lookup:', profileError?.message)
      return NextResponse.json(INVALID_CREDS, { status: 401 })
    }

    const { data: authUser, error: authError } = await db.auth.admin.getUserById(profile.id)

    if (authError || !authUser?.user?.email) {
      console.error('[login] auth lookup:', authError?.message)
      return NextResponse.json(INVALID_CREDS, { status: 401 })
    }

    return NextResponse.json({ email: authUser.user.email })
  } catch (err) {
    console.error('[login] unexpected error:', err)
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 })
  }
}
