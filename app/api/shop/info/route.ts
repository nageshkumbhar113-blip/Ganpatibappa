import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const supabase = createAdminClient()
  const { data: shop } = await supabase
    .from('shops')
    .select(
      `id, name, slug, logo_url, whatsapp,
       shop_settings(show_prices, allow_whatsapp_order, about_text, meta_title, meta_description)`
    )
    .eq('id', shopId)
    .eq('status', 'active')
    .single()

  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const settings = (shop.shop_settings as any)?.[0] ?? {}

  return NextResponse.json({
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      logo_url: shop.logo_url,
      whatsapp: shop.whatsapp,
      show_prices: settings.show_prices !== false,
      allow_whatsapp_order: settings.allow_whatsapp_order !== false,
      about_text: settings.about_text,
    },
  })
}
