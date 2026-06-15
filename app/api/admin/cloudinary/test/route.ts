import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { testCloudinaryConnection } from '@/lib/cloudinary/upload'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user.shop_id) return NextResponse.json({ error: 'No shop' }, { status: 403 })

    const result = await testCloudinaryConnection(user.shop_id)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
