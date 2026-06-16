import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit'

const SubscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = await rateLimit(`newsletter:${ip}`, { limit: 3, windowSecs: 60 })
  if (!rl.success) return rateLimitResponse(rl.reset)

  try {
    const shopId = req.headers.get('x-shop-id')
    if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const body = await req.json()
    const parsed = SubscribeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })

    const supabase = createAdminClient()

    await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          shop_id: shopId,
          email: parsed.data.email,
          name: parsed.data.name ?? null,
          is_active: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: 'shop_id,email' }
      )

    return NextResponse.json({ success: true, message: 'Successfully subscribed to newsletter!' })
  } catch {
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
