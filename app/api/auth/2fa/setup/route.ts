import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { authenticator } from 'otplib/preset/default'
import QRCode from 'qrcode'

export async function POST() {
  const shopId = headers().get('x-shop-id')!
  const has2FA = await checkFeature(shopId, 'two_factor_auth')
  if (!has2FA) return NextResponse.json({ error: '2FA requires Premium plan' }, { status: 403 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(user.email!, 'GanpatiBappa', secret)
  const qrCodeUrl = await QRCode.toDataURL(otpauth)

  const admin = createAdminClient()
  await admin
    .from('user_2fa')
    .upsert({ user_id: user.id, secret, enabled: false }, { onConflict: 'user_id' })

  return NextResponse.json({ secret, qrCodeUrl })
}
