// ============================================================
// lib/utils/shop-resolver.ts
// Resolves shop from hostname in middleware (Edge runtime)
// ============================================================

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'ganpatibappa.in'

/**
 * Returns true if the hostname belongs to the platform itself
 * (not a customer shop subdomain or custom domain).
 */
export function isPlatformDomain(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0] // strip port
  return (
    h === PLATFORM_DOMAIN ||
    h === `www.${PLATFORM_DOMAIN}` ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.vercel.app') ||
    h.endsWith('.netlify.app')
  )
}

/**
 * Extracts the subdomain from a hostname.
 * nagesh.ganpatibappa.in → "nagesh"
 * ganpatibappa.in        → null
 * nagesharts.in          → null (custom domain)
 * localhost              → null
 */
export function getSubdomain(hostname: string): string | null {
  const h = hostname.toLowerCase().split(':')[0] // strip port

  // Localhost — no subdomains
  if (h === 'localhost' || h === '127.0.0.1') return null

  const platformParts = PLATFORM_DOMAIN.split('.')

  // e.g. nagesh.ganpatibappa.in → ["nagesh", "ganpatibappa", "in"]
  const parts = h.split('.')

  // Must have exactly one more part than the platform domain
  if (parts.length !== platformParts.length + 1) return null

  // Ensure the suffix matches the platform domain
  const suffix = parts.slice(1).join('.')
  if (suffix !== PLATFORM_DOMAIN) return null

  const sub = parts[0]

  // Skip reserved subdomains
  const reserved = ['www', 'admin', 'super-admin', 'api', 'mail', 'smtp']
  if (reserved.includes(sub)) return null

  return sub
}

/**
 * Checks if the hostname is a custom domain (not a platform subdomain).
 * nagesharts.in → true
 * nagesh.ganpatibappa.in → false
 * ganpatibappa.in → false
 */
export function isCustomDomain(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0]
  if (isPlatformDomain(h)) return false
  if (getSubdomain(h) !== null) return false
  return true
}

/**
 * Extracts the real IP from common proxy headers.
 * Used for rate limiting and audit logs.
 */
export function getRealIP(
  headers: Headers | Record<string, string | string[] | undefined>
): string {
  const get = (key: string): string | null => {
    if (headers instanceof Headers) return headers.get(key)
    const v = (headers as Record<string, string | string[] | undefined>)[key]
    return Array.isArray(v) ? v[0] : v ?? null
  }

  return (
    get('x-real-ip') ??
    get('x-forwarded-for')?.split(',')[0].trim() ??
    get('cf-connecting-ip') ??
    '0.0.0.0'
  )
}
