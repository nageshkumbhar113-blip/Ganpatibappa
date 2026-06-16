import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { formatCurrency, calculateDiscount } from '@/lib/utils/format'

interface Props { params: { shopSlug: string; id: string } }

export default async function CategoryPage({ params }: Props) {
  const supabase = createAdminClient()
  const base = `/shop/${params.shopSlug}`

  const { data: shopRow } = await supabase.from('shops').select('id').eq('slug', params.shopSlug).eq('status', 'active').single()
  if (!shopRow) notFound()

  const [{ data: category }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from('categories').select('id, name, image_url, description').eq('id', params.id).eq('shop_id', shopRow.id).single(),
    supabase.from('products').select('id, name, slug, price, offer_price, images, height_cm, stock').eq('shop_id', shopRow.id).eq('category_id', params.id).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('shop_settings').select('show_prices').eq('shop_id', shopRow.id).single(),
  ])

  if (!category) notFound()

  const showPrices = settings?.show_prices !== false

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={`${base}/products`} className="text-gray-500 hover:text-gray-800"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-sm font-bold text-gray-900">{category.name}</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {category.description && <p className="text-sm text-gray-500">{category.description}</p>}

        {!products?.length ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl">🙏</span>
            <p className="mt-4">No products in this category yet.</p>
            <Link href={`${base}/products`} className="mt-2 inline-block text-orange-500 hover:underline text-sm">View all products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product: any) => {
              const discount = product.offer_price ? calculateDiscount(product.price, product.offer_price) : 0
              const oos = product.stock === 0
              return (
                <Link key={product.id} href={`${base}/products/${product.slug}`} className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-44 bg-orange-50 overflow-hidden">
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full flex items-center justify-center text-4xl">🙏</div>}
                    {discount > 0 && <span className="absolute top-2 right-2 rounded-full bg-green-500 text-white text-xs font-bold px-2 py-0.5">{discount}% OFF</span>}
                    {oos && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-bold text-sm">Out of Stock</span></div>}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                    {product.height_cm && <p className="text-xs text-gray-400 mt-0.5">{product.height_cm} cm</p>}
                    {showPrices && !oos && (
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="font-bold text-gray-900">{formatCurrency(product.offer_price ?? product.price)}</span>
                        {product.offer_price && <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
