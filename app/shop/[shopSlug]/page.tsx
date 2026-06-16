import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, calculateDiscount } from '@/lib/utils/format'
import { Search } from 'lucide-react'

interface Props {
  params: { shopSlug: string }
  searchParams: { category_id?: string; q?: string; page?: string }
}

async function getShopCatalog(slug: string, categoryId?: string, q?: string, page = 1) {
  const supabase = createAdminClient()

  const { data: shop } = await supabase
    .from('shops')
    .select(`id, name, logo_url, banner_url, whatsapp, shop_settings(about_text, show_prices, allow_whatsapp_order)`)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!shop) return null

  const limit = 12
  const offset = (page - 1) * limit

  let query = supabase
    .from('products')
    .select('id, name, slug, price, offer_price, images, height_cm, material, stock, is_featured', { count: 'exact' })
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (q) query = query.ilike('name', `%${q}%`)

  const [{ data: products, count }, { data: categories }] = await Promise.all([
    query,
    supabase.from('categories').select('id, name, image_url').eq('shop_id', shop.id).eq('is_active', true).order('sort_order'),
  ])

  return {
    shop,
    products: products ?? [],
    categories: categories ?? [],
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export default async function ShopHomePage({ params, searchParams }: Props) {
  const page = parseInt(searchParams.page ?? '1')
  const data = await getShopCatalog(params.shopSlug, searchParams.category_id, searchParams.q, page)
  if (!data) notFound()

  const { shop, products, categories, total, totalPages } = data
  const settings = (shop.shop_settings as any)?.[0] ?? {}
  const showPrices = settings.show_prices !== false
  const base = `/shop/${params.shopSlug}`
  const wa = shop.whatsapp?.replace(/\D/g, '')

  return (
    <div className="min-h-screen bg-[#fafaf9]">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={
          shop.banner_url
            ? { backgroundImage: `url(${shop.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {}
        }
      >
        {/* gradient overlay */}
        <div className={`absolute inset-0 ${shop.banner_url ? 'bg-gradient-to-b from-black/60 via-black/40 to-black/70' : 'bg-gradient-to-br from-orange-700 via-orange-500 to-amber-400'}`} />

        {/* decorative circles */}
        {!shop.banner_url && (
          <>
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/5" />
          </>
        )}

        <div className="relative max-w-5xl mx-auto px-4 py-10 sm:py-14 flex flex-col sm:flex-row items-center gap-6">
          {/* Logo */}
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shadow-xl border-2 border-white/30 shrink-0" />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl shrink-0 shadow-xl">🙏</div>
          )}

          <div className="text-center sm:text-left flex-1">
            <p className="text-orange-200 text-xs font-semibold uppercase tracking-widest mb-1">गणपती मूर्ती Online Store</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-sm">{shop.name}</h1>
            {settings.about_text && (
              <p className="mt-2 text-white/75 text-sm leading-relaxed line-clamp-2 max-w-md">{settings.about_text}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-3 justify-center sm:justify-start">
              <a
                href="#catalog"
                className="rounded-full bg-white text-orange-600 font-bold px-6 py-2.5 text-sm shadow hover:bg-orange-50 transition-colors"
              >
                🛒 मूर्ती पाहा
              </a>
              {settings.allow_whatsapp_order && wa && (
                <a
                  href={`https://wa.me/${wa}?text=नमस्कार! मला Ganesh Murti order करायची आहे.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-green-500 text-white font-bold px-6 py-2.5 text-sm shadow hover:bg-green-600 transition-colors"
                >
                  📞 WhatsApp Order
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CATALOG ──────────────────────────────────────────── */}
      <div id="catalog" className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Search + category count */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <form method="GET" action={`${base}`}>
              {searchParams.category_id && <input type="hidden" name="category_id" value={searchParams.category_id} />}
              <input
                type="search"
                name="q"
                defaultValue={searchParams.q}
                placeholder="मूर्ती शोधा…"
                className="w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
              />
            </form>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{total} products</span>
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link
              href={`${base}${searchParams.q ? `?q=${searchParams.q}` : ''}`}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${!searchParams.category_id ? 'bg-orange-500 text-white shadow-orange-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}
            >
              सर्व
            </Link>
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`${base}?category_id=${cat.id}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${searchParams.category_id === cat.id ? 'bg-orange-500 text-white shadow-orange-200' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {!products.length ? (
          <div className="text-center py-20 text-gray-400 space-y-3">
            <div className="text-6xl">🙏</div>
            <p className="text-base font-medium">{searchParams.q ? `"${searchParams.q}" सापडले नाही` : 'Products लवकरच येतील'}</p>
            {searchParams.q && (
              <Link href={`${base}`} className="inline-block text-orange-500 hover:underline text-sm">
                सर्व products पाहा
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product: any) => {
              const discount = product.offer_price ? calculateDiscount(product.price, product.offer_price) : 0
              const oos = product.stock === 0
              return (
                <Link
                  key={product.id}
                  href={`${base}/products/${product.slug}`}
                  className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 flex flex-col"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-5xl opacity-50">🙏</div>
                    )}
                    {discount > 0 && (
                      <span className="absolute top-2 right-2 rounded-full bg-green-500 text-white text-[10px] font-extrabold px-2 py-0.5 shadow">
                        {discount}% OFF
                      </span>
                    )}
                    {product.is_featured && !oos && (
                      <span className="absolute top-2 left-2 rounded-full bg-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 shadow">
                        ⭐ Featured
                      </span>
                    )}
                    {oos && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="text-white font-bold text-xs bg-black/40 px-3 py-1 rounded-full">Stock नाही</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1 flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{product.name}</h3>
                    {product.height_cm && (
                      <p className="text-[11px] text-gray-400">उंची: {product.height_cm} cm</p>
                    )}
                    {product.material && (
                      <p className="text-[11px] text-gray-400 capitalize">{product.material}</p>
                    )}
                    {showPrices && !oos && (
                      <div className="mt-auto pt-2 flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-gray-900">{formatCurrency(product.offer_price ?? product.price)}</span>
                        {product.offer_price && (
                          <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                        )}
                      </div>
                    )}
                    {oos && <p className="mt-auto text-xs font-semibold text-red-400">Out of Stock</p>}
                  </div>

                  {/* CTA */}
                  {!oos && (
                    <div className="px-3 pb-3">
                      <span className="block w-full text-center rounded-xl bg-orange-500 group-hover:bg-orange-600 text-white text-xs font-bold py-2 transition-colors">
                        पाहा / Order करा
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`${base}?page=${p}${searchParams.category_id ? `&category_id=${searchParams.category_id}` : ''}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${p === page ? 'bg-orange-500 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:border-orange-400'}`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white mt-8 py-8 text-center space-y-1">
        <p className="text-sm font-semibold text-gray-700">🙏 {shop.name}</p>
        {shop.whatsapp && (
          <a href={`https://wa.me/${wa}`} className="text-xs text-green-600 hover:underline block">
            📞 WhatsApp: {shop.whatsapp}
          </a>
        )}
        <p className="text-[11px] text-gray-400 pt-1">Powered by GanpatiBappa Platform</p>
      </footer>

      {/* ── FLOATING WHATSAPP ────────────────────────────────── */}
      {settings.allow_whatsapp_order && wa && (
        <a
          href={`https://wa.me/${wa}?text=नमस्कार! मला Ganesh Murti order करायची आहे.`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 right-4 sm:bottom-6 z-40 h-14 w-14 rounded-full bg-green-500 shadow-lg hover:bg-green-600 flex items-center justify-center text-2xl transition-transform hover:scale-110 sm:hidden"
          aria-label="WhatsApp Order"
        >
          💬
        </a>
      )}
    </div>
  )
}
