import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    const action = searchParams.get('action')
    const table = searchParams.get('table')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 50
    const offset = (page - 1) * limit

    let query = supabase
      .from('audit_logs')
      .select(
        `id, action, table_name, record_id, old_value, new_value, ip_address, created_at,
         users(name, email)`,
        { count: 'exact' }
      )
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) query = query.eq('action', action)
    if (table) query = query.eq('table_name', table)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ logs: data, total: count, page })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
