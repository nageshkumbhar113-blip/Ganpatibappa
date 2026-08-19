'use client'

import { useState } from 'react'
import { Star, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewFormProps {
  shopSlug?: string
  orderId: string
  productId: string
  productName: string
}

/**
 * One product's review form, shown on a delivered order's confirmation
 * page. No login needed — the order_id + this being the order's own
 * confirmation page (unguessable order UUID) is the verification; the
 * API re-checks order/product/status server-side regardless.
 */
export function ReviewForm({ shopSlug, orderId, productId, productName }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  async function submit() {
    if (rating < 1) {
      toast.error('किती स्टार द्यायचे ते निवडा')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/shop/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(shopSlug ? { 'x-shop-slug': shopSlug } : {}),
        },
        body: JSON.stringify({ order_id: orderId, product_id: productId, rating, comment: comment || undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
        toast.success('Review पाठवला — धन्यवाद! 🙏')
      } else if (res.status === 409) {
        setAlreadyReviewed(true)
      } else {
        toast.error(d.error ?? 'Review पाठवता आला नाही')
      }
    } catch {
      toast.error('Review पाठवता आला नाही')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700">
        <Check className="h-3.5 w-3.5" /> {productName} साठी review पाठवला — approval नंतर दिसेल.
      </div>
    )
  }
  if (alreadyReviewed) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-500">
        तुम्ही {productName} साठी आधीच review दिला आहे.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-orange-50/50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">{productName} — कसं वाटलं?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${n} star`}
          >
            <Star className={`h-5 w-5 ${n <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="काही सांगायचंय? (optional)"
        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none bg-white"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
        Review पाठवा
      </button>
    </div>
  )
}
