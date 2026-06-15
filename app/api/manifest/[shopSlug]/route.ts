import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { shopSlug: string } }
) {
  const supabase = createAdminClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, slug')
    .eq('slug', params.shopSlug)
    .eq('status', 'active')
    .single()

  if (!shop) {
    return new Response('Not found', { status: 404 })
  }

  const { data: pwa } = await supabase
    .from('pwa_settings')
    .select('*')
    .eq('shop_id', shop.id)
    .single()

  const appName = pwa?.app_name ?? shop.name
  const shortName = pwa?.short_name ?? appName.substring(0, 12)
  const themeColor = pwa?.theme_color ?? '#ff6b00'
  const backgroundColor = pwa?.background_color ?? '#ffffff'
  const iconUrl = pwa?.icon_url ?? '/icons/icon-192x192.png'

  const baseUrl = `/${params.shopSlug}`

  const manifest = {
    name: appName,
    short_name: shortName,
    description: `${appName} — Ganesh Murti Online Order`,
    start_url: `${baseUrl}/`,
    scope: `${baseUrl}/`,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: themeColor,
    background_color: backgroundColor,
    lang: 'mr',
    categories: ['shopping', 'lifestyle'],
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: pwa?.splash_url ?? '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Products',
        url: `${baseUrl}/products`,
        icons: [{ src: iconUrl, sizes: '96x96' }],
      },
      {
        name: 'My Orders',
        url: `${baseUrl}/orders`,
        icons: [{ src: iconUrl, sizes: '96x96' }],
      },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
