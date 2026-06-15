import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ReviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const { searchParams } = req.nextUrl
    const productId = searchParams.get('product_id')

    const supabase = createClient()

    let query = supabase
      .from('reviews')
      .select('id, rating, comment, created_at, users(name, avatar_url)')
      .eq('shop_id', shopId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)

    const { data } = await query.limit(50)

    return NextResponse.json({ reviews: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await req.json()
    const parsed = ReviewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    // Check if user already reviewed this product
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('shop_id', shopId)
      .eq('customer_id', authUser!.id)
      .eq('product_id', parsed.data.product_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this product.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        shop_id: shopId,
        customer_id: authUser!.id,
        ...parsed.data,
        is_approved: false, // Admin approval required
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ review: data, message: 'Review submitted. Awaiting approval.' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
