import { NextResponse } from 'next/server'
import { createClient, createServiceClient, getUserProfile } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

// PATCH /api/bom/[bomId]/reject — Manager/Admin từ chối BOM
export async function PATCH(
  request: Request,
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
      return NextResponse.json({ error: 'Chỉ Admin/Manager có thể từ chối BOM' }, { status: 403 })
    }

    const { bomId } = await params
    const body = await request.json().catch(() => ({}))
    const note = String(body.note || '').trim()

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
      approval_status: 'rejected',
      approved_by:     username,
      approved_at:     now,
      approval_note:   note || null,
      updated_at:      now,
      updated_by:      username,
    }).eq('bom_id', bomId)

    if (error) throw error

    logAction({
      actor:    username,
      role,
      action:   'REJECT',
      entity:   'bom',
      entityId: bomId,
      summary:  `Từ chối BOM ${bomId}${note ? ': ' + note : ''}`,
      diff:     { before: { approval_status: 'pending' }, after: { approval_status: 'rejected', approval_note: note } },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
