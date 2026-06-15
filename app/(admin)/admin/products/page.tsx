import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { getShopPlanFeatures } from '@/lib/middleware/plan-guard'
import Link from 'next/link'
import { Plus, Upload, Download, Search, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'

interface ProductsPageProps {
  searchParams: { q?: string; page?: string; active?: string }
}

async function getProducts(shopId: string, q?: string, page = 1, active?: string) {
  const supabase = createClient()
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('products')
    .select('id, name, slug, price, offer_price, stock, is_active, is_featured, images, categories(name)', {
      count: 'exact',
    })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.ilike('name', `%${q}%`)
  if (active !== undefined) query = query.eq('is_active', active === 'true')

  const { data, count } = await query
  return { products: data ?? [], total: count ?? 0, limit }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const user = await requireAdmin()
  const page = parseInt(searchParams.page ?? '1')
  const { products, total, limit } = await getProducts(
    user.shop_id!,
    searchParams.q,
    page,
    searchParams.active
  )

  const features = await getShopPlanFeatures(user.shop_id!)
  const canImport = features.bulk_import ?? false

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">{total} total products</p>
        </div>
        <div className="flex items-center gap-2">
          {canImport && (
            <>
              <a
                href="/api/admin/products/export?template=true"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> Template
              </a>
              <Link
                href="/admin/products/import"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4" /> Import
              </Link>
              <a
                href="/api/admin/products/export"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> Export
              </a>
            </>
          )}
          <Link
            href="/admin/products/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search products…"
          className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </form>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No products found.</p>
            <Link href="/admin/products/create" className="mt-3 inline-block text-orange-500 hover:underline text-sm">
              Add your first product →
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Stock</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-lg">🙏</div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(product.categories as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{formatCurrency(product.price)}</p>
                    {product.offer_price && (
                      <p className="text-xs text-green-600">{formatCurrency(product.offer_price)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={product.stock === 0 ? 'text-red-500 font-medium' : 'text-gray-700'}>
                      {product.stock ?? '∞'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Draft'}
                      </span>
                      {product.is_featured && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/products?page=${p}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                p === page
                  ? 'bg-orange-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

