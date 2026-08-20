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
import { createAdminClient } from '@/lib/supabase/admin'
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

  // Verify the session via the Supabase Auth server (getUser is secure;
  // getSession trusts cookies) -- but lazily. This is a real network round
  // trip to Supabase Auth on every single request, and for a customer
  // browsing a shop's storefront it almost always comes back empty (there
  // is no customer signup/login anywhere in this app), so paying for it
  // unconditionally added latency to the highest-traffic path for a result
  // that gets used, at most, to set an optional x-user-id header. Wrapped
  // in a memoized getter so admin/super-admin/login, which do need a real
  // check, still get one -- exactly once, same as before.
  let sessionPromise: Promise<{ user: { id: string } } | null> | null = null
  function getSession() {
    if (!sessionPromise) {
      sessionPromise = supabase.auth.getUser().then(({ data }) =>
        data.user ? { user: data.user } : null
      )
    }
    return sessionPromise
  }

  // Every shop existence/status lookup below (path-based, subdomain, custom
  // domain) must use a service-role client, not the anon-key `supabase`
  // above. shops_public_read_active's RLS policy is `USING (status =
  // 'active')` — an anonymous visitor's SELECT for a suspended or deleted
  // shop returns zero rows, not a row with that status, so `!shop` was
  // always true and every `shop.status === 'suspended'` / `'deleted'`
  // check below was dead code. A suspended shop showed a bare "shop not
  // found" 404 instead of the intended "temporarily unavailable" message.
  const shopLookup = createAdminClient()

  // ── PATH-BASED SHOP ROUTES: /shop/[shopSlug]/* ──────────────
  // Handles free-tier path routing without needing a custom domain
  if (isPlatformDomain(hostname) && pathname.startsWith('/shop/')) {
    const shopSlug = pathname.split('/')[2]
    if (shopSlug) {
      const { data: shop } = await shopLookup
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
      // x-user-id used to be set here from a session check, but nothing in
      // the app ever reads it (lib/utils/tenant.ts's getUserId() has no
      // callers) -- confirmed via search before removing. Dropping it
      // skips an Auth-server round trip on every single storefront request.

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
      const { data: shop } = await shopLookup
        .from('shops')
        .select('id, status')
        .eq('slug', slugFromHeader)
        .single()

      // A suspended/deleted shop's storefront APIs should keep failing
      // (no x-shop-id set, same as "not found") — only the RLS blind spot
      // that made even *active* shops occasionally look up empty is what
      // needed fixing here.
      if (shop && shop.status === 'active') {
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
      const session = await getSession()
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
      const session = await getSession()
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
      const session = await getSession()
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
    const { data: shop } = await shopLookup
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
    const { data: mapping } = await shopLookup
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
  // x-user-id used to be set here too -- same dead-code situation as the
  // path-based branch above (nothing reads it), and the same Auth-server
  // round trip it required on every subdomain/custom-domain storefront
  // request is gone with it.

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
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
