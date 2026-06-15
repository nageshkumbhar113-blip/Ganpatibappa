'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, FolderOpen, ShoppingBag, FileText,
  Users, Image, Star, MessageCircle, Megaphone, BarChart3,
  Shield, Cloud, Bell, Settings, ChevronDown, ChevronRight,
  Upload, Download, TrendingUp, Lock, Palette, CreditCard,
} from 'lucide-react'
import { useState } from 'react'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/products/import', label: 'Import Products', icon: Upload },
      { href: '/admin/products/export', label: 'Export Products', icon: Download },
      { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
      { href: '/admin/gallery', label: 'Gallery', icon: Image },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/admin/quotations', label: 'Quotations', icon: FileText },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/reviews', label: 'Reviews', icon: Star },
      { href: '/admin/inquiries', label: 'Inquiries', icon: MessageCircle },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/marketing', label: 'SEO & Marketing', icon: BarChart3 },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/reports/products', label: 'Top Products', icon: TrendingUp },
      { href: '/admin/reports/customers', label: 'Top Customers', icon: Users },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/admin/staff', label: 'Staff', icon: Users },
      { href: '/admin/cloudinary', label: 'Media Storage', icon: Cloud },
      { href: '/admin/security', label: 'Security', icon: Shield },
      { href: '/admin/security/2fa', label: '2FA Setup', icon: Lock },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/settings/theme', label: 'Theme & Colors', icon: Palette },
      { href: '/admin/settings/subscription', label: 'Subscription', icon: CreditCard },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleGroup(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-white border-r border-gray-100 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-base">
          🙏
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 leading-tight">GanpatiBappa</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map((group) => {
          const isCollapsed = collapsed.has(group.label)
          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
              >
                {group.label}
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3" />
                  : <ChevronDown className="h-3 w-3" />
                }
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
