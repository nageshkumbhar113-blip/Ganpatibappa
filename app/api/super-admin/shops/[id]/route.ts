import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { logAuditEvent } from '@/lib/utils/audit-logger'
import { z } from 'zod'

const UpdateShopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  whatsapp: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  status: z.enum(['active', 'suspended', 'pending', 'deleted']).optional(),
  domain: z.string().max(253).optional().nullable(),
  // owner fields (stored in users table, handled separately)
  owner_name: z.string().max(100).optional(),
  owner_phone: z.string().max(20).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()
    const supabase = createAdminClient()

    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get admin owner separately
    const { data: owner } = await supabase
      .from('users')
      .select('id, name, email, phone, role')
      .eq('shop_id', params.id)
      .eq('role', 'admin')
      .single()

    return NextResponse.json({
      shop: {
        ...shop,
        owner_email: owner?.email ?? '',
        owner_name: owner?.name ?? '',
        owner_phone: owner?.phone ?? '',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireSuperAdmin()

    const body = await req.json()
    const parsed = UpdateShopSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: oldShop } = await supabase
      .from('shops')
      .select('*')
      .eq('id', params.id)
      .single()

    // Separate owner fields from shop fields
    const { owner_name, owner_phone, ...shopFields } = parsed.data

    const { data, error } = await supabase
      .from('shops')
      .update(shopFields)
      .eq('id', params.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Update failed', details: error?.message }, { status: 500 })
    }

    // Update owner name/phone in users table if provided
    if (owner_name !== undefined || owner_phone !== undefined) {
      const ownerUpdate: Record<string, string> = {}
      if (owner_name !== undefined) ownerUpdate.name = owner_name
      if (owner_phone !== undefined) ownerUpdate.phone = owner_phone
      await supabase
        .from('users')
        .update(ownerUpdate)
        .eq('shop_id', params.id)
        .eq('role', 'admin')
    }

    // Sync subscription status when shop status changes
    if (parsed.data.status === 'suspended') {
      await supabase
        .from('shop_subscriptions')
        .update({ status: 'suspended' })
        .eq('shop_id', params.id)
        .in('status', ['trial', 'active'])
    } else if (parsed.data.status === 'active') {
      await supabase
        .from('shop_subscriptions')
        .update({ status: 'active' })
        .eq('shop_id', params.id)
        .eq('status', 'suspended')
        .gt('expires_at', new Date().toISOString())
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: params.id,
      userId: user.id,
      action: 'update',
      tableName: 'shops',
      recordId: params.id,
      oldValue: oldShop,
      newValue: data,
      ipAddress: ip,
    })

    return NextResponse.json({ shop: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireSuperAdmin()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('shops')
      .update({ status: 'deleted' })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: params.id,
      userId: user.id,
      action: 'delete',
      tableName: 'shops',
      recordId: params.id,
      ipAddress: ip,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
