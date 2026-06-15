import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const WishlistSchema = z.object({
  product_id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ wishlist: [] })

    const { data } = await supabase
      .from('wishlists')
      .select('id, product_id, created_at, products(id, name, slug, price, offer_price, images)')
      .eq('shop_id', shopId)
      .eq('customer_id', authUser!.id)

    return NextResponse.json({ wishlist: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to load wishlist' }, { status: 500 })
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
    const parsed = WishlistSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

    // Toggle wishlist
    const { data: existing } = await supabase
      .from('wishlists')
      .select('id')
      .eq('shop_id', shopId)
      .eq('customer_id', authUser!.id)
      .eq('product_id', parsed.data.product_id)
      .single()

    if (existing) {
      await supabase.from('wishlists').delete().eq('id', existing.id)
      return NextResponse.json({ added: false })
    } else {
      await supabase.from('wishlists').insert({
        shop_id: shopId,
        customer_id: authUser!.id,
        product_id: parsed.data.product_id,
      })
      return NextResponse.json({ added: true })
    }
  } catch {
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 })
  }
}
