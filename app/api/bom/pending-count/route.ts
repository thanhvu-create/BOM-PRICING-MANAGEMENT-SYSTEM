import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'

// GET /api/bom/pending-count — số BOM đang chờ duyệt (chỉ Admin/Manager thấy)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ count: 0 })

    const profile = await getUserProfile(user.id, user.email)
    if (!profile || (profile.role !== 'Admin' && profile.role !== 'Manager')) {
      return NextResponse.json({ count: 0 })
    }

    const db = createServiceClient()
    const { count, error } = await db
      .from('bom')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .is('deleted_at', null)

    if (error) throw error
    return NextResponse.json({ count: count ?? 0 }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
