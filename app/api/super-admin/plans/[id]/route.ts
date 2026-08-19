// ============================================================
// app/api/super-admin/plans/[id]/route.ts
// Edit an existing subscription plan (price, limits, features).
// There was previously no way to change a plan's price at all once
// created -- /api/super-admin/plans only had GET (list) and POST
// (create a brand new plan); nothing let a super admin update the
// existing Trial/Basic/Premium rows.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { handleApiError } from '@/lib/utils/api-error'
import { z } from 'zod'

const UpdatePlanSchema = z.object({
  display_name: z.string().min(1).max(60).optional(),
  price: z.number().min(0).optional(),
  billing_cycle: z.enum(['monthly', 'yearly', 'one_time']).optional(),
  duration_days: z.number().int().positive().optional(),
  max_products: z.number().int().optional(), // -1 = unlimited
  max_staff: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  features: z.record(z.boolean()).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const parsed = UpdatePlanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(parsed.data as any)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    return NextResponse.json({ plan: data })
  } catch (error) {
    return handleApiError(error, 'super-admin/plans/[id]')
  }
}
