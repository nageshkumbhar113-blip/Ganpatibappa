export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'
export type PlanInterval = 'monthly' | 'yearly'

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: PlanInterval
  features: string[]
  max_products?: number
  max_staff?: number
  is_active: boolean
}

export interface ShopSubscription {
  id: string
  shop_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_ends_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
  subscription_plans?: SubscriptionPlan
}

export type PlanFeature =
  | 'custom_domain'
  | 'seo_tools'
  | 'analytics'
  | 'staff_accounts'
  | 'cloudinary_storage'
  | 'quotations'
  | 'festival_campaigns'
  | 'two_factor_auth'
  | 'bulk_import'
  | 'whatsapp_notifications'
  | 'email_notifications'
