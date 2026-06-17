'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'

interface GalleryImage {
  id: string
  url: string
  public_id: string
  caption?: string
  sort_order: number
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function loadGallery() {
    fetch('/api/admin/gallery')
      .then((r) => r.json())
      .then((d) => setImages(d.images ?? []))
      .catch(() => toast.error('Failed to load gallery'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadGallery() }, [])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsUploading(true)

    const { uploadImageDirect } = await import('@/lib/cloudinary/client-upload')
    for (const file of Array.from(files)) {
      let url: string, publicId: string
      try {
        const result = await uploadImageDirect(file, 'gallery')
        url = result.url
        publicId = result.publicId
      } catch (err: any) {
        toast.error(`${file.name}: ${err?.message ?? 'Upload failed'}`)
        continue
      }

      const saveRes = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, public_id: publicId }),
      })
      if (saveRes.ok) {
        const d = await saveRes.json()
        setImages((prev) => [d.image, ...prev])
      }
    }

    setIsUploading(false)
    toast.success('Upload complete')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(id: string, publicId: string) {
    if (!confirm('Delete this image?')) return
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setImages((prev) => prev.filter((i) => i.id !== id))
      toast.success('Image deleted')
    } else {
      toast.error('Failed to delete image')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gallery</h1>
          <p className="text-sm text-gray-500">{images.length} images</p>
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
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isUploading ? 'Uploading…' : 'Upload Images'}
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleUpload(e.dataTransfer.files)
        }}
      >
        <Upload className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Drag & drop images or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 10MB each</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No images yet. Upload some to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-xl overflow-hidden aspect-square bg-gray-100">
              <img src={img.url} alt={img.caption ?? ''} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                onClick={() => handleDelete(img.id, img.public_id)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
