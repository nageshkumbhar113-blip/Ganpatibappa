import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const GallerySchema = z.object({
  image_url: z.string().url(),
  caption: z.string().max(300).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { data } = await supabase
      .from('gallery')
      .select('id, image_url, caption, sort_order, created_at')
      .eq('shop_id', user.shop_id!)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ gallery: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await req.json()
    const parsed = GallerySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('gallery')
      .insert({ ...parsed.data, shop_id: user.shop_id! })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add gallery image' }, { status: 500 })
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
      .from('gallery')
      .delete()
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
