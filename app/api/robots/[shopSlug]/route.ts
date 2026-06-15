import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { shopSlug: string } }
) {
  const supabase = createAdminClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('id, slug, domain')
    .eq('slug', params.shopSlug)
    .eq('status', 'active')
    .single()

  if (!shop) {
    return new Response('User-agent: *\nDisallow: /', {
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const { data: marketing } = await supabase
    .from('marketing_settings')
    .select('robots_txt_custom')
    .eq('shop_id', shop.id)
    .single()

  const baseUrl = shop.domain
    ? `https://${shop.domain}`
    : `https://${shop.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'ganpatibappa.in'}`

  const defaultRobots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /cart
Disallow: /checkout

Sitemap: ${baseUrl}/sitemap.xml`

  const robotsContent = marketing?.robots_txt_custom?.trim()
    ? marketing.robots_txt_custom
    : defaultRobots

  return new Response(robotsContent, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
