import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const { is_approved } = await request.json()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .update({ is_approved })
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
