'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Shop, ShopSettings, PwaSettings } from '@/types/database'

interface ShopData {
  shop: Shop | null
  settings: ShopSettings | null
  pwa: PwaSettings | null
  isLoading: boolean
}

// Client-side hook to get shop data from Supabase
// Used in customer-facing shop pages
export function useShop(shopId: string | null): ShopData {
  const [data, setData] = useState<ShopData>({
    shop: null,
    settings: null,
    pwa: null,
    isLoading: true,
  })

  useEffect(() => {
    if (!shopId) {
      setData((d) => ({ ...d, isLoading: false }))
      return
    }

    const supabase = createClient()

    async function fetchShop() {
      const [shopRes, settingsRes, pwaRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId!).single(),
        supabase.from('shop_settings').select('*').eq('shop_id', shopId!).single(),
        supabase.from('pwa_settings').select('*').eq('shop_id', shopId!).single(),
      ])

      setData({
        shop: shopRes.data,
        settings: settingsRes.data,
        pwa: pwaRes.data,
        isLoading: false,
      })
    }

    fetchShop()
  }, [shopId])

  return data
}
