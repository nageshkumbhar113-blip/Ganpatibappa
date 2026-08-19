import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { logAuditEvent } from '@/lib/utils/audit-logger'
import { z } from 'zod'

const TransferSchema = z.object({
  newOwnerEmail: z.string().email(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireSuperAdmin()

    const body = await req.json()
    const parsed = TransferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const { newOwnerEmail } = parsed.data
    const supabase = createAdminClient()

    // Find the new owner in users table
    const { data: newOwner } = await supabase
      .from('users')
      .select('id, role, shop_id')
      .eq('email', newOwnerEmail)
      .single()

    if (!newOwner) {
      return NextResponse.json(
        { error: 'User with this email not found in the system.' },
        { status: 404 }
      )
    }

    if (newOwner.role !== 'admin' && newOwner.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Transfer target must be an admin or super_admin user.' },
        { status: 400 }
      )
    }

    // Get current owner
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id, name')
      .eq('id', params.id)
      .single()

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Transfer: update shop owner_id and the new owner's shop_id.
    // Sequential, not Promise.all — this is exactly the kind of write a
    // silently-dropped concurrent request must never touch: a shop pointing
    // at a new owner whose own account was never actually linked back to
    // it (or the reverse) leaves the transfer half-done with no error.
    const { error: shopErr } = await supabase
      .from('shops')
      .update({ owner_id: newOwner.id })
      .eq('id', params.id)
    if (shopErr) throw shopErr

    const { error: userErr } = await supabase
      .from('users')
      .update({ shop_id: params.id })
      .eq('id', newOwner.id)
    if (userErr) throw userErr

    // Clear the PREVIOUS owner's shop_id -- without this, confirmed live:
    // the old owner keeps full /admin access to a shop they were just
    // transferred away from (middleware only checks user.shop_id, which
    // was never unset), and the shop detail page's owner lookup
    // (users.shop_id = this shop AND role = 'admin') kept finding and
    // displaying the old owner as current even though shops.owner_id had
    // already changed. Skipped if the old owner *is* the new owner (no-op
    // transfer) or never existed.
    if (shop.owner_id && shop.owner_id !== newOwner.id) {
      const { error: oldOwnerErr } = await supabase
        .from('users')
        .update({ shop_id: null })
        .eq('id', shop.owner_id)
      if (oldOwnerErr) throw oldOwnerErr
    }

    // Audit log
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: params.id,
      userId: user.id,
      action: 'transfer',
      tableName: 'shops',
      recordId: params.id,
      oldValue: { owner_id: shop.owner_id },
      newValue: { owner_id: newOwner.id, new_owner_email: newOwnerEmail },
      ipAddress: ip,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[POST /api/super-admin/shops/[id]/transfer]', error)
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 })
  }
}
