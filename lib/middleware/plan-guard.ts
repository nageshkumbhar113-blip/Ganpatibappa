// ============================================================
// lib/middleware/plan-guard.ts
// Checks subscription plan features and limits
// Used in admin pages and API routes
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanFeatures } from '@/types/database'

export type FeatureKey = keyof PlanFeatures

/** Check if a shop has access to a specific feature. */
export async function checkFeature(shopId: string, feature: FeatureKey): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase.rpc('shop_has_feature', {
    p_shop_id: shopId,
    p_feature: feature,
  })
  return data ?? false
}

/** Get product count limit for a shop. -1 means unlimited. */
export async function getProductLimit(shopId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_plan_product_limit', { p_shop_id: shopId })
  return data ?? 10
}

/** Check if shop can add more products. */
export async function canAddProduct(shopId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
}> {
  const supabase = createClient()
  const adminClient = createAdminClient()

  const [limitResult, countResult] = await Promise.all([
    supabase.rpc('get_plan_product_limit', { p_shop_id: shopId }),
    adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId),
  ])

  const limit = limitResult.data ?? 10
  const current = countResult.count ?? 0

  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
  }
}

/** Check if shop can add more staff. */
export async function canAddStaff(shopId: string): Promise<{
  allowed: boolean
  current: number
  limit: number
}> {
  const supabase = createClient()

  const subResult = await supabase
    .from('shop_subscriptions')
    .select('plan_id, subscription_plans(max_staff)')
    .eq('shop_id', shopId)
    .single()

  const limit =
    (subResult.data?.subscription_plans as { max_staff: number } | null)?.max_staff ?? 0

  const { count: current } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('is_active', true)

  return {
    allowed: limit === -1 || (current ?? 0) < limit,
    current: current ?? 0,
    limit,
  }
}

/** Get full plan features for a shop. */
export async function getShopPlanFeatures(shopId: string): Promise<Partial<PlanFeatures>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('shop_subscriptions')
    .select('subscription_plans(features)')
    .eq('shop_id', shopId)
    .single()

  const features =
    (data?.subscription_plans as { features: Partial<PlanFeatures> } | null)?.features ?? {}
  return features
}

/** Get subscription status for a shop. */
export async function getSubscriptionStatus(shopId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('shop_subscriptions')
    .select(
      `id, status, expires_at, started_at,
       subscription_plans(name, display_name, price, max_products, max_staff, features)`
    )
    .eq('shop_id', shopId)
    .single()

  return data
}
