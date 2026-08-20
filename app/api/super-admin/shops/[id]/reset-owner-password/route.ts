// ============================================================
// app/api/super-admin/shops/[id]/reset-owner-password/route.ts
// Lets a super admin set a new password for a shop's owner without
// knowing the old one -- there was previously no way to do this at
// all (confirmed live: owner locked out of Shree Arts with no recorded
// password, no UI anywhere to help them back in short of the platform
// operator manually hitting Supabase's Auth Admin API by hand).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { logAuditEvent } from '@/lib/utils/audit-logger'
import { handleApiError } from '@/lib/utils/api-error'
import { z } from 'zod'

const ResetPasswordSchema = z.object({
  new_password: z.string().min(8).max(72),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const superAdmin = await requireSuperAdmin()

    const body = await req.json()
    const parsed = ResetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Password किमान 8 अक्षरांचा हवा' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // owner_id is the source of truth for who owns this shop -- not a
    // reverse users.shop_id lookup, which the transfer bug fixed earlier
    // today showed can point at a stale previous owner.
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id, name')
      .eq('id', params.id)
      .single()

    if (!shop?.owner_id) {
      return NextResponse.json({ error: 'या shop ला owner नाहीये.' }, { status: 404 })
    }

    const { error } = await supabase.auth.admin.updateUserById(shop.owner_id, {
      password: parsed.data.new_password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: params.id,
      userId: superAdmin.id,
      action: 'reset_owner_password',
      tableName: 'shops',
      recordId: params.id,
      description: `Super admin reset the owner's password for "${shop.name}"`,
      ipAddress: ip,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'super-admin/shops/[id]/reset-owner-password')
  }
}
