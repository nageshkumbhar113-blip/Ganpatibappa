import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { authenticator } from 'otplib/preset/default'
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
    .from('user_2fa')
    .select('secret')
    .eq('user_id', user.id)
    .single()

  if (!row?.secret) return NextResponse.json({ error: '2FA not set up' }, { status: 400 })

  const isValid = authenticator.verify({ token: parsed.data.token, secret: row.secret })
  if (!isValid) return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })

  await admin
    .from('user_2fa')
    .update({ enabled: true })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
