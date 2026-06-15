import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const PlaceOrderSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(7).max(20),
  customer_address: z.string().max(500).optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      product_name: z.string().min(1),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      subtotal: z.number().positive(),
    })
  ).min(1),
  total_amount: z.number().positive(),
  advance_amount: z.number().min(0).optional(),
  payment_method: z.enum(['upi', 'qr', 'cod', 'partial']).optional(),
  pickup_date: z.string().optional(),
  delivery_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
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
      .eq('customer_id', authUser?.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ orders: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const body = await req.json()
    const parsed = PlaceOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      customer_name, customer_phone, customer_address, items,
      total_amount, advance_amount, payment_method, pickup_date, delivery_date, notes,
    } = parsed.data

    const supabase = createClient()
    const adminSupabase = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    const orderNumber = generateOrderNumber()
    const balanceAmount = advance_amount ? total_amount - advance_amount : total_amount

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
        advance_amount: advance_amount ?? 0,
        status: 'pending',
        payment_method: payment_method ?? 'upi',
        payment_status: advance_amount && advance_amount >= total_amount ? 'paid' : advance_amount ? 'partial' : 'pending',
        pickup_date: pickup_date ?? null,
        delivery_date: delivery_date ?? null,
        notes: notes ?? null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) throw orderError

    // Insert order items
    await adminSupabase.from('order_items').insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }))
    )

    return NextResponse.json({ order: { id: order.id, orderNumber: order.order_number } }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/shop/orders]', error)
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 })
  }
}
