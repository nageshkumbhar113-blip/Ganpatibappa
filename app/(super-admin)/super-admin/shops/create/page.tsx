import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { CreateShopWizard } from '@/components/super-admin/CreateShopWizard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

async function getPlans() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('subscription_plans')
    .select('id, name, display_name, price, duration_days')
    .order('price', { ascending: true })
  return data ?? []
}

export default async function CreateShopPage() {
  await requireSuperAdmin()
  const plans = await getPlans()

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <Link
          href="/super-admin/shops"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Shops
        </Link>

        <Card className="shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-xl">Create New Shop</CardTitle>
            <CardDescription>
              Set up a new Ganesh Murti shop with owner account and subscription plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateShopWizard plans={plans} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
