import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const supabase = createAdminClient()

    const { searchParams } = req.nextUrl
    const q = searchParams.get('q')
    const action = searchParams.get('action')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 50
    const offset = (page - 1) * limit

    let query = supabase
      .from('audit_logs')
      .select(
        'id, shop_id, user_id, action, table_name, record_id, ip_address, created_at, shops(name, slug)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) query = query.eq('action', action)
    if (q) query = query.or(`action.ilike.%${q}%,table_name.ilike.%${q}%,ip_address.ilike.%${q}%`)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Reshape to match what the logs page expects
    const logs = (data ?? []).map((log: any) => ({
      ...log,
      entity_type: log.table_name,
      entity_id: log.record_id,
    }))

    return NextResponse.json({ logs, total: count ?? 0, page })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
