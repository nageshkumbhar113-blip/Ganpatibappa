export interface Shop {
  id: string
  name: string
  slug: string
  owner_email: string
  owner_name?: string
  owner_phone?: string
  status: 'active' | 'suspended' | 'pending' | 'deleted'
  custom_domain?: string
  logo_url?: string
  banner_url?: string
  created_at: string
  updated_at: string
}

export interface ShopSettings {
  id: string
  shop_id: string
  whatsapp_number?: string
  address?: string
  about_text?: string
  contact_email?: string
  show_prices: boolean
  allow_whatsapp_order: boolean
  show_stock: boolean
  upi_id?: string
  bank_details?: string
  seo_title?: string
  seo_description?: string
  og_image_url?: string
  ga_id?: string
  gsc_code?: string
  fb_pixel_id?: string
  custom_robots?: string
  notify_new_order: boolean
  notify_new_inquiry: boolean
}

export interface ShopSubscription {
  id: string
  shop_id: string
  plan_id: string
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  expires_at?: string
  created_at: string
  subscription_plans?: SubscriptionPlan
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'monthly' | 'yearly'
  features: string[]
}
