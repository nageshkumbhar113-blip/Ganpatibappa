// ============================================================
// lib/middleware/auth-guard.ts
// Server-side auth helpers for Server Components + API routes
// Use these in page.tsx and route.ts files to protect access
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User, Staff, StaffPermissions } from '@/types/database'

/** Require any authenticated user. Redirects to /login if not. */
export async function requireAuth(): Promise<User> {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user || !user.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  return user
}

/** Require super_admin role. */
export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth()
  if (user.role !== 'super_admin') redirect('/login?error=unauthorized')
  return user
}

/** Require admin or staff role. */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
  if (!['admin', 'staff'].includes(user.role)) redirect('/login?error=unauthorized')
  if (!user.shop_id) redirect('/login?error=no_shop')
  return user
}

/** Require admin (not staff) role. */
export async function requireShopOwner(): Promise<User> {
  const user = await requireAuth()
  if (user.role !== 'admin') redirect('/login?error=unauthorized')
  if (!user.shop_id) redirect('/login?error=no_shop')
  return user
}

/** Require staff permission for a specific feature. */
export async function requireStaffPermission(
  permission: keyof StaffPermissions
): Promise<{ user: User; staff: Staff | null }> {
  const user = await requireAdmin()

  // Admin always has all permissions
  if (user.role === 'admin') {
    return { user, staff: null }
  }

  // Staff: check specific permission
  const supabase = createClient()
  const { data: staffRecord } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', user.id)
    .eq('shop_id', user.shop_id!)
    .eq('is_active', true)
    .single()

  if (!staffRecord) redirect('/admin?error=no_staff_record')

  const perms = staffRecord.permissions as StaffPermissions
  if (!perms[permission]) redirect('/admin?error=permission_denied')

  return { user, staff: staffRecord }
}

/** Get current session user without redirecting. Returns null if not authenticated. */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) return null

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    return user ?? null
  } catch {
    return null
  }
}
