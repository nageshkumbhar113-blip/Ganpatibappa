'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanFeatures } from '@/types/database'

interface PlanData {
  planName: 'trial' | 'basic' | 'premium' | null
  features: Partial<PlanFeatures>
  expiresAt: string | null
  status: string | null
  daysLeft: number | null
  isLoading: boolean
}

export function usePlan(shopId: string | null): PlanData {
  const [data, setData] = useState<PlanData>({
    planName: null,
    features: {},
    expiresAt: null,
    status: null,
    daysLeft: null,
    isLoading: true,
  })

  useEffect(() => {
    if (!shopId) {
      setData((d) => ({ ...d, isLoading: false }))
      return
    }

    const supabase = createClient()

    async function fetchPlan() {
      const { data: sub } = await supabase
        .from('shop_subscriptions')
        .select('status, expires_at, subscription_plans(name, features)')
        .eq('shop_id', shopId!)
        .single()

      if (!sub) {
        setData((d) => ({ ...d, isLoading: false }))
        return
      }

      const plan = sub.subscription_plans as { name: string; features: Partial<PlanFeatures> } | null
      const expiresAt = sub.expires_at
      const daysLeft = expiresAt
        ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
        : null

      setData({
        planName: (plan?.name as PlanData['planName']) ?? null,
        features: plan?.features ?? {},
        expiresAt,
        status: sub.status,
        daysLeft,
        isLoading: false,
      })
    }

    fetchPlan()
  }, [shopId])

  return data
}

/** Check if a specific feature is available in the plan */
export function useFeature(planData: PlanData, feature: keyof PlanFeatures): boolean {
  return planData.features[feature] ?? false
}
