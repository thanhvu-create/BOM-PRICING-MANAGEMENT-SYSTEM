import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// PATCH /api/bom/[bomId]/approve — Manager/Admin duyệt BOM
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ bomId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getUserProfile(user.id, user.email)
    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { role } = profile
    const username = profile.email || ''

    if (role !== 'Admin' && role !== 'Manager') {
      return NextResponse.json({ error: 'Chỉ Admin/Manager có thể duyệt BOM' }, { status: 403 })
    }

    const { bomId } = await params
    const db = createServiceClient()

    const { data: bom, error: fetchErr } = await db
      .from('bom')
      .select('bom_id, approval_status')
      .eq('bom_id', bomId)
      .is('deleted_at', null)
      .single()

    if (fetchErr || !bom) return NextResponse.json({ error: 'BOM không tìm thấy' }, { status: 404 })

    if (bom.approval_status !== 'pending') {
      return NextResponse.json({ error: `BOM đang ở trạng thái "${bom.approval_status}", không phải "pending"` }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error } = await db.from('bom').update({
      approval_status: 'approved',
      approved_by:     username,
      approved_at:     now,
      approval_note:   null,
      updated_at:      now,
      updated_by:      username,
    }).eq('bom_id', bomId)

    if (error) throw error

    logAction({
      actor:    username,
      role,
      action:   'APPROVE',
      entity:   'bom',
      entityId: bomId,
      summary:  `Duyệt BOM ${bomId}`,
      diff:     { before: { approval_status: 'pending' }, after: { approval_status: 'approved', approved_by: username } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
