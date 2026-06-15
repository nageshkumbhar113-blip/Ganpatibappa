import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const user = await requireAdmin()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = createClient()
  let query = supabase
    .from('inquiries')
    .select(
      'id, name, phone, email, message, status, created_at, products(name)',
      { count: 'exact' }
    )
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count } = await query
  return NextResponse.json({ inquiries: data ?? [], total: count ?? 0 })
}
