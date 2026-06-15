import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, calculateDiscount } from '@/lib/utils/format'
import { Search } from 'lucide-react'

interface ProductsPageProps {
  searchParams: {
    category_id?: string
    q?: string
    page?: string
  }
}

async function getProductsPage(categoryId?: string, q?: string, page = 1) {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return null

  const supabase = createAdminClient()
  const limit = 12
  const offset = (page - 1) * limit

  let query = supabase
    .from('products')
    .select(
      'id, name, slug, price, offer_price, images, height_cm, material, stock, is_featured',
      { count: 'exact' }
    )
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, count } = await query

  const [{ data: categories }, { data: settings }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('shop_settings')
      .select('show_prices')
      .eq('shop_id', shopId)
      .single(),
  ])

  return {
    products: data ?? [],
    total: count ?? 0,
    limit,
    categories: categories ?? [],
    showPrices: settings?.show_prices !== false,
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = parseInt(searchParams.page ?? '1')
  const data = await getProductsPage(searchParams.category_id, searchParams.q, page)
  if (!data) notFound()

  const { products, total, limit, categories, showPrices } = data
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900">
            {searchParams.category_id
              ? categories.find((c: any) => c.id === searchParams.category_id)?.name ?? 'Products'
              : 'All Products'}
            <span className="text-sm font-normal text-gray-400 ml-2">({total})</span>
          </h1>

          {/* Search */}
          <form method="GET" className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q}
              placeholder="Search murtis…"
              className="rounded-full border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-48"
            />
          </form>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/products"
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !searchParams.category_id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </Link>
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`/products?category_id=${cat.id}`}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  searchParams.category_id === cat.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl">🙏</span>
            <p className="mt-4">No products found.</p>
            {searchParams.q && (
              <Link href="/products" className="mt-2 inline-block text-orange-500 hover:underline text-sm">
                Clear search
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product: any) => {
              const discount = product.offer_price
                ? calculateDiscount(product.price, product.offer_price)
                : 0
              const isOutOfStock = product.stock === 0

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative h-44 bg-orange-50 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-4xl">🙏</div>
                    )}
                    {discount > 0 && (
                      <span className="absolute top-2 right-2 rounded-full bg-green-500 text-white text-xs font-bold px-2 py-0.5">
                        {discount}% OFF
                      </span>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Out of Stock</span>
                      </div>
                    )}
                    {product.is_featured && !isOutOfStock && (
                      <span className="absolute top-2 left-2 rounded-full bg-orange-500 text-white text-xs font-bold px-2 py-0.5">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    {product.height_cm && (
                      <p className="text-xs text-gray-400 mt-0.5">{product.height_cm} cm</p>
                    )}
                    {showPrices && !isOutOfStock && (
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="font-bold text-gray-900">
                          {formatCurrency(product.offer_price ?? product.price)}
                        </span>
                        {product.offer_price && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
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
                href={`/products?page=${p}${searchParams.category_id ? `&category_id=${searchParams.category_id}` : ''}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  p === page
                    ? 'bg-orange-500 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
