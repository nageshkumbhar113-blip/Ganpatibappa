import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  image_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, image_url, sort_order, is_active, created_at')
      .eq('shop_id', user.shop_id!)
      .order('sort_order', { ascending: true })

    return NextResponse.json({ categories: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await req.json()
    const parsed = CategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createClient()

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('shop_id', user.shop_id!)
      .eq('slug', parsed.data.slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ ...parsed.data, shop_id: user.shop_id! })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create category' }, { status: 500 })
  }
}
