import { createServiceClient } from '@/lib/supabase/server'

export type AuditAction  = 'CREATE' | 'UPDATE' | 'DELETE' | 'DISCOUNT'
export type AuditEntity  = 'bom' | 'gold' | 'user' | 'stone' | 'mk' | 'config'

export interface AuditPayload {
  actor:    string
  role?:    string
  action:   AuditAction
  entity:   AuditEntity
  entityId?: string
  summary:  string
  diff?:    { before?: Record<string, unknown>; after?: Record<string, unknown> }
}

/**
 * Fire-and-forget audit log writer.
 * Never throws — logs to console on error so the main request is unaffected.
 */
export async function logAction(payload: AuditPayload): Promise<void> {
  try {
    const db = createServiceClient()
    await db.from('audit_log').insert({
      actor:     payload.actor,
      role:      payload.role ?? null,
      action:    payload.action,
      entity:    payload.entity,
      entity_id: payload.entityId ?? null,
      summary:   payload.summary,
      diff:      payload.diff ?? null,
    })
  } catch (e) {
    console.error('[audit] logAction error:', e)
  }
}
