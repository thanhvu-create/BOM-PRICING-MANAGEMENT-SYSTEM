/**
 * POST /api/bom/calculate
 * Thay thế calculateBOMCost() trong Server_API_BOM.gs
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateBOMCost } from '@/lib/pricing/calculate'
import type { BOMPayload } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload: BOMPayload = await request.json()
  const result = await calculateBOMCost(payload)
  return NextResponse.json(result)
}
