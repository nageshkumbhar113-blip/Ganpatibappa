// ============================================================
// lib/utils/tenant.ts
// Read tenant (shop) context inside Server Components and
// Server Actions from the headers set by middleware.
// ============================================================

import { headers } from 'next/headers'

/** Returns the shop_id set by middleware, or null for platform routes. */
export function getShopId(): string | null {
  return headers().get('x-shop-id')
}

/** Returns the shop slug set by middleware. */
export function getShopSlug(): string | null {
  return headers().get('x-shop-slug')
}

/** Returns the original hostname of the request. */
export function getHostname(): string {
  return (
    headers().get('x-hostname') ??
    headers().get('host') ??
    'localhost'
  )
}

/** Returns the shop_id for admin panel routes (set by middleware). */
export function getAdminShopId(): string | null {
  return headers().get('x-admin-shop-id')
}

/** Returns the current user's role from middleware headers. */
export function getUserRole(): string | null {
  return headers().get('x-user-role')
}

/** Returns the current user's id from middleware headers. */
export function getUserId(): string | null {
  return headers().get('x-user-id')
}

/** Returns the real client IP from middleware headers. */
export function getClientIP(): string {
  return headers().get('x-real-ip') ?? '0.0.0.0'
}

/**
 * Builds the full shop URL for the current shop.
 * Used for generating links, OG images, sitemaps.
 */
export function getShopBaseUrl(shopSlug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'ganpatibappa.in'
  return `https://${shopSlug}.${platformDomain}`
}
