import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const CloneSchema = z.object({
  newSlug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  newShopName: z.string().min(1).max(100),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(100),
  ownerPassword: z.string().min(8).max(72),
  planId: z.string().uuid(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireSuperAdmin()

    const body = await req.json()
    const parsed = CloneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { newSlug, newShopName, ownerEmail, ownerName, ownerPassword, planId } = parsed.data
    const supabase = createAdminClient()

    // Check slug uniqueness
    const { data: slugCheck } = await supabase
      .from('shops')
      .select('id')
      .eq('slug', newSlug)
      .single()

    if (slugCheck) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }

    // Get source shop data
    const { data: sourceShop } = await supabase
      .from('shops')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!sourceShop) {
      return NextResponse.json({ error: 'Source shop not found' }, { status: 404 })
    }

    // Create new auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Failed to create owner account' }, { status: 500 })
    }

    // Create new shop (clone of source)
    const { data: newShop, error: shopError } = await supabase
      .from('shops')
      .insert({
        name: newShopName,
        slug: newSlug,
        whatsapp: sourceShop.whatsapp,
        address: sourceShop.address,
        theme_config: sourceShop.theme_config,
        owner_id: authData.user.id,
        status: 'active',
      })
      .select('id')
      .single()

    if (shopError || !newShop) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw shopError
    }

    // Create user profile
    await supabase.from('users').insert({
      id: authData.user.id,
      email: ownerEmail,
      name: ownerName,
      role: 'admin',
      shop_id: newShop.id,
      is_active: true,
    })

    // Create subscription
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('duration_days, name')
      .eq('id', planId)
      .single()

    const durationDays = plan?.duration_days ?? 14
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    await supabase.from('shop_subscriptions').insert({
      shop_id: newShop.id,
      plan_id: planId,
      status: plan?.name === 'trial' ? 'trial' : 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })

    // Clone settings
    const { data: sourceSettings } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('shop_id', params.id)
      .single()

    if (sourceSettings) {
      const { id: _id, shop_id: _sid, created_at: _ca, ...settingsData } = sourceSettings
      await supabase.from('shop_settings').insert({ ...settingsData, shop_id: newShop.id })
    }

    // Clone categories
    const { data: sourceCategories } = await supabase
      .from('categories')
      .select('name, slug, image_url, sort_order, is_active')
      .eq('shop_id', params.id)

    if (sourceCategories?.length) {
      await supabase
        .from('categories')
        .insert(sourceCategories.map((c) => ({ ...c, shop_id: newShop.id })))
    }

    // Clone products
    const { data: sourceProducts } = await supabase
      .from('products')
      .select('name, slug, description, price, offer_price, height_cm, material, weight_kg, stock, is_featured, is_active, images, seo_title, seo_description, seo_keywords')
      .eq('shop_id', params.id)

    if (sourceProducts?.length) {
      await supabase
        .from('products')
        .insert(sourceProducts.map((p) => ({ ...p, shop_id: newShop.id })))
    }

    // Clone WhatsApp templates
    const { data: templates } = await supabase
      .from('whatsapp_templates')
      .select('name, template, type')
      .eq('shop_id', params.id)

    if (templates?.length) {
      await supabase
        .from('whatsapp_templates')
        .insert(templates.map((t) => ({ ...t, shop_id: newShop.id })))
    }

    // Record clone history
    await supabase.from('shop_clone_history').insert({
      source_shop_id: params.id,
      target_shop_id: newShop.id,
      cloned_by: user.id,
    })

    return NextResponse.json({ newShopId: newShop.id }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/super-admin/shops/[id]/clone]', error)
    return NextResponse.json({ error: error?.message ?? 'Clone failed' }, { status: 500 })
  }
}
