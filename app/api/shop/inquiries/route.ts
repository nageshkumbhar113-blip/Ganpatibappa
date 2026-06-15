import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const InquirySchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  product_id: z.string().uuid().optional(),
  message: z.string().min(1).max(1000),
})

export async function POST(request: Request) {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const body = await request.json()
  const parsed = InquirySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Optionally attach logged-in user
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inquiries')
    .insert({
      shop_id: shopId,
      user_id: user?.id ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      product_id: parsed.data.product_id ?? null,
      message: parsed.data.message,
      status: 'new',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inquiry: data }, { status: 201 })
}
