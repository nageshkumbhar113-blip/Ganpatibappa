// ============================================================
// middleware.ts — Multi-Tenant Routing
//
// Routing logic:
//   platform.in/super-admin  → Super Admin panel (role: super_admin)
//   platform.in/admin        → Admin dashboard (role: admin | staff)
//   platform.in/login        → Login page (public)
//   nagesh.platform.in       → Customer shop "nagesh" (via subdomain)
//   nagesharts.in            → Customer shop via custom domain
//
// Sets request headers consumed by Server Components:
//   x-shop-id        → shop UUID
//   x-shop-slug      → shop slug
//   x-hostname       → original request hostname
//   x-admin-shop-id  → shop UUID for admin panel (from user record)
//   x-user-role      → authenticated user's role
//   x-user-id        → authenticated user's UUID
// ============================================================

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  isPlatformDomain,
  getSubdomain,
  isCustomDomain,
  getRealIP,
} from '@/lib/utils/shop-resolver'
import type { Database } from '@/types/database'

// Paths that always pass through without any DB lookup
const PUBLIC_FILE_REGEX = /^\/(_next\/static|_next\/image|favicon\.ico|sw\.js|icons\/|manifest)/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host')?.split(':')[0] ?? 'localhost'

  // Skip static assets immediately
  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return NextResponse.next()
  }

  // Guard: if Supabase env vars missing, pass through
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  // ── Create Supabase client (refreshes session cookies) ──────
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verify the session via the Supabase Auth server (getUser is secure; getSession trusts cookies)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  // Build a lightweight session-like object so the rest of the middleware can stay unchanged
  const session = authUser ? { user: authUser } : null

  // ── PATH-BASED SHOP ROUTES: /shop/[shopSlug]/* ──────────────
  // Handles free-tier path routing without needing a custom domain
  if (isPlatformDomain(hostname) && pathname.startsWith('/shop/')) {
    const shopSlug = pathname.split('/')[2]
    if (shopSlug) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id, slug, status')
        .eq('slug', shopSlug)
        .single()

      if (!shop || shop.status === 'deleted') {
        return shopNotFound(`Shop "${shopSlug}" not found`)
      }
      if (shop.status === 'suspended') return shopSuspended(shop.slug)

      const reqHeaders = new Headers(request.headers)
      reqHeaders.set('x-shop-id', shop.id)
      reqHeaders.set('x-shop-slug', shop.slug)
      reqHeaders.set('x-hostname', hostname)
      if (session) reqHeaders.set('x-user-id', session.user.id)

      const res = NextResponse.next({ request: { headers: reqHeaders } })
      response.cookies.getAll().forEach(({ name, value }) => res.cookies.set(name, value))
      return res
    }
  }

  // ── API SHOP ROUTES: resolve x-shop-slug header ──────────────
  // Client components send x-shop-slug header; middleware resolves to x-shop-id
  if (isPlatformDomain(hostname) && pathname.startsWith('/api/shop/')) {
    const slugFromHeader = request.headers.get('x-shop-slug')
    if (slugFromHeader) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('slug', slugFromHeader)
        .single()

      if (shop) {
        const reqHeaders = new Headers(request.headers)
        reqHeaders.set('x-shop-id', shop.id)
        return NextResponse.next({ request: { headers: reqHeaders } })
      }
    }
    return response
  }

  // ── PLATFORM DOMAIN ROUTES ───────────────────────────────────
  if (isPlatformDomain(hostname)) {
    // ── Super Admin ──────────────────────────────────────────
    if (pathname.startsWith('/super-admin')) {
      if (!session) {
        return redirectToLogin(request, pathname)
      }

      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (user?.role !== 'super_admin') {
        return redirectToLogin(request, pathname, 'unauthorized')
      }

      const reqHeaders = new Headers(request.headers)
      reqHeaders.set('x-user-id', session.user.id)
      reqHeaders.set('x-user-role', 'super_admin')
      return NextResponse.next({ request: { headers: reqHeaders } })
    }

    // ── Admin Panel ──────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
      if (!session) {
        return redirectToLogin(request, pathname)
      }

      const { data: user } = await supabase
        .from('users')
        .select('role, shop_id, is_active')
        .eq('id', session.user.id)
        .single()

      if (!user || !['admin', 'staff'].includes(user.role) || !user.is_active) {
        return redirectToLogin(request, pathname, 'unauthorized')
      }

      if (!user.shop_id) {
        return redirectToLogin(request, pathname, 'no_shop')
      }

      // Check if shop subscription is active
      const { data: sub } = await supabase
        .from('shop_subscriptions')
        .select('status, expires_at')
        .eq('shop_id', user.shop_id)
        .single()

      const reqHeaders = new Headers(request.headers)
      reqHeaders.set('x-user-id', session.user.id)
      reqHeaders.set('x-user-role', user.role)
      reqHeaders.set('x-admin-shop-id', user.shop_id)
      reqHeaders.set('x-subscription-status', sub?.status ?? 'unknown')
      reqHeaders.set('x-subscription-expires', sub?.expires_at ?? '')

      return NextResponse.next({ request: { headers: reqHeaders } })
    }

    // ── Login page (redirect if already logged in) ───────────
    if (pathname === '/login') {
      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (user?.role === 'super_admin') {
          return NextResponse.redirect(new URL('/super-admin', request.url))
        }
        if (user?.role === 'admin' || user?.role === 'staff') {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
      }
      return response
    }

    // Root redirect → login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // All other platform routes (/api/*, etc.) pass through
    return response
  }

  // ── SHOP ROUTES (subdomain or custom domain) ─────────────────
  const subdomain = getSubdomain(hostname)
  let shopId: string | null = null
  let shopSlug: string | null = null

  if (subdomain) {
    // ── Subdomain lookup ─────────────────────────────────────
    const { data: shop } = await supabase
      .from('shops')
      .select('id, slug, status')
      .eq('subdomain', subdomain)
      .single()

    if (!shop) {
      return shopNotFound(`Shop "${subdomain}" not found`)
    }
    if (shop.status === 'suspended') {
      return shopSuspended(shop.slug)
    }
    if (shop.status === 'deleted') {
      return shopNotFound(`Shop not found`)
    }

    shopId = shop.id
    shopSlug = shop.slug
  } else if (isCustomDomain(hostname)) {
    // ── Custom domain lookup ──────────────────────────────────
    const { data: mapping } = await supabase
      .from('domain_mappings')
      .select('shop_id, shops!inner(id, slug, status)')
      .eq('domain', hostname)
      .eq('dns_verified', true)
      .single()

    if (!mapping) {
      return shopNotFound(`Domain "${hostname}" is not configured`)
    }

    const shop = (mapping as unknown as { shops: { id: string; slug: string; status: string } }).shops

    if (shop.status === 'suspended') return shopSuspended(shop.slug)
    if (shop.status === 'deleted') return shopNotFound('Shop not found')

    shopId = shop.id
    shopSlug = shop.slug
  } else {
    // Unrecognised hostname — fallback to 404
    return shopNotFound('Page not found')
  }

  // ── Set shop context headers ─────────────────────────────────
  const reqHeaders = new Headers(request.headers)
  reqHeaders.set('x-shop-id', shopId)
  reqHeaders.set('x-shop-slug', shopSlug ?? '')
  reqHeaders.set('x-hostname', hostname)
  reqHeaders.set('x-real-ip', getRealIP(request.headers))

  if (session) {
    reqHeaders.set('x-user-id', session.user.id)
  }

  // Re-attach refreshed cookies
  const finalResponse = NextResponse.next({ request: { headers: reqHeaders } })
  response.cookies.getAll().forEach(({ name, value }) => {
    finalResponse.cookies.set(name, value)
  })

  return finalResponse
}

// ── Helpers ──────────────────────────────────────────────────

function redirectToLogin(
  request: NextRequest,
  pathname: string,
  error?: string
): NextResponse {
  const url = new URL('/login', request.url)
  url.searchParams.set('redirect', pathname)
  if (error) url.searchParams.set('error', error)
  return NextResponse.redirect(url)
}

function shopNotFound(message: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem">
      <h1>🙏 404 — Shop Not Found</h1>
      <p>${message}</p>
    </body></html>`,
    {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    }
  )
}

function shopSuspended(slug: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem">
      <h1>🙏 Shop Temporarily Unavailable</h1>
      <p>The shop <strong>${slug}</strong> is currently suspended.</p>
      <p>Please contact the shop owner or try again later.</p>
    </body></html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    }
  )
}

// ── Matcher ──────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static  (Next.js build output)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico, sw.js, icons/, manifest files
     */
    '/((?!_next\\/static|_next\\/image|favicon\\.ico|sw\\.js|icons\\/|manifest).*)',
  ],
}
