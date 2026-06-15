import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logAction } from '@/lib/utils/audit-logger'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  image_url: z.string().url().optional().nullable(),
  sort_order: z.number().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = createClient()

  if (parsed.data.slug) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('shop_id', user.shop_id!)
      .eq('slug', parsed.data.slug)
      .neq('id', params.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('categories')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAction({ shopId: user.shop_id!, userId: user.id, action: 'UPDATE', tableName: 'categories', recordId: params.id })
  return NextResponse.json({ category: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAction({ shopId: user.shop_id!, userId: user.id, action: 'DELETE', tableName: 'categories', recordId: params.id })
  return NextResponse.json({ success: true })
}
