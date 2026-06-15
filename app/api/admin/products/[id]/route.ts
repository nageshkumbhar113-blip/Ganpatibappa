import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { logAuditEvent } from '@/lib/utils/audit-logger'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(5000).optional(),
  price: z.number().positive().optional(),
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

async function getProductOrFail(
  supabase: ReturnType<typeof createClient>,
  shopId: string,
  productId: string
) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('shop_id', shopId)
    .single()

  if (error || !data) return null
  return data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const product = await getProductOrFail(supabase, user.shop_id!, params.id)
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    return NextResponse.json({ product })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const product = await getProductOrFail(supabase, user.shop_id!, params.id)
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Slug uniqueness check if slug is changing
    if (parsed.data.slug && parsed.data.slug !== product.slug) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('shop_id', user.shop_id!)
        .eq('slug', parsed.data.slug)
        .neq('id', params.id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists in this shop.' }, { status: 409 })
      }
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(parsed.data)
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)
      .select()
      .single()

    if (error) throw error

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: user.shop_id!,
      userId: user.id,
      action: 'update',
      tableName: 'products',
      recordId: params.id,
      oldValue: product,
      newValue: updated,
      ipAddress: ip,
    })

    return NextResponse.json({ product: updated })
  } catch (error: any) {
    console.error('[PATCH /api/admin/products/[id]]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const product = await getProductOrFail(supabase, user.shop_id!, params.id)
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)

    if (error) throw error

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: user.shop_id!,
      userId: user.id,
      action: 'delete',
      tableName: 'products',
      recordId: params.id,
      oldValue: product,
      ipAddress: ip,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
