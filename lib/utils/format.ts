// ============================================================
// lib/utils/format.ts
// Shared formatting utilities across the platform
// ============================================================

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

// ── Currency ─────────────────────────────────────────────────

/** Alias for formatPrice — used in admin dashboard and order tables. */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '₹0'
  return formatPrice(amount)
}

export function formatPrice(amount: number, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCompactPrice(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

export function calculateDiscount(price: number, offerPrice: number): number {
  if (price <= 0 || offerPrice >= price) return 0
  return Math.round(((price - offerPrice) / price) * 100)
}

// ── Dates ────────────────────────────────────────────────────

export function formatDate(date: string | Date | null, pattern = 'dd MMM yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, pattern)
}

export function formatDateTime(date: string | Date | null): string {
  return formatDate(date, 'dd MMM yyyy, hh:mm a')
}

export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDateForInput(date: string | Date | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'yyyy-MM-dd')
}

// ── Strings ──────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Numbers ──────────────────────────────────────────────────

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ── Phone ────────────────────────────────────────────────────

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

export function whatsappLink(phone: string, message = ''): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${number}${message ? `?text=${encoded}` : ''}`
}

// ── Order Status ─────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:       'Pending',
  confirmed:     'Confirmed',
  in_production: 'In Production',
  ready:         'Ready for Pickup',
  delivered:     'Delivered',
  cancelled:     'Cancelled',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-800',
  confirmed:     'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  ready:         'bg-green-100 text-green-800',
  delivered:     'bg-emerald-100 text-emerald-800',
  cancelled:     'bg-red-100 text-red-800',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Payment Pending',
  partial: 'Partially Paid',
  paid:    'Fully Paid',
  refunded: 'Refunded',
}

// ── Subscription ─────────────────────────────────────────────

export function getDaysUntilExpiry(expiresAt: string): number {
  const now = new Date()
  const expiry = parseISO(expiresAt)
  const diff = expiry.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isSubscriptionExpiring(expiresAt: string, warningDays = 7): boolean {
  return getDaysUntilExpiry(expiresAt) <= warningDays
}
