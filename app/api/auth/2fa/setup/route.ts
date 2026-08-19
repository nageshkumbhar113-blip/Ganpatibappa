import { createAdminClient } from '@/lib/supabase/admin'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { handleApiError } from '@/lib/utils/api-error'
import { NextResponse } from 'next/server'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

export async function POST() {
  try {
    // Was reading headers().get('x-shop-id') directly -- middleware only
    // ever sets that header for /shop/* and /api/shop/* (storefront)
    // requests; admin-panel requests get x-admin-shop-id instead, and
    // /api/auth/* isn't covered by either branch at all. shopId was
    // therefore always null here, checkFeature(null, 'two_fa') correctly
    // found no subscription for a nonexistent shop and returned false, and
    // 2FA setup 403'd with "requires Premium plan" for every shop on every
    // plan, Premium included. requireAdmin() resolves shop_id from the
    // user's own row instead of trusting a header this route never had.
    const user = await requireAdmin()

    const has2FA = await checkFeature(user.shop_id!, 'two_fa')
    if (!has2FA) return NextResponse.json({ error: '2FA requires Premium plan' }, { status: 403 })

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
  } catch (error) {
    return handleApiError(error, 'auth/2fa/setup')
  }
}
