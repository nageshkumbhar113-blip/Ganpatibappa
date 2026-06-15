import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  shop_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum(['trial', 'active', 'expired', 'cancelled']),
  expires_at: z.string().datetime().optional(),
})

export async function GET(request: Request) {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const from = (page - 1) * limit

  let query = supabase
    .from('shop_subscriptions')
    .select(`
      *,
      shops(id, name, slug, owner_id, status),
      subscription_plans(id, name, price, billing_cycle)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Batch-fetch owner emails from public.users
  const ownerIds = [...new Set((data ?? []).map((s: any) => s.shops?.owner_id).filter(Boolean))]
  const ownerMap: Record<string, string> = {}
  if (ownerIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, email').in('id', ownerIds)
    users?.forEach((u: any) => { ownerMap[u.id] = u.email })
  }

  const enriched = (data ?? []).map((s: any) => ({
    ...s,
    shops: s.shops ? { ...s.shops, owner_email: ownerMap[s.shops.owner_id] ?? null } : s.shops,
  }))

  return NextResponse.json({ subscriptions: enriched, total: count ?? 0, page, limit })
}

export async function PATCH(request: Request) {
  await requireSuperAdmin()
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = createAdminClient()
  const { shop_id, plan_id, status, expires_at } = parsed.data

  const { data, error } = await supabase
    .from('shop_subscriptions')
    .upsert({ shop_id, plan_id, status, expires_at }, { onConflict: 'shop_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: data })
}
