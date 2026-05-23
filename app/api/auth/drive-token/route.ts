/**
 * GET /api/auth/drive-token
 * Dùng stored refresh_token để lấy access_token mới.
 * Client gọi khi access_token hết hạn — không cần popup.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encrypt.server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: row } = await db
      .from('users')
      .select('google_refresh_token')
      .eq('id', user.id)
      .single()

    if (!row?.google_refresh_token) {
      return NextResponse.json({ error: 'No refresh token stored' }, { status: 404 })
    }

    const refreshToken = decrypt(row.google_refresh_token)

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    'refresh_token',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[drive-token] refresh failed:', tokenData)
      // Refresh token bị revoke → xóa khỏi DB
      if (tokenData.error === 'invalid_grant') {
        await db.from('users').update({ google_refresh_token: null }).eq('id', user.id)
        return NextResponse.json({ error: 'Refresh token revoked — reconnect Drive' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 502 })
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in:   tokenData.expires_in ?? 3600,
    })
  } catch (err: any) {
    console.error('[drive-token] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
