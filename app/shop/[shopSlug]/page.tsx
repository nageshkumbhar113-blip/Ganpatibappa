import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, calculateDiscount } from '@/lib/utils/format'

interface Props { params: { shopSlug: string } }

async function getShopHome(slug: string) {
  const supabase = createAdminClient()
  const { data: shop } = await supabase
    .from('shops')
    .select(`name, logo_url, banner_url, whatsapp, shop_settings(about_text, show_prices, allow_whatsapp_order)`)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!shop) return null

  const { data: shopRow } = await supabase.from('shops').select('id').eq('slug', slug).single()
  if (!shopRow) return null

  const [{ data: featured }, { data: categories }] = await Promise.all([
    supabase.from('products').select('id, name, slug, price, offer_price, images').eq('shop_id', shopRow.id).eq('is_featured', true).eq('is_active', true).limit(8),
    supabase.from('categories').select('id, name, slug, image_url').eq('shop_id', shopRow.id).eq('is_active', true).order('sort_order'),
  ])

  return { shop, featured: featured ?? [], categories: categories ?? [] }
}

export default async function ShopHomePage({ params }: Props) {
  const data = await getShopHome(params.shopSlug)
  if (!data?.shop) notFound()

  const { shop, featured, categories } = data
  const settings = (shop.shop_settings as any)?.[0] ?? {}
  const showPrices = settings.show_prices !== false
  const base = `/shop/${params.shopSlug}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative h-64 sm:h-80 bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center overflow-hidden"
        style={shop.banner_url ? { backgroundImage: `url(${shop.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {shop.banner_url && <div className="absolute inset-0 bg-black/40" />}
        <div className="relative text-center text-white px-4">
          {shop.logo_url && <img src={shop.logo_url} alt={shop.name} className="h-20 w-20 rounded-2xl mx-auto mb-4 object-cover shadow-lg" />}
          <h1 className="text-3xl font-bold">{shop.name}</h1>
          <p className="text-orange-100 mt-1">गणपती मूर्ती Online Order</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link href={`${base}/products`} className="rounded-full bg-white text-orange-600 font-semibold px-6 py-2.5 text-sm hover:bg-orange-50 transition-colors">
              Shop Now
            </Link>
            {settings.allow_whatsapp_order && shop.whatsapp && (
              <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=Hello, I want to order a Ganpati Murti`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-green-500 text-white font-semibold px-6 py-2.5 text-sm hover:bg-green-600 transition-colors">
                📞 WhatsApp Order
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Categories</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {categories.map((cat: any) => (
                <Link key={cat.id} href={`${base}/categories/${cat.id}`} className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-28 bg-orange-50 flex items-center justify-center overflow-hidden">
                    {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <span className="text-4xl">🙏</span>}
                  </div>
                  <p className="text-center text-sm font-medium text-gray-800 py-3 px-2">{cat.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Featured Murtis</h2>
              <Link href={`${base}/products`} className="text-sm text-orange-600 hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {featured.map((product: any) => {
                const discount = product.offer_price ? calculateDiscount(product.price, product.offer_price) : 0
                return (
                  <Link key={product.id} href={`${base}/products/${product.slug}`} className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative h-44 bg-orange-50 overflow-hidden">
                      {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full flex items-center justify-center text-4xl">🙏</div>}
                      {discount > 0 && <span className="absolute top-2 right-2 rounded-full bg-green-500 text-white text-xs font-bold px-2 py-0.5">{discount}% OFF</span>}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                      {showPrices && (
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="font-bold text-gray-900">{formatCurrency(product.offer_price ?? product.price)}</span>
                          {product.offer_price && <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {settings.about_text && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">About Us</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{settings.about_text}</p>
          </section>
        )}
      </div>

      <footer className="border-t border-gray-100 bg-white py-8 text-center text-xs text-gray-400">
        <p>🙏 {shop.name} — Ganesh Murti Online Order</p>
        {shop.whatsapp && <p className="mt-1">WhatsApp: {shop.whatsapp}</p>}
        <p className="mt-2">Powered by GanpatiBappa Platform</p>
      </footer>
    </div>
  )
}
