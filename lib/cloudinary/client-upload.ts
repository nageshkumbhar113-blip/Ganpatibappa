const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export type UploadFolder = 'products' | 'gallery' | 'logos' | 'banners' | 'payments' | 'campaigns'

export interface UploadResult {
  url: string
  publicId: string
}

/**
 * Upload image directly from the browser to Cloudinary.
 * Server is only used to sign the request (no image bytes hit the server).
 */
export async function uploadImageDirect(
  file: File,
  folder: UploadFolder = 'products'
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type not allowed. Use JPG, PNG, or WEBP.`)
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File too large. Maximum 10 MB allowed.`)
  }

  // 1. Get upload signature from our server
  const signRes = await fetch(`/api/admin/upload/sign?folder=${folder}`)
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to get upload signature')
  }
  const sign = await signRes.json()

  // 2. Upload directly to Cloudinary — image never touches our server
  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', sign.apiKey)
  fd.append('timestamp', String(sign.timestamp))
  fd.append('signature', sign.signature)
  fd.append('folder', sign.folder)

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: 'POST', body: fd }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    throw new Error(err.error?.message ?? 'Cloudinary upload failed')
  }

  const data = await uploadRes.json()
  return { url: data.secure_url, publicId: data.public_id }
}
