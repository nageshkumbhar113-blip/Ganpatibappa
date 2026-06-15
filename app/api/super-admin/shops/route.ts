import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const CreateShopSchema = z.object({
  shop: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
    whatsapp: z.string().min(7).max(20),
    address: z.string().max(300).optional(),
  }),
  owner: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    password: z.string().min(8).max(72),
  }),
  planId: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const supabase = createAdminClient()

    const { searchParams } = req.nextUrl
    const filter = searchParams.get('filter')
    const query = searchParams.get('q')

    let dbQuery = supabase
      .from('shops')
      .select(
        `id, name, slug, status, created_at,
         shop_subscriptions(status, expires_at, subscription_plans(name, display_name))`
      )
      .order('created_at', { ascending: false })

    if (filter === 'active') dbQuery = dbQuery.eq('status', 'active')
    if (filter === 'suspended') dbQuery = dbQuery.eq('status', 'suspended')
    if (query) dbQuery = dbQuery.ilike('name', `%${query}%`)

    const { data, error } = await dbQuery
    if (error) throw error

    return NextResponse.json({ shops: data })
  } catch (error) {
    console.error('[GET /api/super-admin/shops]', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const parsed = CreateShopSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { shop, owner, planId } = parsed.data
    const supabase = createAdminClient()

    // 1. Check slug uniqueness
    const { data: existingShop } = await supabase
      .from('shops')
      .select('id')
      .eq('slug', shop.slug)
      .single()

    if (existingShop) {
      return NextResponse.json({ error: 'This slug is already taken.' }, { status: 409 })
    }

    // 2. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: owner.email,
      password: owner.password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 })
      }
      throw authError
    }

    // 3. Create shop record
    const { data: shopRecord, error: shopError } = await supabase
      .from('shops')
      .insert({
        name: shop.name,
        slug: shop.slug,
        whatsapp: shop.whatsapp,
        address: shop.address ?? '',
        owner_id: authData.user.id,
        status: 'active',
      })
      .select('id')
      .single()

    if (shopError || !shopRecord) {
      // Roll back auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw shopError
    }

    // 4. Create user profile record
    await supabase.from('users').insert({
      id: authData.user.id,
      email: owner.email,
      name: owner.name,
      phone: owner.phone ?? null,
      role: 'admin',
      shop_id: shopRecord.id,
      is_active: true,
    })

    // 5. Get plan details for expiry calculation
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('duration_days')
      .eq('id', planId)
      .single()

    const durationDays = plan?.duration_days ?? 14
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    // 6. Create subscription
    await supabase.from('shop_subscriptions').insert({
      shop_id: shopRecord.id,
      plan_id: planId,
      status: durationDays === 14 ? 'trial' : 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })

    // 7. Create default shop settings
    await supabase.from('shop_settings').insert({
      shop_id: shopRecord.id,
      show_prices: true,
      allow_whatsapp_order: true,
    })

    // 8. Create default PWA settings
    await supabase.from('pwa_settings').insert({
      shop_id: shopRecord.id,
      app_name: shop.name,
      short_name: shop.name.substring(0, 12),
      theme_color: '#ff6b00',
      background_color: '#ffffff',
    })

    return NextResponse.json({ shopId: shopRecord.id }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/super-admin/shops]', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create shop' },
      { status: 500 }
    )
  }
}
