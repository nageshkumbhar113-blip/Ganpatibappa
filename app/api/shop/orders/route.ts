import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit'

const PlaceOrderSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(7).max(20),
  customer_email: z.string().email().optional().nullable(),
  customer_address: z.string().max(500).optional().nullable(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  total_amount: z.number().positive(),
  advance_amount: z.number().min(0).optional().nullable(),
  payment_method: z.enum(['upi', 'qr', 'cod', 'partial', 'cash', 'bank_transfer']).optional(),
  payment_screenshot_url: z.string().url().optional().nullable(),
  pickup_date: z.string().optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

function generateOrderNumber(): string {
  const now = new Date()
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `GP${ymd}${rand}`
}

export async function GET(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, payment_status, created_at, delivery_date')
      .eq('shop_id', shopId)
      .eq('customer_id', authUser.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ orders: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 orders per minute per IP
  const ip = getIP(req)
  const rl = await rateLimit(`order:${ip}`, { limit: 5, windowSecs: 60 })
  if (!rl.success) return rateLimitResponse(rl.reset)

  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const body = await req.json()
    const parsed = PlaceOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      customer_name, customer_phone, customer_email, customer_address,
      items, total_amount, advance_amount, payment_method,
      payment_screenshot_url, pickup_date, delivery_date, notes,
    } = parsed.data

    const adminSupabase = createAdminClient()

    // Fetch product details server-side to prevent price manipulation
    const productIds = items.map((i) => i.product_id)
    const { data: products, error: productsError } = await adminSupabase
      .from('products')
      .select('id, name, price, offer_price, is_active, stock')
      .in('id', productIds)
      .eq('shop_id', shopId)

    if (productsError || !products?.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 })
    }

    // Build order items with server-side prices
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) throw new Error(`Product ${item.product_id} not found`)
      if (!product.is_active) throw new Error(`Product "${product.name}" is no longer available`)
      const price = product.offer_price ?? product.price
      return {
        product_id: item.product_id,
        product_name: product.name,
        price,
        quantity: item.quantity,
        subtotal: price * item.quantity,
      }
    })

    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    const orderNumber = generateOrderNumber()
    const advanceAmt = advance_amount ?? 0
    const paymentStatus = advanceAmt >= total_amount ? 'paid' : advanceAmt > 0 ? 'partial' : 'pending'

    const { data: order, error: orderError } = await adminSupabase
      .from('orders')
      .insert({
        shop_id: shopId,
        customer_id: authUser?.id ?? null,
        order_number: orderNumber,
        customer_name,
        customer_phone,
        customer_address: customer_address ?? null,
        total_amount,
        advance_amount: advanceAmt,
        status: 'pending',
        payment_method: payment_method ?? 'upi',
        payment_status: paymentStatus,
        payment_screenshot_url: payment_screenshot_url ?? null,
        pickup_date: pickup_date ?? null,
        delivery_date: delivery_date ?? null,
        notes: notes ?? null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) throw orderError

    await adminSupabase.from('order_items').insert(
      orderItems.map((item) => ({ ...item, order_id: order.id }))
    )

    return NextResponse.json({ order: { id: order.id, order_number: order.order_number } }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/shop/orders]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to place order' }, { status: 500 })
  }
}
