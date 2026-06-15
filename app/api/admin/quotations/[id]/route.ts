import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
  notes: z.string().optional(),
  valid_until: z.string().optional(),
  total_amount: z.number().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ quotation: data })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotations')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quotation: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
