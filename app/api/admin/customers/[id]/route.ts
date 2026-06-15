import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, email, created_at, is_active')
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .eq('role', 'customer')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  return NextResponse.json({ customer: data })
}
