import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

async function getGallery() {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('gallery')
    .select('id, url, caption, sort_order')
    .eq('shop_id', shopId)
    .order('sort_order')
    .order('created_at', { ascending: false })

  return data ?? []
}

export default async function GalleryPage() {
  const images = await getGallery()
  if (images === null) notFound()

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Gallery</h1>

        {images.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl">🖼️</span>
            <p className="mt-4">No gallery images yet.</p>
          </div>
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 md:columns-4 space-y-3">
            {images.map((img: any) => (
              <div key={img.id} className="break-inside-avoid rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                <img
                  src={img.url}
                  alt={img.caption ?? ''}
                  className="w-full object-cover"
                  loading="lazy"
                />
                {img.caption && (
                  <p className="text-xs text-gray-500 px-3 py-2">{img.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
