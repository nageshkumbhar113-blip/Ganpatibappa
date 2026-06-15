'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Star, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Review {
  id: string
  reviewer_name: string
  rating: number
  comment?: string
  is_approved: boolean
  created_at: string
  products: { name: string }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  useEffect(() => {
    fetch('/api/admin/reviews')
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setIsLoading(false))
  }, [])

  async function toggleApproval(id: string, current: boolean) {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved: !current }),
    })
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_approved: !current } : r))
      )
      toast.success(current ? 'Review hidden' : 'Review approved')
    }
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review?')) return
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== id))
      toast.success('Review deleted')
    }
  }

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.is_approved
    if (filter === 'approved') return r.is_approved
    return true
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">{reviews.length} total</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No reviews found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-xl border shadow-sm p-4 ${
                review.is_approved ? 'border-gray-100' : 'border-yellow-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{review.reviewer_name}</span>
                    {!review.is_approved && (
                      <span className="rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5">
                        Pending
                      </span>
                    )}
                  </div>
                  {review.products?.name && (
                    <p className="text-xs text-orange-500 mt-0.5">{review.products.name}</p>
                  )}
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{formatDate(review.created_at)}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleApproval(review.id, review.is_approved)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      review.is_approved
                        ? 'text-green-500 hover:bg-green-50'
                        : 'text-gray-300 hover:text-green-500 hover:bg-green-50'
                    }`}
                    title={review.is_approved ? 'Hide review' : 'Approve review'}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="rounded-lg p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
