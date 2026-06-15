import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, calculateDiscount } from '@/lib/utils/format'
import { ChevronLeft } from 'lucide-react'

interface CategoryPageProps {
  params: { id: string }
  searchParams: { page?: string }
}

async function getCategoryData(slugOrId: string, page = 1) {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return null

  const supabase = createAdminClient()
  const limit = 12
  const offset = (page - 1) * limit

  // Try slug first, then id
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, image_url')
    .eq('shop_id', shopId)
    .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
    .single()

  if (!category) return null

  const [{ data: products, count }, { data: settings }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, slug, price, offer_price, images, height_cm, stock, is_featured', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from('shop_settings')
      .select('show_prices')
      .eq('shop_id', shopId)
      .single(),
  ])

  return {
    category,
    products: products ?? [],
    total: count ?? 0,
    limit,
    showPrices: settings?.show_prices !== false,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const page = parseInt(searchParams.page ?? '1')
  const data = await getCategoryData(params.id, page)
  if (!data) notFound()

  const { category, products, total, limit, showPrices } = data
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/products" className="text-gray-400 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          {category.image_url && (
            <img src={category.image_url} alt={category.name} className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{category.name}</h1>
            <p className="text-xs text-gray-400">{total} products</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl">🙏</span>
            <p className="mt-4">No products in this category yet.</p>
            <Link href="/products" className="mt-2 inline-block text-orange-500 hover:underline text-sm">
              Browse all products
            </Link>
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
                    {discount > 0 && !isOutOfStock && (
                      <span className="absolute top-2 right-2 rounded-full bg-green-500 text-white text-xs font-bold px-2 py-0.5">
                        {discount}% OFF
                      </span>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">Out of Stock</span>
                      </div>
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
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/categories/${params.id}?page=${p}`}
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
