'use client'

// "My Details" — replaces the old login-gated Profile page. There is no
// customer signup/login anywhere in this app (checkout is guest-only),
// so this is a browser-local, no-account "remember me" for prefilling
// checkout instead of an account profile.

export interface LocalCustomerDetails {
  name: string
  phone: string
  address: string
}

const EMPTY: LocalCustomerDetails = { name: '', phone: '', address: '' }

function storageKey(shopKey: string) {
  return `ganpati_customer_${shopKey}`
}

export function getCustomerDetails(shopKey: string): LocalCustomerDetails {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(storageKey(shopKey))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      address: typeof parsed.address === 'string' ? parsed.address : '',
    }
  } catch {
    return EMPTY
  }
}

export function saveCustomerDetails(shopKey: string, details: Partial<LocalCustomerDetails>) {
  if (typeof window === 'undefined') return
  const current = getCustomerDetails(shopKey)
  localStorage.setItem(storageKey(shopKey), JSON.stringify({ ...current, ...details }))
}
