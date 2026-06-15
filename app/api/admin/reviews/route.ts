import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await requireAdmin()
  const supabase = createClient()

  const { data } = await supabase
    .from('reviews')
    .select('id, reviewer_name, rating, comment, is_approved, created_at, products(name)')
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false })

  return NextResponse.json({ reviews: data ?? [] })
}
