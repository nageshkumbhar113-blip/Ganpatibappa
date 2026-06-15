import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { canAddProduct } from '@/lib/middleware/plan-guard'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const limitCheck = await canAddProduct(user.shop_id!)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Product limit reached (${limitCheck.current}/${limitCheck.limit}).`, code: 'PLAN_LIMIT_EXCEEDED' },
        { status: 403 }
      )
    }

    const supabase = createClient()

    const { data: source, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)
      .single()

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Generate unique slug for the copy
    const baseSlug = `${source.slug}-copy`
    let slug = baseSlug
    let attempt = 0

    while (true) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('shop_id', user.shop_id!)
        .eq('slug', slug)
        .single()

      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const { id: _id, created_at: _ca, ...rest } = source

    const { data: copy, error: insertError } = await supabase
      .from('products')
      .insert({
        ...rest,
        name: `${source.name} (Copy)`,
        slug,
        is_active: false,
        is_featured: false,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ product: copy }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/products/[id]/duplicate]', error)
    return NextResponse.json({ error: 'Duplicate failed' }, { status: 500 })
  }
}
