'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'

interface Banner {
  id: string
  image_url: string
  link_url: string | null
  sort_order: number
}

const MAX_BANNERS = 6

/**
 * Multiple rotating hero banners (a carousel on the storefront), separate
 * from the single legacy banner_url. Mirrors the Gallery page's upload
 * pattern — same direct-to-Cloudinary flow, same grid — since admins are
 * already used to it there.
 */
export function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    fetch('/api/admin/banners')
      .then((r) => r.json())
      .then((d) => setBanners(d.banners ?? []))
      .catch(() => toast.error('Banners load होऊ शकले नाहीत'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (banners.length >= MAX_BANNERS) {
      toast.error(`जास्तीत जास्त ${MAX_BANNERS} banners ठेवता येतात.`)
      return
    }
    setIsUploading(true)

    const { uploadImageDirect } = await import('@/lib/cloudinary/client-upload')
    for (const file of Array.from(files)) {
      if (banners.length >= MAX_BANNERS) break
      let url: string
      try {
        const result = await uploadImageDirect(file, 'banners')
        url = result.url
      } catch (err: any) {
        toast.error(`${file.name}: ${err?.message ?? 'Upload अयशस्वी'}`)
        continue
      }

      const saveRes = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      })
      if (saveRes.ok) {
        const d = await saveRes.json()
        setBanners((prev) => [...prev, d.banner])
      } else {
        const d = await saveRes.json().catch(() => null)
        toast.error(d?.error ?? 'Banner save झाला नाही')
      }
    }

    setIsUploading(false)
    toast.success('Banner upload झाला')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(id: string) {
    if (!confirm('हा banner काढायचा?')) return
    const res = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBanners((prev) => prev.filter((b) => b.id !== id))
      toast.success('Banner काढला')
    } else {
      toast.error('Banner काढता आला नाही')
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Home Banners (Slideshow)</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {banners.length}/{MAX_BANNERS} — homepage वर वरती फिरणारे banners
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading || banners.length >= MAX_BANNERS}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isUploading ? 'Uploading…' : 'Banner टाका'}
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors"
        onClick={() => banners.length < MAX_BANNERS && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
      >
        <Upload className="h-7 w-7 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Drag & drop करा किंवा click करा</p>
        <p className="text-[11px] text-gray-400 mt-1">रुंद फोटो चांगले दिसतात (उदा. 1200×500) — JPG, PNG, WebP</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">अजून banner नाही — वरचंच single banner दिसेल.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {banners.map((b) => (
            <div key={b.id} className="group relative rounded-xl overflow-hidden aspect-[2/1] bg-gray-100">
              <img src={b.image_url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                type="button"
                onClick={() => handleDelete(b.id)}
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
