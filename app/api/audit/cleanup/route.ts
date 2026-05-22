import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

// GET /api/audit/cleanup — Vercel Cron target (daily @ 2am UTC)
// Also accepts DELETE for manual trigger by Admin
export async function GET(req: NextRequest) {
  // Basic cron security: Vercel injects Authorization header for crons
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      req.headers.get('x-vercel-cron') !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runCleanup()
}

export async function DELETE(req: NextRequest) {
  // Allow Admin to manually trigger cleanup
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getUserProfile(user.id, user.email)
  if (profile?.role !== 'Admin')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  return runCleanup()
}

async function runCleanup() {
  try {
    const db = createServiceClient()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const { count, error } = await db
      .from('audit_log')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString())

    if (error) throw error
    return NextResponse.json({ success: true, deleted: count ?? 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
