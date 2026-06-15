'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Heart, User, Home, Package } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'

interface NavbarProps {
  shopName?: string
  logoUrl?: string
}

export function ShopNavbar({ shopName, logoUrl }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={shopName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="text-xl">🙏</span>
          )}
          {shopName && (
            <span className="font-bold text-gray-900 text-sm hidden sm:block">{shopName}</span>
          )}
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/products" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors">
            Products
          </Link>
          <CartIcon />
          <Link href="/wishlist" className="rounded-lg p-2 text-gray-500 hover:text-red-500 hover:bg-gray-50 transition-colors">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/profile" className="rounded-lg p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-50 transition-colors">
            <User className="h-5 w-5" />
          </Link>
        </nav>
      </div>
    </header>
  )
}

function CartIcon() {
  const { totalItems } = useCart()

  return (
    <Link href="/cart" className="relative rounded-lg p-2 text-gray-500 hover:text-orange-500 hover:bg-gray-50 transition-colors">
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </Link>
  )
}

// Mobile bottom nav
export function ShopBottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCart()

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: totalItems },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-lg sm:hidden">
      <div className="grid grid-cols-5">
        {links.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-orange-500' : 'text-gray-400'
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
