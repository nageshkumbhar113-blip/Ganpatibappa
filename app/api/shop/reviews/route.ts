import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/utils/api-error'

export const dynamic = 'force-dynamic'

// No login required — no customer signup exists anywhere in this app —
// a review is instead verified against the delivered order it came from
// (same phone+order_number "track my order" flow as guest order lookup).
const ReviewSchema = z.object({
  order_id: z.string().uuid(),
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

    // customer_name (NOT NULL on the table) is the reliable display name —
    // it doesn't depend on a users join that can be null for guest orders.
    let query = supabase
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('shop_id', shopId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)

    const { data } = await query.limit(50)

    const reviews = ((data ?? []) as any[]).map((r) => ({ ...r, reviewer_name: r.customer_name }))

    return NextResponse.json({ reviews })
  } catch (error) {
    return handleApiError(error, 'shop/reviews')
  }
}

export async function POST(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const ip = getIP(req)
    const rl = await rateLimit(`review-submit:${ip}`, { limit: 10, windowSecs: 60 })
    if (!rl.success) return rateLimitResponse(rl.reset)

    const body = await req.json()
    const parsed = ReviewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    // Admin client: verification happens in application code below (order
    // belongs to this shop, is actually delivered, and actually contains
    // this product) rather than via RLS, since there's no auth.uid() to
    // check against for a guest submission.
    const admin = createAdminClient()
    // .single<any>() — order_items relation type inference breaks the same
    // way documented in app/api/shop/info/route.ts; not worth chasing since
    // typescript.ignoreBuildErrors is set, but keeps tsc --noEmit clean.
    const { data: order } = await admin
      .from('orders')
      .select('id, shop_id, customer_id, customer_name, status, order_items(product_id)')
      .eq('id', parsed.data.order_id)
      .eq('shop_id', shopId)
      .single<any>()

    if (!order) {
      return NextResponse.json({ error: 'Order सापडला नाही.' }, { status: 404 })
    }
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'मूर्ती delivered झाल्यावरच review देता येईल.' }, { status: 403 })
    }
    const itemMatches = (order.order_items ?? []).some((i: any) => i.product_id === parsed.data.product_id)
    if (!itemMatches) {
      return NextResponse.json({ error: 'हा product या order मध्ये सापडला नाही.' }, { status: 400 })
    }

    // as any — order_id doesn't exist in the generated types until
    // supabase/migrations/015_reviews_order_link.sql has been run and
    // types regenerated.
    const { data, error } = await admin
      .from('reviews')
      .insert({
        shop_id: shopId,
        order_id: order.id,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        product_id: parsed.data.product_id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        is_approved: false, // Admin approval required
      } as any)
      .select()
      .single()

    if (error) {
      // Unique (order_id, product_id) violation — already reviewed
      if ((error as any).code === '23505') {
        return NextResponse.json({ error: 'तुम्ही या मूर्तीसाठी आधीच review दिला आहे.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ review: data, message: 'Review submitted. Awaiting approval.' }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'shop/reviews')
  }
}
