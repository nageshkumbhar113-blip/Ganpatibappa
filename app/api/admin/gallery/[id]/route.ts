import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()

  // public.gallery has no public_id column (see
  // supabase/migrations/004_communication.sql) -- only id/shop_id/
  // image_url/caption/sort_order/created_at. Selecting it errored on
  // every single call, and because only `{ data: image }` was
  // destructured (the error was discarded), that error silently
  // produced `image: null`, which the `if (!image)` check then read as
  // "doesn't exist" and 404'd -- Delete Gallery Image has never worked,
  // for any shop, regardless of whether the image was real. Deleting
  // the DB row directly (matching how products' delete already leaves
  // Cloudinary cleanup to the retention/GC side, not per-request) fixes
  // it without needing a public_id this table was never given.
  const { data: image } = await supabase
    .from('gallery')
    .select('id')
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .single()

  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('gallery')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
