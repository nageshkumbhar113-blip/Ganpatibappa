import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireShopOwner } from '@/lib/middleware/auth-guard'
import { z } from 'zod'

const SettingsSchema = z.object({
  about_text: z.string().max(3000).optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  show_prices: z.boolean().optional(),
  allow_whatsapp_order: z.boolean().optional(),
  meta_title: z.string().max(200).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  youtube_url: z.string().url().optional().nullable(),
  // Shop fields
  name: z.string().min(1).max(100).optional(),
  whatsapp: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  logo_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  theme_config: z.record(z.unknown()).optional(),
  maps_url: z.string().url().optional().nullable(),
  // Payment fields (stored in shops table)
  upi_id: z.string().max(100).optional().nullable(),
  upi_name: z.string().max(100).optional().nullable(),
  qr_code_url: z.string().url().optional().nullable(),
  account_holder_name: z.string().max(100).optional().nullable(),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const supabase = createClient()

    const [{ data: shop }, { data: settings }] = await Promise.all([
      supabase
        .from('shops')
        .select('id, name, slug, whatsapp, address, maps_url, logo_url, banner_url, theme_config, domain, subdomain, status, upi_id, upi_name, qr_code_url, account_holder_name')
        .eq('id', user.shop_id!)
        .single(),
      supabase
        .from('shop_settings')
        .select('*')
        .eq('shop_id', user.shop_id!)
        .single(),
    ])

    return NextResponse.json({ shop, settings })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireShopOwner()

    const body = await req.json()
    const parsed = SettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      about_text, contact_email, show_prices, allow_whatsapp_order,
      meta_title, meta_description, youtube_url,
      name, whatsapp, address, maps_url, logo_url, banner_url, theme_config,
      upi_id, upi_name, qr_code_url, account_holder_name,
    } = parsed.data

    const supabase = createClient()

    // Update shop_settings
    const settingsUpdate: Record<string, unknown> = {}
    if (about_text !== undefined) settingsUpdate.about_text = about_text
    if (contact_email !== undefined) settingsUpdate.contact_email = contact_email
    if (show_prices !== undefined) settingsUpdate.show_prices = show_prices
    if (allow_whatsapp_order !== undefined) settingsUpdate.allow_whatsapp_order = allow_whatsapp_order
    if (meta_title !== undefined) settingsUpdate.meta_title = meta_title
    if (meta_description !== undefined) settingsUpdate.meta_description = meta_description
    if (youtube_url !== undefined) settingsUpdate.youtube_url = youtube_url

    // Update shop (including payment fields)
    const shopUpdate: Record<string, unknown> = {}
    if (name) shopUpdate.name = name
    if (whatsapp) shopUpdate.whatsapp = whatsapp
    if (address !== undefined) shopUpdate.address = address
    if (maps_url !== undefined) shopUpdate.maps_url = maps_url
    if (logo_url !== undefined) shopUpdate.logo_url = logo_url
    if (banner_url !== undefined) shopUpdate.banner_url = banner_url
    if (theme_config) shopUpdate.theme_config = theme_config
    if (upi_id !== undefined) shopUpdate.upi_id = upi_id
    if (upi_name !== undefined) shopUpdate.upi_name = upi_name
    if (qr_code_url !== undefined) shopUpdate.qr_code_url = qr_code_url
    if (account_holder_name !== undefined) shopUpdate.account_holder_name = account_holder_name

    await Promise.all([
      Object.keys(settingsUpdate).length > 0
        ? supabase
            .from('shop_settings')
            .upsert({ ...settingsUpdate, shop_id: user.shop_id! }, { onConflict: 'shop_id' })
        : Promise.resolve(),
      Object.keys(shopUpdate).length > 0
        ? supabase.from('shops').update(shopUpdate).eq('id', user.shop_id!)
        : Promise.resolve(),
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[PUT /api/admin/settings]', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
