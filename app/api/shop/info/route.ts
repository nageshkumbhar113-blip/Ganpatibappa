import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const supabase = createAdminClient()
  // .single<any>() — upi_id/upi_name/account_holder_name/address/maps_url
  // exist in the real DB but predate the last `supabase gen types` run, so
  // the generated Database type doesn't know them; combined with the
  // shop_settings(...) embed in the same select string, Supabase's query
  // builder can't infer a result type at all and poisons the whole object
  // (not just the unknown columns) into a SelectQueryError. Overriding the
  // generic is the same escape hatch already used ad-hoc via `(shop as
  // any).address` elsewhere in this codebase for the same root cause.
  const { data: shop } = await supabase
    .from('shops')
    .select(
      `id, name, slug, logo_url, whatsapp, address, maps_url,
       upi_id, upi_name, account_holder_name,
       shop_settings(show_prices, allow_whatsapp_order, about_text, meta_title, meta_description)`
    )
    .eq('id', shopId)
    .eq('status', 'active')
    .single<any>()

  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  // shop_settings.shop_id is UNIQUE (one-to-one), so PostgREST embeds it as a
  // single object, not an array — `?.[0]` always came back undefined here,
  // silently forcing show_prices/allow_whatsapp_order to their fallback
  // defaults and about_text to undefined for every shop, every time this
  // endpoint was called (product page price visibility, WhatsApp order
  // toggle, shop about text).
  const settings = (shop.shop_settings as any) ?? {}

  return NextResponse.json({
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      logo_url: shop.logo_url,
      whatsapp: shop.whatsapp,
      address: (shop as any).address,
      maps_url: (shop as any).maps_url,
      upi_id: (shop as any).upi_id,
      upi_name: (shop as any).upi_name,
      account_holder_name: (shop as any).account_holder_name,
      show_prices: settings.show_prices !== false,
      allow_whatsapp_order: settings.allow_whatsapp_order !== false,
      about_text: settings.about_text,
    },
  })
}
