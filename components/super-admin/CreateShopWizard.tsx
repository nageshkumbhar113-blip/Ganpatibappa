'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Store, User, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Plan {
  id: string
  name: string
  display_name: string
  price: number
  duration_days: number
}

interface CreateShopWizardProps {
  plans: Plan[]
}

type Step = 'shop' | 'owner' | 'plan' | 'review'

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'shop', label: 'Shop Info', icon: Store },
  { key: 'owner', label: 'Owner', icon: User },
  { key: 'plan', label: 'Plan', icon: CreditCard },
  { key: 'review', label: 'Review', icon: CheckCircle },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CreateShopWizard({ plans }: CreateShopWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('shop')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [shopData, setShopData] = useState({
    name: '',
    slug: '',
    whatsapp: '',
    address: '',
  })

  const [ownerData, setOwnerData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '')

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  function validateShop(): boolean {
    const errs: Record<string, string> = {}
    if (!shopData.name.trim()) errs.name = 'Shop name is required'
    if (!shopData.slug.trim()) errs.slug = 'Slug is required'
    if (!/^[a-z0-9-]+$/.test(shopData.slug)) errs.slug = 'Slug: only lowercase letters, numbers, hyphens'
    if (!shopData.whatsapp.trim()) errs.whatsapp = 'WhatsApp number is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateOwner(): boolean {
    const errs: Record<string, string> = {}
    if (!ownerData.name.trim()) errs.ownerName = 'Name is required'
    if (!ownerData.email.trim()) errs.ownerEmail = 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerData.email)) errs.ownerEmail = 'Valid email required'
    if (!ownerData.password.trim()) errs.ownerPassword = 'Password is required'
    if (ownerData.password.length < 8) errs.ownerPassword = 'Password must be at least 8 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goNext() {
    if (step === 'shop' && !validateShop()) return
    if (step === 'owner' && !validateOwner()) return
    const nextIndex = stepIndex + 1
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex].key)
  }

  function goBack() {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) setStep(STEPS[prevIndex].key)
  }

  async function handleSubmit() {
    startTransition(async () => {
      const res = await fetch('/api/super-admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: shopData,
          owner: ownerData,
          planId: selectedPlanId,
        }),
      })

      if (res.ok) {
        const { shopId } = await res.json()
        toast.success(`Shop "${shopData.name}" created successfully!`)
        router.push(`/super-admin/shops/${shopId}`)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to create shop. Please try again.')
      }
    })
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => {
          const isDone = idx < stepIndex
          const isActive = s.key === step

          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isDone ? <CheckCircle className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 ${idx < stepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {/* STEP 1: Shop Info */}
        {step === 'shop' && (
          <>
            <div>
              <Label htmlFor="shopName">Shop Name *</Label>
              <Input
                id="shopName"
                value={shopData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setShopData((d) => ({ ...d, name, slug: slugify(name) }))
                }}
                placeholder="Nagesh Arts Ganpati"
                className={errors.name ? 'border-red-400' : ''}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="shopSlug">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 whitespace-nowrap">ganpatibappa.in/</span>
                <Input
                  id="shopSlug"
                  value={shopData.slug}
                  onChange={(e) => setShopData((d) => ({ ...d, slug: slugify(e.target.value) }))}
                  placeholder="nagesh-arts"
                  className={errors.slug ? 'border-red-400' : ''}
                />
              </div>
              {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
            </div>

            <div>
              <Label htmlFor="whatsapp">WhatsApp Number *</Label>
              <Input
                id="whatsapp"
                value={shopData.whatsapp}
                onChange={(e) => setShopData((d) => ({ ...d, whatsapp: e.target.value }))}
                placeholder="+919876543210"
                className={errors.whatsapp ? 'border-red-400' : ''}
              />
              {errors.whatsapp && <p className="text-xs text-red-500 mt-1">{errors.whatsapp}</p>}
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={shopData.address}
                onChange={(e) => setShopData((d) => ({ ...d, address: e.target.value }))}
                placeholder="Pune, Maharashtra"
              />
            </div>
          </>
        )}

        {/* STEP 2: Owner */}
        {step === 'owner' && (
          <>
            <div>
              <Label htmlFor="ownerName">Owner Name *</Label>
              <Input
                id="ownerName"
                value={ownerData.name}
                onChange={(e) => setOwnerData((d) => ({ ...d, name: e.target.value }))}
                placeholder="Nagesh Sharma"
                className={errors.ownerName ? 'border-red-400' : ''}
              />
              {errors.ownerName && <p className="text-xs text-red-500 mt-1">{errors.ownerName}</p>}
            </div>

            <div>
              <Label htmlFor="ownerEmail">Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={ownerData.email}
                onChange={(e) => setOwnerData((d) => ({ ...d, email: e.target.value }))}
                placeholder="nagesh@example.com"
                className={errors.ownerEmail ? 'border-red-400' : ''}
              />
              {errors.ownerEmail && <p className="text-xs text-red-500 mt-1">{errors.ownerEmail}</p>}
            </div>

            <div>
              <Label htmlFor="ownerPhone">Phone</Label>
              <Input
                id="ownerPhone"
                value={ownerData.phone}
                onChange={(e) => setOwnerData((d) => ({ ...d, phone: e.target.value }))}
                placeholder="+919876543210"
              />
            </div>

            <div>
              <Label htmlFor="ownerPassword">Password *</Label>
              <Input
                id="ownerPassword"
                type="password"
                value={ownerData.password}
                onChange={(e) => setOwnerData((d) => ({ ...d, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                className={errors.ownerPassword ? 'border-red-400' : ''}
              />
              {errors.ownerPassword && <p className="text-xs text-red-500 mt-1">{errors.ownerPassword}</p>}
            </div>
          </>
        )}

        {/* STEP 3: Plan */}
        {step === 'plan' && (
          <div className="space-y-3">
            {plans.map((plan) => (
              <label
                key={plan.id}
                htmlFor={`plan-${plan.id}`}
                className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-colors ${
                  selectedPlanId === plan.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id={`plan-${plan.id}`}
                    name="plan"
                    value={plan.id}
                    checked={selectedPlanId === plan.id}
                    onChange={() => setSelectedPlanId(plan.id)}
                    className="h-4 w-4 text-orange-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{plan.display_name}</p>
                    <p className="text-xs text-gray-400">{plan.duration_days} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                  </p>
                  {plan.price > 0 && <p className="text-xs text-gray-400">/month</p>}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 divide-y divide-gray-200">
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Shop</p>
                <p className="font-medium text-gray-900 mt-0.5">{shopData.name}</p>
                <p className="text-sm text-gray-500">/{shopData.slug} · {shopData.whatsapp}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Owner</p>
                <p className="font-medium text-gray-900 mt-0.5">{ownerData.name}</p>
                <p className="text-sm text-gray-500">{ownerData.email}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Plan</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {selectedPlan?.display_name ?? 'Free Trial'}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedPlan?.price === 0 ? 'Free' : `₹${selectedPlan?.price}/mo`} ·{' '}
                  {selectedPlan?.duration_days} days
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 'shop' || isPending}
        >
          Back
        </Button>

        {step !== 'review' ? (
          <Button type="button" onClick={goNext} className="bg-orange-500 hover:bg-orange-600">
            Continue →
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Shop'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
