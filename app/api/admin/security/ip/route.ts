import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireShopOwner } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { z } from 'zod'

const IPSchema = z.object({
  ip_address: z.string().min(7).max(45),
  action: z.enum(['allow', 'block']),
  note: z.string().max(200).optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const supabase = createClient()

    const { data } = await supabase
      .from('ip_restrictions')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })

    return NextResponse.json({ restrictions: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireShopOwner()

    const hasIPRestrict = await checkFeature(user.shop_id!, 'ip_restrictions')
    if (!hasIPRestrict) {
      return NextResponse.json({ error: 'IP restrictions require Premium plan.' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = IPSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('ip_restrictions')
      .insert({ ...parsed.data, shop_id: user.shop_id! })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ restriction: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to add IP restriction' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()
    await supabase
      .from('ip_restrictions')
      .delete()
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
