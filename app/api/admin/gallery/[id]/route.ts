import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { deleteFromCloudinary } from '@/lib/cloudinary/upload'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  const { data: image } = await supabase
    .from('gallery')
    .select('public_id')
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .single()

  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from Cloudinary
  if (image.public_id) {
    await deleteFromCloudinary(user.shop_id!, image.public_id).catch(() => {})
  }

  const { error } = await supabase
    .from('gallery')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
