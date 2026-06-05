import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// PATCH /api/bom/[bomId]/submit — Order gửi BOM để Manager duyệt
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

    // Sales/Supervisor không được submit
    if (role === 'Sales' || role === 'Sales Supervisor') {
      return NextResponse.json({ error: 'Không có quyền gửi duyệt' }, { status: 403 })
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

    if (bom.approval_status !== 'draft' && bom.approval_status !== 'rejected') {
      return NextResponse.json({ error: `Không thể gửi duyệt BOM đang ở trạng thái "${bom.approval_status}"` }, { status: 400 })
    }

    const { error } = await db.from('bom').update({
      approval_status: 'pending',
      approved_by:     null,
      approved_at:     null,
      approval_note:   null,
      updated_at:      new Date().toISOString(),
      updated_by:      username,
    }).eq('bom_id', bomId)

    if (error) throw error

    logAction({
      actor:    username,
      role,
      action:   'SUBMIT',
      entity:   'bom',
      entityId: bomId,
      summary:  `Gửi duyệt BOM ${bomId}`,
      diff:     { before: { approval_status: bom.approval_status }, after: { approval_status: 'pending' } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
