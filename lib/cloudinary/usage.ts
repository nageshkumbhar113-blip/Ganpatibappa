import { createAdminClient } from '@/lib/supabase/admin'
import { v2 as cloudinary } from 'cloudinary'

interface CloudinaryCredentials {
  cloud_name: string
  api_key: string
  api_secret: string
}

interface UsageResult {
  storage_bytes: number
  bandwidth_bytes: number
  resources: number
  month_year: string
}

async function getShopCloudinaryCredentials(shopId: string): Promise<CloudinaryCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cloudinary_settings')
    .select('cloud_name, api_key, api_secret')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .single()

  if (!data?.cloud_name) {
    const envCreds = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    }
    if (envCreds.cloud_name && envCreds.api_key && envCreds.api_secret) {
      return envCreds as CloudinaryCredentials
    }
    return null
  }
  return data
}

export async function getCloudinaryUsage(shopId: string): Promise<UsageResult | null> {
  const creds = await getShopCloudinaryCredentials(shopId)
  if (!creds) return null

  cloudinary.config({
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
  })

  try {
    const result = await cloudinary.api.usage()
    const monthYear = new Date().toISOString().slice(0, 7) // YYYY-MM

    const usageData: UsageResult = {
      storage_bytes: result.storage?.usage ?? 0,
      bandwidth_bytes: result.bandwidth?.usage ?? 0,
      resources: result.resources ?? 0,
      month_year: monthYear,
    }

    // Persist to DB for historical tracking
    const supabase = createAdminClient()
    await supabase.from('cloudinary_usage').upsert(
      {
        shop_id: shopId,
        storage_bytes: usageData.storage_bytes,
        bandwidth_bytes: usageData.bandwidth_bytes,
        month_year: monthYear,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_id,month_year' }
    )

    return usageData
  } catch {
    return null
  }
}

export async function getStoredUsageHistory(shopId: string, months = 6) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cloudinary_usage')
    .select('storage_bytes, bandwidth_bytes, month_year, last_updated_at')
    .eq('shop_id', shopId)
    .order('month_year', { ascending: false })
    .limit(months)

  return data ?? []
}
