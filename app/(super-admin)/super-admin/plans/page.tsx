'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Plan {
  id: string
  name: string
  display_name: string
  price: number
  billing_cycle: 'monthly' | 'yearly' | 'one_time'
  duration_days: number
  max_products: number
  max_staff: number
  is_active: boolean
  features: Record<string, boolean>
}

const FEATURE_LABELS: Record<string, string> = {
  custom_domain: 'Custom Domain',
  bulk_import: 'Bulk Import',
  invoice_pdf: 'Invoice PDF',
  quotation: 'Quotations',
  full_seo: 'Full SEO',
  google_analytics: 'Google Analytics',
  facebook_pixel: 'Facebook Pixel',
  campaigns: 'Festival Campaigns',
  bulk_notifications: 'Bulk Notifications',
  two_fa: '2FA Security',
  ip_restrictions: 'IP Restrictions',
  shop_backup: 'Shop Backup',
  clone_shop: 'Clone Shop',
  reports_excel: 'Excel Reports',
  cloudinary_own: 'Own Cloudinary',
}

function PlanCard({ plan, onSaved }: { plan: Plan; onSaved: (p: Plan) => void }) {
  const [form, setForm] = useState<Plan>(plan)
  const [isSaving, setIsSaving] = useState(false)

  function set<K extends keyof Plan>(key: K, value: Plan[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleFeature(key: string) {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: !f.features[key] } }))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/super-admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          price: Number(form.price),
          billing_cycle: form.billing_cycle,
          duration_days: Number(form.duration_days),
          max_products: Number(form.max_products),
          max_staff: Number(form.max_staff),
          is_active: form.is_active,
          features: form.features,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(`${form.display_name} saved`)
        onSaved(d.plan)
      } else {
        toast.error(d.error ?? 'Failed to save plan')
      }
    } catch {
      toast.error('Failed to save plan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className={`border-0 shadow-sm ${!form.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            {plan.name}
          </CardTitle>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="h-4 w-4"
            />
            Active
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Display Name</Label>
            <Input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price (₹)</Label>
            <Input type="number" min="0" value={form.price} onChange={(e) => set('price', Number(e.target.value) as any)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Billing Cycle</Label>
            <select
              value={form.billing_cycle}
              onChange={(e) => set('billing_cycle', e.target.value as Plan['billing_cycle'])}
              className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duration (days)</Label>
            <Input type="number" min="1" value={form.duration_days} onChange={(e) => set('duration_days', Number(e.target.value) as any)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max Products</Label>
            <Input type="number" value={form.max_products} onChange={(e) => set('max_products', Number(e.target.value) as any)} />
            <p className="text-[10px] text-gray-400">-1 = unlimited</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max Staff</Label>
            <Input type="number" min="0" value={form.max_staff} onChange={(e) => set('max_staff', Number(e.target.value) as any)} />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Features</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
            {Object.keys(FEATURE_LABELS).map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={!!form.features[key]}
                  onChange={() => toggleFeature(key)}
                  className="h-3.5 w-3.5"
                />
                {FEATURE_LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Save {plan.name}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  function load() {
    fetch('/api/super-admin/plans?include_inactive=true')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [])

  function handleSaved(updated: Plan) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-sm text-gray-500">Price, limits आणि features इथून बदला — प्रत्येक shop त्या plan शी लगेच जोडलेला असतो</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSaved={handleSaved} />
        ))}
      </div>
    </div>
  )
}
