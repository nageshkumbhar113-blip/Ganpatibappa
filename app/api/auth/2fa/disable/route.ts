import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import * as OTPAuth from 'otpauth'
import { z } from 'zod'

const schema = z.object({ token: z.string().length(6) })

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('two_factor_auth' as any)
    .select('secret')
    .eq('user_id', user.id)
    .eq('is_enabled', true)
    .single()

  if (!(row as any)?.secret) return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })

  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32((row as any).secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  const delta = totp.validate({ token: parsed.data.token, window: 1 })
  if (delta === null) return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })

  const { error: disableError } = await admin.from('two_factor_auth' as any).delete().eq('user_id', user.id)
  // A dropped delete here would tell the user 2FA is off when the DB
  // still has it on -- worse than the reverse, since they'd believe
  // they can log in without their authenticator app and get locked out.
  if (disableError) return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })

  return NextResponse.json({ success: true })
}
