import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { uploadToCloudinary } from '@/lib/cloudinary/upload'
import { z } from 'zod'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

const FolderSchema = z.enum(['products', 'gallery', 'logos', 'banners', 'payments', 'campaigns'])

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user.shop_id) {
      return NextResponse.json({ error: 'No shop associated' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folderParam = formData.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum ${MAX_SIZE_MB}MB allowed.` },
        { status: 400 }
      )
    }

    // Validate folder
    const folderResult = FolderSchema.safeParse(folderParam ?? 'products')
    if (!folderResult.success) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudinary
    const result = await uploadToCloudinary(user.shop_id, buffer, folderResult.data, {
      maxWidth: folderResult.data === 'products' ? 1200 : 2000,
    })

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    })
  } catch (error: any) {
    console.error('[POST /api/admin/upload]', error)
    return NextResponse.json(
      { error: error?.message ?? 'Upload failed' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
