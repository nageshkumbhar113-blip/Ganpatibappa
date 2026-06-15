import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ViewSchema = z.object({
  product_id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ items: [] })

    const { data } = await supabase
      .from('recently_viewed')
      .select('id, product_id, viewed_at, products(id, name, slug, price, offer_price, images)')
      .eq('shop_id', shopId)
      .eq('customer_id', authUser!.id)
      .order('viewed_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ items: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ ok: false })

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ ok: false })

    const body = await req.json()
    const parsed = ViewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ ok: false })

    // Upsert — update viewed_at if exists
    await supabase
      .from('recently_viewed')
      .upsert(
        {
          shop_id: shopId,
          customer_id: authUser!.id,
          product_id: parsed.data.product_id,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: 'shop_id,customer_id,product_id' }
      )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
