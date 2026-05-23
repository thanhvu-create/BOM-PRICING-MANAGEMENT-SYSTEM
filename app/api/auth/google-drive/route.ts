/**
 * POST /api/auth/google-drive
 * Nhận auth code từ GIS initCodeClient popup
 * → exchange lấy access_token + refresh_token
 * → encrypt + lưu refresh_token vào users.google_refresh_token
 * → trả access_token về client
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encrypt.server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await request.json()
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    // Exchange auth code → tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  'postmessage',
        grant_type:    'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[google-drive] google error:', JSON.stringify(tokenData))
      // Pass Google's actual error back so client can show meaningful message
      return NextResponse.json({
        error: tokenData.error || 'token_exchange_failed',
        detail: tokenData.error_description || '',
      }, { status: 502 })
    }

    const { access_token, refresh_token, expires_in } = tokenData

    // Lưu refresh_token encrypted (chỉ khi Google trả về — lần đầu connect hoặc prompt=consent)
    if (refresh_token) {
      const db = createServiceClient()
      const profile = await getUserProfile(user.id, user.email)
      const userId = profile ? user.id : null

      if (userId) {
        const encrypted = encrypt(refresh_token)
        await db.from('users').update({ google_refresh_token: encrypted }).eq('id', userId)
      }
    }

    return NextResponse.json({ access_token, expires_in: expires_in ?? 3600 })
  } catch (err: any) {
    console.error('[google-drive] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
