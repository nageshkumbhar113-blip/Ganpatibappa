import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET() {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { data, error } = await supabase
      .from('reviews')
      .select('id, reviewer_name, rating, comment, is_approved, created_at, products(name)')
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reviews: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const { id, is_approved } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved })
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createClient()
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
