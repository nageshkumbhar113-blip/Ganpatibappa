import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET(request: Request) {
  try {
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

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ inquiries: data ?? [], total: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const { id, status } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()
    const { error } = await supabase
      .from('inquiries')
      .update({ status })
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
