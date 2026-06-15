import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await requireAdmin()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('shop_subscriptions')
    .select(`*, subscription_plans(name, price, billing_cycle, features)`)
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ subscription: null })
  return NextResponse.json({ subscription: data })
}
