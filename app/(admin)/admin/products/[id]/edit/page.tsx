import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/admin/products/ProductForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

async function getProduct(shopId: string, productId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('shop_id', shopId)
    .single()
  return data
}

async function getCategories(shopId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireAdmin()
  const [product, categories] = await Promise.all([
    getProduct(user.shop_id!, params.id),
    getCategories(user.shop_id!),
  ])

  if (!product) notFound()

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category_id: product.category_id ?? null,
    description: product.description ?? '',
    price: String(product.price),
    offer_price: product.offer_price ? String(product.offer_price) : '',
    height_cm: product.height_cm ? String(product.height_cm) : '',
    material: product.material ?? '',
    weight_kg: product.weight_kg ? String(product.weight_kg) : '',
    stock: product.stock != null ? String(product.stock) : '',
    is_featured: product.is_featured ?? false,
    is_active: product.is_active ?? true,
    images: (product.images as string[]) ?? [],
    seo_title: product.seo_title ?? '',
    seo_description: product.seo_description ?? '',
    seo_keywords: product.seo_keywords ?? '',
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Edit Product</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm categories={categories} initialData={initialData} mode="edit" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
