import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const [
    { count: totalShops },
    { count: activeShops },
    { count: totalOrders },
    { count: totalProducts },
    { count: totalCustomers },
    { count: totalGalleryImages },
    { count: totalReviews },
  ] = await Promise.all([
    supabase.from('shops').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('gallery').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    stats: {
      totalShops: totalShops ?? 0,
      activeShops: activeShops ?? 0,
      totalOrders: totalOrders ?? 0,
      totalProducts: totalProducts ?? 0,
      totalCustomers: totalCustomers ?? 0,
      totalGalleryImages: totalGalleryImages ?? 0,
      totalReviews: totalReviews ?? 0,
    },
  })
}
