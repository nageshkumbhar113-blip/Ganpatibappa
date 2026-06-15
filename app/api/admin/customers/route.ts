import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const user = await requireAdmin()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const from = (page - 1) * limit

  const supabase = createClient()

  let query = supabase
    .from('users')
    .select('id, name, phone, email, created_at, is_active', { count: 'exact' })
    .eq('shop_id', user.shop_id!)
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ customers: data ?? [], total: count ?? 0, page, limit })
}
