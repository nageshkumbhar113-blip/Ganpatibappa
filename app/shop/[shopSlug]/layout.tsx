import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ShopNavbar, ShopBottomNav } from '@/components/shop/Navbar'
import { InstallPWA } from '@/components/shop/InstallPWA'
import { ShopProvider } from '@/lib/contexts/shop-context'

interface Props {
  children: React.ReactNode
  params: { shopSlug: string }
}

async function getShop(slug: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('shops')
    .select(
      `id, name, slug, logo_url, banner_url, whatsapp, theme_config, status,
       shop_settings(meta_title, meta_description, show_prices, allow_whatsapp_order),
       pwa_settings(app_name, theme_color, icon_url),
       marketing_settings(google_analytics_id, facebook_pixel_id)`
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shop = await getShop(params.shopSlug)
  if (!shop) return { title: 'Shop Not Found' }

  const settings = (shop.shop_settings as any)?.[0] ?? {}
  const pwa = (shop.pwa_settings as any)?.[0] ?? {}

  return {
    title: {
      default: settings.meta_title ?? `${shop.name} — Ganesh Murti Online`,
      template: `%s | ${shop.name}`,
    },
    description: settings.meta_description ?? `Order Ganesh Murti online from ${shop.name}.`,
    icons: {
      icon: pwa.icon_url ?? '/icons/icon-192x192.png',
      apple: pwa.icon_url ?? '/icons/apple-touch-icon.png',
    },
    themeColor: pwa.theme_color ?? '#ff6b00',
    manifest: `/api/manifest/${shop.slug}`,
  }
}

export default async function ShopLayout({ children, params }: Props) {
  const shop = await getShop(params.shopSlug)
  if (!shop) notFound()

  const marketing = (shop.marketing_settings as any)?.[0] ?? {}
  const pwa = (shop.pwa_settings as any)?.[0] ?? {}

  return (
    <ShopProvider shopSlug={shop.slug}>
      {marketing.google_analytics_id && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${marketing.google_analytics_id}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${marketing.google_analytics_id}');` }} />
        </>
      )}
      {marketing.facebook_pixel_id && (
        <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${marketing.facebook_pixel_id}');fbq('track','PageView');` }} />
      )}
      <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}` }} />
      <style dangerouslySetInnerHTML={{ __html: `:root{--shop-primary:${pwa.theme_color ?? '#ff6b00'}}` }} />
      <ShopNavbar shopName={shop.name} logoUrl={shop.logo_url ?? undefined} />
      <main className="pb-16 sm:pb-0">{children}</main>
      <ShopBottomNav />
      <InstallPWA shopName={shop.name} />
    </ShopProvider>
  )
}
