import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { z } from 'zod'

const QuotationItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  subtotal: z.number().positive(),
})

const CreateQuotationSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(7).max(20),
  items: z.array(QuotationItemSchema).min(1),
  total_amount: z.number().positive(),
  valid_until: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const hasQuote = await checkFeature(user.shop_id!, 'quotation')
    if (!hasQuote) {
      return NextResponse.json({ error: 'Quotations not available on your plan.' }, { status: 403 })
    }

    const supabase = createClient()
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('quotations')
      .select('id, customer_name, customer_phone, total_amount, status, valid_until, created_at', {
        count: 'exact',
      })
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ quotations: data, total: count, page })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const hasQuote = await checkFeature(user.shop_id!, 'quotation')
    if (!hasQuote) {
      return NextResponse.json({ error: 'Quotations not available on your plan.' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = CreateQuotationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('quotations')
      .insert({
        ...parsed.data,
        shop_id: user.shop_id!,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ quotation: data }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/quotations]', error)
    return NextResponse.json({ error: 'Failed to create quotation' }, { status: 500 })
  }
}
