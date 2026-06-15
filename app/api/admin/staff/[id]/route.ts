import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireShopOwner } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const UpdateStaffSchema = z.object({
  role: z.enum(['manager', 'employee']).optional(),
  is_active: z.boolean().optional(),
  permissions: z
    .object({
      products: z.boolean(),
      orders: z.boolean(),
      customers: z.boolean(),
      gallery: z.boolean(),
      reports: z.boolean(),
      settings: z.boolean(),
      staff: z.boolean(),
    })
    .optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireShopOwner()

    const body = await req.json()
    const parsed = UpdateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('staff')
      .update(parsed.data)
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    return NextResponse.json({ staff: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireShopOwner()
    const supabase = createAdminClient()

    // Get staff user_id before deleting
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('user_id')
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)
      .single()

    if (!staffRecord) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    // Soft delete (deactivate)
    await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', params.id)

    await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', staffRecord.user_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
