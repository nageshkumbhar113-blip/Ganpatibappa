import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const planSchema = z.object({
  name: z.string().min(1),
  display_name: z.string().min(1).max(60).optional(),
  price: z.number().min(0),
  billing_cycle: z.enum(['monthly', 'yearly', 'one_time']),
  duration_days: z.number().int().positive().optional(),
  // subscription_plans.features is a JSONB *object* of booleans
  // ({two_fa: true, ...} — see types/database.ts's PlanFeatures), not an
  // array of strings. A default of [] here would have stored the wrong
  // shape for any plan created through this route, silently breaking
  // every checkFeature() call for it (the RPC reads features->>key,
  // which returns nothing off an array).
  features: z.record(z.boolean()).default({}),
  max_products: z.number().int().optional(),
  max_staff: z.number().int().optional(),
  is_active: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  // include_inactive: the plan-management page needs to see (and be able
  // to reactivate) inactive plans too; every other caller of this route
  // just wants active plans for a picker, so that stays the default.
  const includeInactive = req.nextUrl.searchParams.get('include_inactive') === 'true'

  let query = supabase.from('subscription_plans').select('*').order('price', { ascending: true })
  if (!includeInactive) query = query.eq('is_active', true)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans: data ?? [] })
}

export async function POST(request: Request) {
  await requireSuperAdmin()
  const body = await request.json()
  const parsed = planSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data }, { status: 201 })
}
