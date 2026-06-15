import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const { searchParams } = req.nextUrl
    const categoryId = searchParams.get('category_id')
    const q = searchParams.get('q')
    const featured = searchParams.get('featured')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '12'), 50)
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    let query = supabase
      .from('products')
      .select(
        `id, name, slug, price, offer_price, images, height_cm, material,
         weight_kg, stock, is_featured, description,
         categories(id, name, slug)`,
        { count: 'exact' }
      )
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (categoryId) query = query.eq('category_id', categoryId)
    if (q) query = query.ilike('name', `%${q}%`)
    if (featured === 'true') query = query.eq('is_featured', true)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({
      products: data,
      total: count,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (error) {
    console.error('[GET /api/shop/products]', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
