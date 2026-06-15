import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  billing_cycle: z.enum(['monthly', 'yearly', 'one_time']),
  features: z.array(z.string()).default([]),
  max_products: z.number().optional(),
  max_staff: z.number().optional(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

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
