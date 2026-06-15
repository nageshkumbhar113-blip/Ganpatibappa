import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const MarketingSchema = z.object({
  google_analytics_id: z.string().max(50).optional().nullable(),
  google_search_console_code: z.string().max(200).optional().nullable(),
  facebook_pixel_id: z.string().max(50).optional().nullable(),
  og_default_image: z.string().url().optional().nullable(),
  robots_txt_custom: z.string().max(2000).optional().nullable(),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { data } = await supabase
      .from('marketing_settings')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .single()

    return NextResponse.json({ settings: data ?? {} })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await req.json()
    const parsed = MarketingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('marketing_settings')
      .upsert({ ...parsed.data, shop_id: user.shop_id! }, { onConflict: 'shop_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ settings: data })
  } catch (error: any) {
    console.error('[PUT /api/admin/marketing]', error)
    return NextResponse.json({ error: 'Failed to save marketing settings' }, { status: 500 })
  }
}
