import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CampaignSchema = z.object({
  name: z.string().min(1).max(100),
  festival_name: z.string().optional(),
  message: z.string().min(1).max(500),
  image_url: z.string().url().optional(),
  target_audience: z.enum(['all', 'customers', 'subscribers']).default('all'),
  whatsapp_enabled: z.boolean().default(false),
  email_enabled: z.boolean().default(false),
  push_enabled: z.boolean().default(false),
  scheduled_at: z.string().optional(),
})

export async function GET() {
  const user = await requireAdmin()

  const allowed = await checkFeature(user.shop_id!, 'festival_campaigns')
  if (!allowed) {
    return NextResponse.json({ error: 'Feature not available on current plan' }, { status: 403 })
  }

  const supabase = createClient()
  const { data } = await supabase
    .from('festival_campaigns')
    .select('*')
    .eq('shop_id', user.shop_id!)
    .order('created_at', { ascending: false })

  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(request: Request) {
  const user = await requireAdmin()

  const allowed = await checkFeature(user.shop_id!, 'festival_campaigns')
  if (!allowed) {
    return NextResponse.json({ error: 'Feature not available on current plan' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('festival_campaigns')
    .insert({
      shop_id: user.shop_id!,
      ...parsed.data,
      status: parsed.data.scheduled_at ? 'scheduled' : 'draft',
      sent_count: 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data }, { status: 201 })
}
