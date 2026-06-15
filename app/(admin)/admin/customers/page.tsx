import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { Search, Users } from 'lucide-react'

interface CustomersPageProps {
  searchParams: { q?: string; page?: string }
}

async function getCustomers(shopId: string, q?: string, page = 1) {
  const supabase = createClient()
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('users')
    .select('id, name, phone, email, created_at', { count: 'exact' })
    .eq('shop_id', shopId)
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, count } = await query
  return { customers: data ?? [], total: count ?? 0, limit }
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const user = await requireAdmin()
  const page = parseInt(searchParams.page ?? '1')
  const { customers, total, limit } = await getCustomers(user.shop_id!, searchParams.q, page)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{total} total customers</p>
        </div>

        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search customers…"
            className="rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-56"
          />
        </form>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No customers yet.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/customers?page=${p}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                p === page ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
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
