import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { canAddProduct } from '@/lib/middleware/plan-guard'
import { logAuditEvent } from '@/lib/utils/audit-logger'
import { z } from 'zod'

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(5000).optional(),
  price: z.number().positive(),
  offer_price: z.number().positive().nullable().optional(),
  height_cm: z.number().positive().nullable().optional(),
  material: z.string().max(100).optional(),
  weight_kg: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  video_url: z.string().url().nullable().optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(500).optional(),
  seo_keywords: z.string().max(500).optional(),
  og_image_url: z.string().url().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    const categoryId = searchParams.get('category_id')
    const q = searchParams.get('q')
    const featured = searchParams.get('featured')
    const active = searchParams.get('active')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = (page - 1) * limit

    let query = supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (categoryId) query = query.eq('category_id', categoryId)
    if (q) query = query.ilike('name', `%${q}%`)
    if (featured === 'true') query = query.eq('is_featured', true)
    if (active !== null) query = query.eq('is_active', active === 'true')

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ products: data, total: count, page, limit })
  } catch (error) {
    console.error('[GET /api/admin/products]', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    // Check product limit
    const limitCheck = await canAddProduct(user.shop_id!)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Product limit reached. Your plan allows ${limitCheck.limit} products. You have ${limitCheck.current}.`,
          code: 'PLAN_LIMIT_EXCEEDED',
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = ProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check slug uniqueness within shop
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('shop_id', user.shop_id!)
      .eq('slug', parsed.data.slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists in this shop.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ ...parsed.data, shop_id: user.shop_id! })
      .select()
      .single()

    if (error) throw error

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: user.shop_id!,
      userId: user.id,
      action: 'create',
      tableName: 'products',
      recordId: data.id,
      newValue: data,
      ipAddress: ip,
    })

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/products]', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to create product' }, { status: 500 })
  }
}
