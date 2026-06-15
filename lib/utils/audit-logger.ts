// ============================================================
// lib/utils/audit-logger.ts
// Server-side helper to log actions to audit_logs + activity_logs
// Import createAdminClient (bypasses RLS so logs always write)
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesInsert } from '@/types/database'

type AuditPayload = Omit<TablesInsert<'audit_logs'>, 'id' | 'created_at'>
type ActivityPayload = Omit<TablesInsert<'activity_logs'>, 'id' | 'created_at'>

export async function writeAuditLog(payload: AuditPayload): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert(payload)
  } catch (err) {
    // Audit log failures must never crash the main request
    console.error('[audit_log] failed:', err)
  }
}

export async function writeActivityLog(payload: ActivityPayload): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('activity_logs').insert(payload)
  } catch (err) {
    console.error('[activity_log] failed:', err)
  }
}

/**
 * Logs an audit event with old/new values and writes an activity log.
 * Convenience wrapper used in API route handlers.
 */
export async function logAction({
  shopId,
  userId,
  action,
  tableName,
  recordId,
  oldValue,
  newValue,
  description,
  category = 'general',
  ipAddress,
  userAgent,
}: {
  shopId?: string
  userId?: string
  action: string
  tableName?: string
  recordId?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  description?: string
  category?: ActivityPayload['category']
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await Promise.all([
    writeAuditLog({
      shop_id: shopId,
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    }),
    description && shopId
      ? writeActivityLog({
          shop_id: shopId,
          user_id: userId,
          description,
          category,
          ip_address: ipAddress,
        })
      : Promise.resolve(),
  ])
}

/** Alias for logAction — used by API route handlers. */
export const logAuditEvent = logAction
