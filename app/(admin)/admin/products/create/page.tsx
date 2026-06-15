import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { canAddProduct } from '@/lib/middleware/plan-guard'
import { ProductForm } from '@/components/admin/products/ProductForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { redirect } from 'next/navigation'

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

export default async function CreateProductPage() {
  const user = await requireAdmin()

  const limitCheck = await canAddProduct(user.shop_id!)
  const categories = await getCategories(user.shop_id!)

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

        {!limitCheck.allowed && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>
              Product limit reached ({limitCheck.current}/{limitCheck.limit}).{' '}
              <Link href="/admin/settings/subscription" className="underline font-medium">
                Upgrade your plan →
              </Link>
            </span>
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
            <CardDescription>
              Add a Ganesh Murti product to your shop ({limitCheck.current}/{limitCheck.limit === -1 ? '∞' : limitCheck.limit} products used)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm categories={categories} mode="create" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
