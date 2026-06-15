import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 50
    const offset = (page - 1) * limit

    const { data, count, error } = await supabase
      .from('login_history')
      .select('id, ip_address, user_agent, status, location, created_at, users(name, email)', {
        count: 'exact',
      })
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ history: data, total: count, page })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
