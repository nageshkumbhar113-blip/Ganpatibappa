'use client'

// Wishlist has no server-side identity to hang off of — there is no
// customer signup/login anywhere in this app (checkout is guest-only),
// and the previous server-backed wishlist required auth on every write,
// so it silently 401'd for every real visitor. A browser-local wishlist
// needs no account and just works.
//
// `shopKey` scopes storage per shop so one browser doesn't merge
// wishlists across different shops (matters on the path-routed
// /shop/[slug] tree, which shares one hostname for every shop).

function storageKey(shopKey: string) {
  return `ganpati_wishlist_${shopKey}`
}

function safeParse(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function getWishlistIds(shopKey: string): string[] {
  if (typeof window === 'undefined') return []
  return safeParse(localStorage.getItem(storageKey(shopKey)))
}

export function isWishlisted(shopKey: string, productId: string): boolean {
  return getWishlistIds(shopKey).includes(productId)
}

/** Adds/removes the product and returns { added, ids }. */
export function toggleWishlist(shopKey: string, productId: string): { added: boolean; ids: string[] } {
  const current = getWishlistIds(shopKey)
  const has = current.includes(productId)
  const next = has ? current.filter((id) => id !== productId) : [...current, productId]
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(shopKey), JSON.stringify(next))
  }
  return { added: !has, ids: next }
}

export function removeFromWishlist(shopKey: string, productId: string): string[] {
  const next = getWishlistIds(shopKey).filter((id) => id !== productId)
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(shopKey), JSON.stringify(next))
  }
  return next
}
