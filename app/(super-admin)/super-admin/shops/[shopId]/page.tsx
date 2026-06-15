import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { notFound } from 'next/navigation'
import { SubscriptionBadge } from '@/components/super-admin/SubscriptionBadge'
import { ShopStatusToggle } from '@/components/super-admin/ShopStatusToggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'
import {
  ChevronLeft, Edit, Copy, ArrowRightLeft, HardDrive,
  Phone, MapPin, Globe, Calendar, User
} from 'lucide-react'

async function getShopDetail(shopId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shops')
    .select(
      `*, shop_subscriptions(*, subscription_plans(*)),
       shop_settings(*), cloudinary_settings(id, cloud_name, is_active)`
    )
    .eq('id', shopId)
    .single()

  if (error || !data) return null

  // owner_id references auth.users — look up public.users separately
  let owner = null
  if (data.owner_id) {
    const { data: u } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('id', data.owner_id)
      .single()
    owner = u
  }

  return { ...data, owner }
}

export default async function ShopDetailPage({
  params,
}: {
  params: { shopId: string }
}) {
  await requireSuperAdmin()
  const shop = await getShopDetail(params.shopId)
  if (!shop) notFound()

  const sub = (shop.shop_subscriptions as any[])?.[0]
  const plan = sub?.subscription_plans
  const owner = (shop as any).owner
  const daysLeft = sub?.expires_at
    ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/super-admin/shops"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Shops
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-orange-100 flex items-center justify-center text-2xl">
            🙏
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{shop.name}</h1>
            <p className="text-sm text-gray-500">{shop.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShopStatusToggle shopId={shop.id} currentStatus={shop.status} />
          <Link
            href={`/super-admin/shops/${shop.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Shop Info */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Shop Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Phone} label="WhatsApp" value={shop.whatsapp ?? '—'} />
            <InfoRow icon={MapPin} label="Address" value={shop.address ?? '—'} />
            <InfoRow
              icon={Globe}
              label="Domain"
              value={shop.domain ?? `${shop.slug}.ganpatibappa.in`}
            />
            <InfoRow
              icon={Calendar}
              label="Created"
              value={formatDate(shop.created_at)}
            />
          </CardContent>
        </Card>

        {/* Owner */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={User} label="Name" value={owner?.name ?? '—'} />
            <InfoRow icon={User} label="Email" value={owner?.email ?? '—'} />
            <InfoRow icon={Phone} label="Phone" value={owner?.phone ?? '—'} />
            <InfoRow icon={Calendar} label="Joined" value={owner?.created_at ? formatDate(owner.created_at) : '—'} />
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <SubscriptionBadge
                status={sub?.status ?? 'trial'}
                planName={plan?.display_name}
                daysLeft={daysLeft}
                size="md"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Expires</span>
              <span className="text-sm font-medium">
                {sub?.expires_at ? formatDate(sub.expires_at) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Price</span>
              <span className="text-sm font-medium">
                {plan?.price === 0 ? 'Free' : `₹${plan?.price}/mo`}
              </span>
            </div>
            <Link
              href={`/super-admin/shops/${shop.id}/subscription`}
              className="mt-2 block text-center rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Manage Subscription
            </Link>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <ActionLink
                href={`/super-admin/shops/${shop.id}/backup`}
                icon={HardDrive}
                label="Backup & Clone"
                color="blue"
              />
              <ActionLink
                href={`/super-admin/shops/${shop.id}/transfer`}
                icon={ArrowRightLeft}
                label="Transfer Shop"
                color="purple"
              />
              <ActionLink
                href={`/super-admin/shops/${shop.id}/subscription`}
                icon={Copy}
                label="Change Plan"
                color="green"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function ActionLink({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string
  icon: React.ElementType
  label: string
  color: 'blue' | 'purple' | 'green'
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  }

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center hover:opacity-80 transition-opacity ${colors[color]}`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
