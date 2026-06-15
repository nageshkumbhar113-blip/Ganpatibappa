'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { slugify } from '@/lib/utils/format'

interface Category {
  id: string
  name: string
}

interface ProductFormData {
  name: string
  slug: string
  category_id: string | null
  description: string
  price: string
  offer_price: string
  height_cm: string
  material: string
  weight_kg: string
  stock: string
  is_featured: boolean
  is_active: boolean
  images: string[]
  seo_title: string
  seo_description: string
  seo_keywords: string
}

interface ProductFormProps {
  categories: Category[]
  initialData?: Partial<ProductFormData> & { id?: string }
  mode: 'create' | 'edit'
}

const DEFAULT_DATA: ProductFormData = {
  name: '',
  slug: '',
  category_id: null,
  description: '',
  price: '',
  offer_price: '',
  height_cm: '',
  material: '',
  weight_kg: '',
  stock: '',
  is_featured: false,
  is_active: true,
  images: [],
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
}

export function ProductForm({ categories, initialData, mode }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [form, setForm] = useState<ProductFormData>({
    ...DEFAULT_DATA,
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleChange(key: keyof ProductFormData, value: string | boolean | string[]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      // Auto-generate slug from name in create mode
      if (key === 'name' && mode === 'create') {
        next.slug = slugify(value as string)
      }
      return next
    })
    if (errors[key]) setErrors((e) => { const next = { ...e }; delete next[key]; return next })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Product name is required'
    if (!form.slug.trim()) errs.slug = 'Slug is required'
    if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = 'Slug: only lowercase letters, numbers, hyphens'
    if (!form.price.trim() || isNaN(Number(form.price)) || Number(form.price) <= 0)
      errs.price = 'Valid price is required'
    if (form.offer_price && (isNaN(Number(form.offer_price)) || Number(form.offer_price) <= 0))
      errs.offer_price = 'Offer price must be a positive number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'products')

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      handleChange('images', [...form.images, url])
      toast.success('Image uploaded')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  function removeImage(idx: number) {
    handleChange('images', form.images.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const payload = {
        ...form,
        price: Number(form.price),
        offer_price: form.offer_price ? Number(form.offer_price) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        stock: form.stock ? parseInt(form.stock) : 0,
        category_id: form.category_id || null,
      }

      const url = mode === 'edit' ? `/api/admin/products/${initialData?.id}` : '/api/admin/products'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(`Product ${mode === 'edit' ? 'updated' : 'created'} successfully!`)
        router.push('/admin/products')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'PLAN_LIMIT_EXCEEDED') {
          toast.error(data.error)
        } else {
          toast.error(data.error ?? 'Failed to save product')
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Information</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Shadu Ganpati 2 Feet"
              className={errors.name ? 'border-red-400' : ''}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL) *</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="shadu-ganpati-2-feet"
              className={errors.slug ? 'border-red-400' : ''}
            />
            {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={form.category_id ?? ''}
            onChange={(e) => handleChange('category_id', e.target.value || null as any)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">— No Category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            placeholder="Describe the murti — height, material, finish, speciality…"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Pricing & Stock</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="price">Price (₹) *</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="1500"
              className={errors.price ? 'border-red-400' : ''}
            />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>

          <div>
            <Label htmlFor="offer_price">Offer Price (₹)</Label>
            <Input
              id="offer_price"
              type="number"
              min="0"
              step="1"
              value={form.offer_price}
              onChange={(e) => handleChange('offer_price', e.target.value)}
              placeholder="1200"
            />
          </div>

          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => handleChange('stock', e.target.value)}
              placeholder="50"
            />
          </div>

          <div>
            <Label htmlFor="height_cm">Height (cm)</Label>
            <Input
              id="height_cm"
              type="number"
              min="0"
              step="0.5"
              value={form.height_cm}
              onChange={(e) => handleChange('height_cm', e.target.value)}
              placeholder="60"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              value={form.material}
              onChange={(e) => handleChange('material', e.target.value)}
              placeholder="Shadu Clay, POP, Marble…"
            />
          </div>

          <div>
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input
              id="weight_kg"
              type="number"
              min="0"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => handleChange('weight_kg', e.target.value)}
              placeholder="8.5"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
            />
            <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => handleChange('is_featured', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
            />
            <span className="text-sm font-medium text-gray-700">Featured (show on home)</span>
          </label>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Images</h2>

        <div className="flex flex-wrap gap-3">
          {form.images.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt={`Product image ${idx + 1}`}
                className="h-24 w-24 rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded text-xs bg-black/60 text-white px-1">Main</span>
              )}
            </div>
          ))}

          {form.images.length < 10 && (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-300 transition-colors">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-300" />
                  <span className="text-xs text-gray-400 mt-1">Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-gray-400">Max 10 images. First image is the main product photo.</p>
      </section>

      {/* SEO */}
      <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">SEO</h2>

        <div>
          <Label htmlFor="seo_title">SEO Title</Label>
          <Input
            id="seo_title"
            value={form.seo_title}
            onChange={(e) => handleChange('seo_title', e.target.value)}
            placeholder="Shadu Ganpati 2 Feet | Best Quality"
            maxLength={200}
          />
        </div>

        <div>
          <Label htmlFor="seo_description">SEO Description</Label>
          <textarea
            id="seo_description"
            value={form.seo_description}
            onChange={(e) => handleChange('seo_description', e.target.value)}
            rows={2}
            placeholder="Buy Shadu Clay Ganpati 2 feet online…"
            maxLength={500}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        <div>
          <Label htmlFor="seo_keywords">Keywords (comma separated)</Label>
          <Input
            id="seo_keywords"
            value={form.seo_keywords}
            onChange={(e) => handleChange('seo_keywords', e.target.value)}
            placeholder="ganpati murti, eco ganesh, shadu clay"
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/products')}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || isUploading}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'edit' ? 'Saving…' : 'Creating…'}
            </>
          ) : (
            mode === 'edit' ? 'Save Changes' : 'Create Product'
          )}
        </Button>
      </div>
    </form>
  )
}
