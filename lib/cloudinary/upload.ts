import { v2 as cloudinary } from 'cloudinary'
import { createAdminClient } from '@/lib/supabase/admin'

interface CloudinaryCredentials {
  cloudName: string
  apiKey: string
  apiSecret: string
}

interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
  bytes: number
  format: string
}

/** Get Cloudinary credentials for a specific shop. */
async function getShopCredentials(shopId: string): Promise<CloudinaryCredentials | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cloudinary_settings')
    .select('cloud_name, api_key, api_secret, is_active')
    .eq('shop_id', shopId)
    .single()

  if (!data || !data.is_active) return null

  return {
    cloudName: data.cloud_name,
    apiKey: data.api_key,
    apiSecret: data.api_secret,
  }
}

/** Fall back to shared platform Cloudinary if shop has no own account. */
function getDefaultCredentials(): CloudinaryCredentials {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
  }
}

function configureCloudinary(creds: CloudinaryCredentials) {
  cloudinary.config({
    cloud_name: creds.cloudName,
    api_key: creds.apiKey,
    api_secret: creds.apiSecret,
    secure: true,
  })
}

/** Upload a file buffer to Cloudinary under a shop's folder. */
export async function uploadToCloudinary(
  shopId: string,
  buffer: Buffer,
  folder: 'products' | 'gallery' | 'logos' | 'banners' | 'payments' | 'campaigns',
  options?: {
    publicId?: string
    transformation?: Record<string, unknown>[]
    maxWidth?: number
  }
): Promise<UploadResult> {
  const shopCreds = await getShopCredentials(shopId)
  const creds = shopCreds ?? getDefaultCredentials()
  configureCloudinary(creds)

  const folderPath = `ganpatibappa/${shopId}/${folder}`

  const uploadOptions: Record<string, unknown> = {
    folder: folderPath,
    resource_type: 'image',
    quality: 'auto',
    fetch_format: 'auto',
  }

  if (options?.publicId) uploadOptions.public_id = options.publicId
  if (options?.maxWidth) {
    uploadOptions.transformation = [
      { width: options.maxWidth, crop: 'limit' },
      ...(options.transformation ?? []),
    ]
  } else if (options?.transformation) {
    uploadOptions.transformation = options.transformation
  }

  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
    stream.end(buffer)
  })

  // Update usage tracking
  await updateCloudinaryUsage(shopId, result.bytes)

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  }
}

/** Delete an image from Cloudinary. */
export async function deleteFromCloudinary(shopId: string, publicId: string): Promise<void> {
  const shopCreds = await getShopCredentials(shopId)
  const creds = shopCreds ?? getDefaultCredentials()
  configureCloudinary(creds)

  await cloudinary.uploader.destroy(publicId)
}

/** Increment Cloudinary usage bytes for the shop. */
async function updateCloudinaryUsage(shopId: string, bytes: number): Promise<void> {
  const supabase = createAdminClient()
  const monthYear = new Date().toISOString().substring(0, 7) // YYYY-MM

  // Upsert usage record
  await supabase.rpc('increment_cloudinary_storage', {
    p_shop_id: shopId,
    p_bytes: bytes,
    p_month_year: monthYear,
  })
}

/** Test connection to Cloudinary and return ping result. */
export async function testCloudinaryConnection(shopId: string): Promise<{
  success: boolean
  cloudName?: string
  error?: string
}> {
  const creds = await getShopCredentials(shopId)
  if (!creds) {
    return { success: false, error: 'No Cloudinary credentials configured.' }
  }

  configureCloudinary(creds)

  try {
    const result = await cloudinary.api.ping()
    if (result.status === 'ok') {
      // Update last_tested_at
      const supabase = createAdminClient()
      await supabase
        .from('cloudinary_settings')
        .update({ last_tested_at: new Date().toISOString() })
        .eq('shop_id', shopId)

      return { success: true, cloudName: creds.cloudName }
    }
    return { success: false, error: 'Ping returned unexpected response.' }
  } catch (error: any) {
    return { success: false, error: error?.message ?? 'Connection failed.' }
  }
}

/** Get account usage from Cloudinary API. */
export async function getCloudinaryUsage(shopId: string): Promise<{
  storageMB: number
  bandwidthMB: number
  transformationCount: number
  imageCount: number
} | null> {
  const creds = await getShopCredentials(shopId)
  if (!creds) return null

  configureCloudinary(creds)

  try {
    const usage = await cloudinary.api.usage()
    return {
      storageMB: Math.round(usage.storage?.usage / 1_048_576) ?? 0,
      bandwidthMB: Math.round(usage.bandwidth?.usage / 1_048_576) ?? 0,
      transformationCount: usage.transformations?.usage ?? 0,
      imageCount: usage.resources ?? 0,
    }
  } catch {
    return null
  }
}
