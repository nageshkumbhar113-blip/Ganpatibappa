// ============================================================
// app/api/shop/orders/lookup/route.ts
// "Track my order" — the whole platform has no customer signup/login
// (see fix in orders/[id] pages), so returning customers need a way to
// find their own order again without an account. Phone + order number
// together is the standard guest-tracking pattern (Shopify, courier
// sites, etc.) — a bare phone number alone would let anyone browse a
// known contact's full order history, which order_number's sequential
// format (shop-prefixed, date-stamped) doesn't meaningfully protect
// against on its own, so both are required and rate-limited.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/utils/api-error'

const LookupSchema = z.object({
  phone: z.string().min(6).max(20),
  order_number: z.string().min(3).max(40),
})

function normalizePhone(phone: string) {
  // Keep only digits, then take the last 10 — tolerates +91/0/spaces/dashes
  // typed differently at checkout vs. at lookup time.
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-10)
}

export async function POST(req: NextRequest) {
  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const ip = getIP(req)
    const rl = await rateLimit(`order-lookup:${ip}`, { limit: 8, windowSecs: 60 })
    if (!rl.success) return rateLimitResponse(rl.reset)

    const body = await req.json()
    const parsed = LookupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'फोन नंबर आणि ऑर्डर नंबर बरोबर टाका.' }, { status: 400 })
    }

    const phoneLast10 = normalizePhone(parsed.data.phone)
    const orderNumber = parsed.data.order_number.trim().toUpperCase()

    const admin = createAdminClient()
    const { data: orders } = await admin
      .from('orders')
      .select('id, order_number, customer_phone')
      .eq('shop_id', shopId)
      .ilike('order_number', orderNumber)

    const match = (orders ?? []).find((o) => normalizePhone(o.customer_phone ?? '') === phoneLast10)

    if (!match) {
      // Generic message — don't reveal whether the phone or the order
      // number was the part that didn't match.
      return NextResponse.json(
        { error: 'हा ऑर्डर सापडला नाही. फोन नंबर आणि ऑर्डर नंबर पुन्हा तपासा.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order_id: match.id })
  } catch (error) {
    return handleApiError(error, 'shop/orders/lookup')
  }
}
