import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

export async function POST() {
  const shopId = headers().get('x-shop-id')!
  const has2FA = await checkFeature(shopId, 'two_factor_auth' as any)
  if (!has2FA) return NextResponse.json({ error: '2FA requires Premium plan' }, { status: 403 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = new OTPAuth.Secret()
  const totp = new OTPAuth.TOTP({
    issuer: 'GanpatiBappa',
    label: user.email!,
    secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  const uri = totp.toString()
  const qrCodeUrl = await QRCode.toDataURL(uri)

  const admin = createAdminClient()
  await admin
    .from('two_factor_auth' as any)
    .upsert({ user_id: user.id, secret: secret.base32, is_enabled: false }, { onConflict: 'user_id' })

  return NextResponse.json({ secret: secret.base32, qrCodeUrl })
}
