'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  image_url?: string
  is_active: boolean
  sort_order: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ name: '', slug: '', image_url: '', sort_order: '0' })

  function loadCategories() {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadCategories() }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', slug: '', image_url: '', sort_order: '0' })
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      slug: cat.slug,
      image_url: cat.image_url ?? '',
      sort_order: String(cat.sort_order),
    })
    setShowForm(true)
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || autoSlug(form.name),
          image_url: form.image_url || undefined,
          sort_order: parseInt(form.sort_order),
        }),
      })
      if (res.ok) {
        toast.success(editingId ? 'Category updated' : 'Category created')
        setShowForm(false)
        loadCategories()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save category')
      }
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Category deleted')
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } else {
      toast.error('Failed to delete category')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{categories.length} categories</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No categories yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Slug</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Sort</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Active</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-lg">🙏</div>
                      )}
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{cat.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="rounded-md p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="rounded-md p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingId ? 'Edit Category' : 'New Category'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : autoSlug(name) }))
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Eco-Friendly Murtis"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Slug *</label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                  placeholder="eco-friendly-murtis"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Image URL</label>
                <input
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
