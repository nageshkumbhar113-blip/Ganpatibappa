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
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireSuperAdmin()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('shops')
      .select(
        `*, shop_subscriptions(*, subscription_plans(*)),
         shop_settings(*), cloudinary_settings(*), pwa_settings(*),
         users!shops(id, name, email, phone)`
      )
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    return NextResponse.json({ shop: data })
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
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get old value for audit log
    const { data: oldShop } = await supabase
      .from('shops')
      .select('*')
      .eq('id', params.id)
      .single()

    const { data, error } = await supabase
      .from('shops')
      .update(parsed.data)
      .eq('id', params.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // If suspending, also update subscription status
    if (parsed.data.status === 'suspended') {
      await supabase
        .from('shop_subscriptions')
        .update({ status: 'suspended' })
        .eq('shop_id', params.id)
        .in('status', ['trial', 'active'])
    } else if (parsed.data.status === 'active') {
      // Reactivate — only if subscription hasn't expired
      await supabase
        .from('shop_subscriptions')
        .update({ status: 'active' })
        .eq('shop_id', params.id)
        .eq('status', 'suspended')
        .gt('expires_at', new Date().toISOString())
    }

    // Audit log
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

    // Soft delete — set status to 'deleted'
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
