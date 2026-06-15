import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { z } from 'zod'

const SubscribeSchema = z.object({
  fcmToken: z.string().min(10),
  shopId: z.string().uuid(),
  role: z.enum(['customer', 'admin', 'staff']).default('customer'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = SubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { fcmToken, shopId, role } = parsed.data
    const supabase = createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()

    // Upsert FCM subscription
    await supabase
      .from('fcm_subscriptions')
      .upsert(
        {
          shop_id: shopId,
          user_id: authUser?.id ?? null,
          fcm_token: fcmToken,
          role,
        },
        { onConflict: 'fcm_token' }
      )

    // If user is authenticated, also update their FCM token in users table
    if (authUser?.id) {
      await supabase
        .from('users')
        .update({ fcm_token: fcmToken })
        .eq('id', authUser.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/notifications/subscribe]', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
