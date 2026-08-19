import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { z } from 'zod'
import { handleApiError } from '@/lib/utils/api-error'

const BannerSchema = z.object({
  image_url: z.string().url(),
  link_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})

const MAX_BANNERS = 6

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { data } = await supabase
      .from('shop_banners')
      .select('id, image_url, link_url, sort_order, is_active, created_at')
      .eq('shop_id', user.shop_id!)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ banners: data ?? [] })
  } catch (error) {
    return handleApiError(error, 'admin/banners')
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await req.json()
    const parsed = BannerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const supabase = createClient()

    const { count } = await supabase
      .from('shop_banners')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', user.shop_id!)

    if ((count ?? 0) >= MAX_BANNERS) {
      return NextResponse.json(
        { error: `जास्तीत जास्त ${MAX_BANNERS} banners ठेवता येतात. आधी एखादं काढा.` },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('shop_banners')
      .insert({ ...parsed.data, shop_id: user.shop_id!, sort_order: count ?? 0 })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ banner: data }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'admin/banners')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()
    await supabase
      .from('shop_banners')
      .delete()
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'admin/banners')
  }
}
