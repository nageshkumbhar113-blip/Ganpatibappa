import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { uploadToCloudinary } from '@/lib/cloudinary/upload'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG/PNG/WEBP allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const result = await uploadToCloudinary(shopId, buffer, 'payments', { maxWidth: 1600 })
    return NextResponse.json({ url: result.url, publicId: result.publicId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
