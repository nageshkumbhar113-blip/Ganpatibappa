import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logoutAction } from '@/app/login/actions'
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Activity,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/shops', label: 'Shops', icon: Store },
  { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/super-admin/system', label: 'System', icon: Activity },
]

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSuperAdmin()

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-gray-900 text-white shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center text-lg">
            🙏
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">GanpatiBappa</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Super Admin
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <div className="px-3 py-2 text-xs text-gray-400 truncate">{user.email}</div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
