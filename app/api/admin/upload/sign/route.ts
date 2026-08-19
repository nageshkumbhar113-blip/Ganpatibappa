import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { handleApiError } from '@/lib/utils/api-error'
import { resolveCloudinaryForUpload, type UploadFolder } from '@/lib/cloudinary/quota'

const VALID_FOLDERS = ['products', 'gallery', 'logos', 'banners', 'payments', 'campaigns'] as const

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user.shop_id) return NextResponse.json({ error: 'No shop' }, { status: 403 })

    const folder = (req.nextUrl.searchParams.get('folder') ?? 'products') as UploadFolder
    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    // Decides which Cloudinary account this shop uploads to, and whether it may
    // at all. Signing is the only server-side step in the upload — the browser
    // posts the bytes straight to Cloudinary — so the quota is enforced here.
    const resolved = await resolveCloudinaryForUpload(user.shop_id, folder)
    if (!resolved.ok) {
      return NextResponse.json(
        {
          error: resolved.message,
          reason: resolved.reason,
          used: resolved.used,
          limit: resolved.limit,
        },
        { status: resolved.reason === 'platform_unconfigured' ? 503 : 409 }
      )
    }

    const { creds } = resolved
    const timestamp = Math.round(Date.now() / 1000)
    const folderPath = `ganpatibappa/${user.shop_id}/${folder}`

    // Only sign folder + timestamp (sorted alphabetically)
    const paramsStr = `folder=${folderPath}&timestamp=${timestamp}`
    const signature = createHash('sha1')
      .update(paramsStr + creds.apiSecret)
      .digest('hex')

    return NextResponse.json({
      cloudName: creds.cloudName,
      apiKey: creds.apiKey,
      signature,
      timestamp,
      folder: folderPath,
      storage: resolved.mode,
      ...(resolved.mode === 'platform'
        ? { used: resolved.used, limit: resolved.limit }
        : {}),
    })
  } catch (error) {
    return handleApiError(error, 'admin/upload/sign')
  }
}
