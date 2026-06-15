import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { getCloudinaryUsage } from '@/lib/cloudinary/upload'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user.shop_id) return NextResponse.json({ error: 'No shop' }, { status: 403 })

    // Get usage from Cloudinary API
    const liveUsage = await getCloudinaryUsage(user.shop_id)

    // Get usage history from DB
    const supabase = createAdminClient()
    const { data: history } = await supabase
      .from('cloudinary_usage')
      .select('storage_bytes, bandwidth_bytes, month_year')
      .eq('shop_id', user.shop_id)
      .order('month_year', { ascending: false })
      .limit(6)

    return NextResponse.json({ live: liveUsage, history: history ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
