import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getAboutData() {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('shops')
    .select(`
      name, logo_url, whatsapp, address,
      shop_settings(about_text, contact_email)
    `)
    .eq('id', shopId)
    .eq('status', 'active')
    .single()

  return data
}

export default async function AboutPage() {
  const shop = await getAboutData()
  if (!shop) notFound()

  const settings = (shop.shop_settings as any)?.[0] ?? {}

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Shop identity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="h-16 w-16 rounded-2xl object-cover shadow" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl">🙏</div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
            <p className="text-sm text-orange-500 mt-0.5">Ganesh Murti Online Order</p>
          </div>
        </div>

        {/* About text */}
        {settings.about_text && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">About Us</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{settings.about_text}</p>
          </div>
        )}

        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="text-base font-bold text-gray-900">Contact Information</h2>

          {shop.whatsapp && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                <span className="text-green-500 text-lg">📞</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">WhatsApp</p>
                <a
                  href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-green-600 hover:underline"
                >
                  {shop.whatsapp}
                </a>
              </div>
            </div>
          )}

          {settings.contact_email && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="text-blue-500 text-lg">✉️</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {settings.contact_email}
                </a>
              </div>
            </div>
          )}

          {shop.address && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <span className="text-orange-500 text-lg">📍</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-sm text-gray-700">{shop.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          <Link
            href="/products"
            className="flex-1 text-center rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
          >
            Browse Products
          </Link>
          <Link
            href="/contact"
            className="flex-1 text-center rounded-xl border-2 border-orange-500 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
