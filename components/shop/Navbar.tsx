'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Heart, User, Home, Package, LayoutDashboard, LogIn } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { useShop } from '@/lib/contexts/shop-context'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role = 'admin' | 'super_admin' | 'staff' | 'customer' | null

function useAuthRole(): { role: Role; loaded: boolean } {
  const [state, setState] = useState<{ role: Role; loaded: boolean }>({ role: null, loaded: false })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setState({ role: null, loaded: true })
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()
      setState({ role: (profile?.role as Role) ?? null, loaded: true })
    })
  }, [])

  return state
}

interface NavbarProps {
  shopName?: string
  logoUrl?: string
}

export function ShopNavbar({ shopName, logoUrl }: NavbarProps) {
  const { basePath } = useShop()
  const { role, loaded } = useAuthRole()

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'staff'
  const isLoggedIn = role !== null

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={basePath || '/'} className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={shopName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="text-xl">🙏</span>
          )}
          {shopName && (
            <span className="font-bold text-gray-900 text-sm hidden sm:block">{shopName}</span>
          )}
        </Link>

        {/* Nav Icons */}
        <nav className="flex items-center gap-1">
          <Link
            href={`${basePath}/products`}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Products
          </Link>

          <CartIcon />

          <Link
            href={`${basePath}/wishlist`}
            className="rounded-lg p-2 text-gray-500 hover:text-red-500 hover:bg-gray-50 transition-colors"
          >
            <Heart className="h-5 w-5" />
          </Link>

          {/* Customer profile / login */}
          <Link
            href={isLoggedIn ? `${basePath}/profile` : `/login`}
            title={isLoggedIn ? 'My Profile' : 'Customer Login'}
            className="rounded-lg p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-50 transition-colors"
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Admin panel button — only for admin/staff */}
          {loaded && isAdmin && (
            <Link
              href="/admin"
              title="Admin Panel"
              className="rounded-lg p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}

          {/* Admin login button — only when NOT logged in */}
          {loaded && !isLoggedIn && (
            <Link
              href="/login?redirectTo=/admin"
              title="Admin Login"
              className="ml-1 inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function CartIcon() {
  const { totalItems } = useCart()
  const { basePath } = useShop()

  return (
    <Link
      href={`${basePath}/cart`}
      className="relative rounded-lg p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-50 transition-colors"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </Link>
  )
}

export function ShopBottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()
  const { basePath } = useShop()
  const { role, loaded } = useAuthRole()

  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'staff'
  const isLoggedIn = role !== null

  const links = [
    { href: basePath || '/', label: 'Home', icon: Home },
    { href: `${basePath}/products`, label: 'Products', icon: Package },
    { href: `${basePath}/cart`, label: 'Cart', icon: ShoppingCart, badge: totalItems },
    { href: `${basePath}/wishlist`, label: 'Wishlist', icon: Heart },
    {
      href: isLoggedIn ? `${basePath}/profile` : '/login',
      label: isLoggedIn ? 'Profile' : 'Login',
      icon: User,
    },
    ...(loaded && isAdmin
      ? [{ href: '/admin', label: 'Admin', icon: LayoutDashboard }]
      : loaded && !isLoggedIn
      ? [{ href: '/login?redirectTo=/admin', label: 'Admin', icon: LogIn }]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-lg sm:hidden">
      <div className={`grid ${links.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {links.map(({ href, label, icon: Icon, badge }) => {
          const isActive =
            href === basePath || href === '/'
              ? pathname === basePath || pathname === '/'
              : pathname.startsWith(href.split('?')[0])
          const isAdminLink = label === 'Admin'
          return (
            <Link
              key={label}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isAdminLink
                  ? 'text-orange-500'
                  : isActive
                  ? 'text-orange-500'
                  : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge ? (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-orange-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </div>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
