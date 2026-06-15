import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { ShopTable } from '@/components/super-admin/ShopTable'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'

interface ShopsPageProps {
  searchParams: {
    filter?: 'all' | 'active' | 'trial' | 'expired' | 'suspended'
    q?: string
  }
}

async function getShops(filter?: string, query?: string) {
  const supabase = createAdminClient()

  let dbQuery = supabase
    .from('shops')
    .select(
      `id, name, slug, status, created_at,
       shop_subscriptions(status, expires_at, subscription_plans(name, display_name))`
    )
    .order('created_at', { ascending: false })

  if (filter && filter !== 'all') {
    if (filter === 'active') {
      dbQuery = dbQuery.eq('status', 'active')
    } else if (filter === 'suspended') {
      dbQuery = dbQuery.eq('status', 'suspended')
    }
  }

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`)
  }

  const { data } = await dbQuery
  return data ?? []
}

export default async function ShopsPage({ searchParams }: ShopsPageProps) {
  await requireSuperAdmin()
  const shops = await getShops(searchParams.filter, searchParams.q)

  const filters = [
    { key: 'all', label: 'All Shops' },
    { key: 'active', label: 'Active' },
    { key: 'trial', label: 'Trial' },
    { key: 'expired', label: 'Expired' },
    { key: 'suspended', label: 'Suspended' },
  ]

  const currentFilter = searchParams.filter ?? 'all'

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <p className="text-sm text-gray-500 mt-0.5">{shops.length} shop(s) found</p>
        </div>
        <Link
          href="/super-admin/shops/create"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Shop
        </Link>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={`/super-admin/shops?filter=${f.key}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                currentFilter === f.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search shops…"
            className="rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-56"
          />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <ShopTable shops={shops as any} />
      </div>
    </div>
  )
}
