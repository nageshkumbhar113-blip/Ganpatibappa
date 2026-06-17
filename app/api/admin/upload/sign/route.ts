import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_FOLDERS = ['products', 'gallery', 'logos', 'banners', 'payments', 'campaigns'] as const
type Folder = typeof VALID_FOLDERS[number]

async function getShopCreds(shopId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cloudinary_settings')
    .select('cloud_name, api_key, api_secret, is_active')
    .eq('shop_id', shopId)
    .single()

  if (data?.is_active && data.cloud_name && data.api_key && data.api_secret) {
    return { cloudName: data.cloud_name, apiKey: data.api_key, apiSecret: data.api_secret }
  }

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user.shop_id) return NextResponse.json({ error: 'No shop' }, { status: 403 })

    const folder = (req.nextUrl.searchParams.get('folder') ?? 'products') as Folder
    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    const creds = await getShopCreds(user.shop_id)
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
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
