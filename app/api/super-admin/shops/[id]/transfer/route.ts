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

    // Transfer: update shop owner_id and the user's shop_id
    await Promise.all([
      supabase
        .from('shops')
        .update({ owner_id: newOwner.id })
        .eq('id', params.id),

      supabase
        .from('users')
        .update({ shop_id: params.id })
        .eq('id', newOwner.id),
    ])

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
