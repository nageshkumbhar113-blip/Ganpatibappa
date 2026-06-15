import { NextRequest, NextResponse } from 'next/server'
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
    return new Response('Not found', { status: 404 })
  }

  const baseUrl = shop.domain
    ? `https://${shop.domain}`
    : `https://${shop.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'ganpatibappa.in'}`

  const { data: products } = await supabase
    .from('products')
    .select('slug, created_at')
    .eq('shop_id', shop.id)
    .eq('is_active', true)

  const { data: categories } = await supabase
    .from('categories')
    .select('slug, created_at')
    .eq('shop_id', shop.id)
    .eq('is_active', true)

  const staticPages = ['', '/products', '/gallery', '/about', '/contact']

  const urls = [
    ...staticPages.map((path) => ({
      loc: `${baseUrl}${path}`,
      changefreq: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? '1.0' : '0.8',
    })),
    ...(products ?? []).map((p) => ({
      loc: `${baseUrl}/products/${p.slug}`,
      lastmod: p.created_at?.substring(0, 10),
      changefreq: 'weekly',
      priority: '0.7',
    })),
    ...(categories ?? []).map((c) => ({
      loc: `${baseUrl}/categories/${c.slug}`,
      lastmod: c.created_at?.substring(0, 10),
      changefreq: 'weekly',
      priority: '0.6',
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
