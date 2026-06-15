'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Heart, ShoppingCart, MessageCircle, ChevronLeft,
  Star, Share2, Loader2, Plus, Minus,
} from 'lucide-react'
import { formatCurrency, calculateDiscount } from '@/lib/utils/format'
import { useCart } from '@/lib/hooks/useCart'

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { addItem } = useCart()

  const [product, setProduct] = useState<any>(null)
  const [shop, setShop] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [showBookForm, setShowBookForm] = useState(false)
  const [isSubmitting, startTransition] = useTransition()

  // Book Now form
  const [bookForm, setBookForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    pickup_date: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const [productRes, shopRes] = await Promise.all([
        fetch(`/api/shop/products?slug=${params.slug}&limit=1`),
        fetch('/api/shop/info'),
      ])

      if (productRes.ok) {
        const pd = await productRes.json()
        const p = pd.products?.[0]
        setProduct(p)
        if (p) {
          // Track recently viewed
          fetch('/api/shop/recently-viewed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: p.id }),
          }).catch(() => {})

          // Load related products
          if (p.category_id) {
            fetch(`/api/shop/products?category_id=${p.category_id}&limit=4`)
              .then((r) => r.json())
              .then((d) => setRelated(d.products?.filter((rp: any) => rp.id !== p.id).slice(0, 4) ?? []))
              .catch(() => {})
          }

          // Load reviews
          fetch(`/api/shop/reviews?product_id=${p.id}`)
            .then((r) => r.json())
            .then((d) => setReviews(d.reviews ?? []))
            .catch(() => {})

          // Check wishlist
          fetch(`/api/shop/wishlist?product_id=${p.id}`)
            .then((r) => r.json())
            .then((d) => setIsWishlisted(d.isWishlisted ?? false))
            .catch(() => {})
        }
      }

      if (shopRes.ok) {
        const sd = await shopRes.json()
        setShop(sd.shop)
      }

      setIsLoading(false)
    }

    load()
  }, [params.slug])

  async function toggleWishlist() {
    const res = await fetch('/api/shop/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id }),
    })
    if (res.ok) {
      const d = await res.json()
      setIsWishlisted(d.added)
      toast.success(d.added ? 'Added to Wishlist' : 'Removed from Wishlist')
    }
  }

  async function handleAddToCart() {
    if (!product) return
    addItem({
      id: product.id,
      name: product.name,
      price: product.offer_price ?? product.price,
      image: product.images?.[0],
      quantity,
    })
    toast.success('Added to cart')
  }

  async function handleBookNow(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity }],
          ...bookForm,
          total_amount: (product.offer_price ?? product.price) * quantity,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        toast.success(`Order placed! Order #${d.order.order_number}`)
        router.push(`/orders/${d.order.id}`)
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to place order')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
        <span className="text-5xl">🙏</span>
        <p>Product not found</p>
        <Link href="/products" className="text-orange-500 hover:underline text-sm">
          View all products
        </Link>
      </div>
    )
  }

  const discount = product.offer_price ? calculateDiscount(product.price, product.offer_price) : 0
  const images: string[] = product.images ?? []
  const showPrice = shop?.show_prices !== false
  const whatsapp = shop?.whatsapp?.replace(/\D/g, '')
  const waText = encodeURIComponent(
    `Hello, I'm interested in ordering *${product.name}* (${product.height_cm ? product.height_cm + ' cm' : ''}). Please confirm availability.`
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Back */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">{product.name}</h1>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: product.name, url: window.location.href })
            } else {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Link copied!')
            }
          }}
          className="text-gray-500 hover:text-gray-800"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-orange-50">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-8xl">🙏</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? 'border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.categories?.name && (
                <p className="text-sm text-orange-500 mt-1">{product.categories.name}</p>
              )}
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {product.height_cm && (
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="text-xs text-gray-400">Height</p>
                  <p className="font-semibold text-gray-800">{product.height_cm} cm</p>
                </div>
              )}
              {product.material && (
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="text-xs text-gray-400">Material</p>
                  <p className="font-semibold text-gray-800">{product.material}</p>
                </div>
              )}
              {product.weight_kg && (
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="text-xs text-gray-400">Weight</p>
                  <p className="font-semibold text-gray-800">{product.weight_kg} kg</p>
                </div>
              )}
              {product.stock !== null && (
                <div className={`rounded-lg p-3 ${product.stock === 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-xs text-gray-400">Stock</p>
                  <p className={`font-semibold ${product.stock === 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {product.stock === 0 ? 'Out of Stock' : `${product.stock} available`}
                  </p>
                </div>
              )}
            </div>

            {/* Price */}
            {showPrice && (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrency(product.offer_price ?? product.price)}
                </span>
                {product.offer_price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="rounded-full bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Quantity */}
            {product.stock !== 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantity</span>
                <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-8 w-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-8 w-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={toggleWishlist}
                className={`rounded-xl p-3 border transition-colors ${
                  isWishlisted
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'
                }`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>

              {product.stock !== 0 && (
                <>
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => setShowBookForm(true)}
                    className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    Book Now
                  </button>
                </>
              )}
            </div>

            {/* WhatsApp Order */}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-green-500 py-3 text-sm font-semibold text-green-600 hover:bg-green-50 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Order via WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-8 rounded-xl bg-white border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-6 rounded-xl bg-white border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              Reviews ({reviews.length})
            </h2>
            <div className="space-y-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{r.reviewer_name}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">You may also like</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {related.map((rp: any) => (
                <Link
                  key={rp.id}
                  href={`/products/${rp.slug}`}
                  className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-32 bg-orange-50 overflow-hidden">
                    {rp.images?.[0] ? (
                      <img
                        src={rp.images[0]}
                        alt={rp.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-3xl">🙏</div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{rp.name}</p>
                    {showPrice && (
                      <p className="mt-1 text-xs font-bold text-gray-800">
                        {formatCurrency(rp.offer_price ?? rp.price)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Book Now Modal */}
      {showBookForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Book Now — {product.name}</h3>
              <button onClick={() => setShowBookForm(false)} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleBookNow} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Your Name *</label>
                <input
                  required
                  value={bookForm.customer_name}
                  onChange={(e) => setBookForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Ramesh Patil"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={bookForm.customer_phone}
                  onChange={(e) => setBookForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
                <textarea
                  rows={2}
                  value={bookForm.customer_address}
                  onChange={(e) => setBookForm((f) => ({ ...f, customer_address: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  placeholder="Delivery address…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Pickup / Delivery Date</label>
                <input
                  type="date"
                  value={bookForm.pickup_date}
                  onChange={(e) => setBookForm((f) => ({ ...f, pickup_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Special Notes</label>
                <textarea
                  rows={2}
                  value={bookForm.notes}
                  onChange={(e) => setBookForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  placeholder="Any special requirements…"
                />
              </div>

              {showPrice && (
                <div className="rounded-lg bg-orange-50 p-3 flex justify-between text-sm font-semibold">
                  <span>Total ({quantity} item{quantity > 1 ? 's' : ''})</span>
                  <span>{formatCurrency((product.offer_price ?? product.price) * quantity)}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
