import { createAdminClient } from '@/lib/supabase/admin'
import { checkFeature } from '@/lib/middleware/plan-guard'

/**
 * How many images a shop on the shared platform Cloudinary account may store.
 *
 * Plans where `cloudinary_own` is true (Basic, Premium) bring their own
 * Cloudinary account and are not capped — their storage is their own bill.
 * Trial shops upload into the platform's account, so they get a small
 * allowance: enough to set up a real-looking shop and see it working, not
 * enough to run a catalogue on someone else's storage.
 */
export const PLATFORM_IMAGE_LIMIT = 4

export type UploadFolder =
  | 'products'
  | 'gallery'
  | 'logos'
  | 'banners'
  | 'payments'
  | 'campaigns'

/**
 * Customer-supplied uploads must never be blocked by the vendor's allowance —
 * a trial shop that hits its cap must still be able to take orders, and the
 * payment screenshot is part of checkout.
 */
const EXEMPT_FOLDERS: ReadonlySet<UploadFolder> = new Set<UploadFolder>(['payments'])

export interface CloudinaryCredentials {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export type CloudinaryResolution =
  | { ok: true; creds: CloudinaryCredentials; mode: 'own' }
  | { ok: true; creds: CloudinaryCredentials; mode: 'platform'; used: number; limit: number }
  | { ok: false; reason: 'own_required' | 'platform_unconfigured' | 'limit_reached'; message: string; used?: number; limit?: number }

/**
 * The shop's OWN Cloudinary credentials, with no platform fallback.
 * Connection tests and usage reporting must use this: falling back to the
 * shared platform account would test/report the platform owner's account and
 * show its aggregate usage to an unrelated vendor.
 */
export async function getOwnCredentials(shopId: string): Promise<CloudinaryCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cloudinary_settings')
    .select('cloud_name, api_key, api_secret, is_active')
    .eq('shop_id', shopId)
    .single()

  if (!data?.is_active || !data.cloud_name || !data.api_key || !data.api_secret) return null

  return { cloudName: data.cloud_name, apiKey: data.api_key, apiSecret: data.api_secret }
}

function getPlatformCredentials(): CloudinaryCredentials | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

/**
 * Count the images this shop has stored, across every place a vendor upload
 * can land. Queried sequentially on purpose: concurrent requests to the
 * Supabase REST endpoint from one serverless invocation have been observed to
 * intermittently drop a result, and undercounting here would hand out free
 * storage.
 */
export async function countShopMedia(shopId: string): Promise<number> {
  const supabase = createAdminClient()
  let total = 0

  const { data: shop } = await supabase
    .from('shops')
    .select('logo_url, banner_url')
    .eq('id', shopId)
    .single()
  if (shop?.logo_url) total += 1
  if (shop?.banner_url) total += 1

  const { data: products } = await supabase
    .from('products')
    .select('images, og_image_url')
    .eq('shop_id', shopId)
  for (const p of products ?? []) {
    total += (p.images ?? []).length
    if (p.og_image_url) total += 1
  }

  const { count: galleryCount } = await supabase
    .from('gallery')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
  total += galleryCount ?? 0

  const { count: categoryCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .not('image_url', 'is', null)
  total += categoryCount ?? 0

  const { count: campaignCount } = await supabase
    .from('festival_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .not('image_url', 'is', null)
  total += campaignCount ?? 0

  return total
}

/**
 * Decide which Cloudinary account this shop's next upload should go to, and
 * whether it is allowed at all.
 *
 * - Shop has its own account configured  → use it, uncapped.
 * - Plan grants `cloudinary_own` but none configured → refuse, and say so:
 *   a paying shop should not silently spend the platform's storage.
 * - Otherwise (trial) → shared platform account, capped at
 *   PLATFORM_IMAGE_LIMIT, except for customer-side folders.
 */
export async function resolveCloudinaryForUpload(
  shopId: string,
  folder: UploadFolder
): Promise<CloudinaryResolution> {
  const own = await getOwnCredentials(shopId)
  if (own) return { ok: true, creds: own, mode: 'own' }

  const allowsOwn = await checkFeature(shopId, 'cloudinary_own')
  if (allowsOwn) {
    return {
      ok: false,
      reason: 'own_required',
      message:
        'Your plan uses your own Cloudinary account. Add your Cloudinary credentials under Media Storage before uploading images.',
    }
  }

  const platform = getPlatformCredentials()
  if (!platform) {
    return {
      ok: false,
      reason: 'platform_unconfigured',
      message: 'Image uploads are temporarily unavailable. Please try again later.',
    }
  }

  if (EXEMPT_FOLDERS.has(folder)) {
    return { ok: true, creds: platform, mode: 'platform', used: 0, limit: PLATFORM_IMAGE_LIMIT }
  }

  const used = await countShopMedia(shopId)
  if (used >= PLATFORM_IMAGE_LIMIT) {
    return {
      ok: false,
      reason: 'limit_reached',
      used,
      limit: PLATFORM_IMAGE_LIMIT,
      message: `Free trial shops can store up to ${PLATFORM_IMAGE_LIMIT} images (${used} used). Upgrade to Basic or Premium and connect your own Cloudinary account for unlimited images.`,
    }
  }

  return { ok: true, creds: platform, mode: 'platform', used, limit: PLATFORM_IMAGE_LIMIT }
}
