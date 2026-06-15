export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'upi' | 'cash' | 'bank'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
  products?: { name: string; images: string[] }
}

export interface Order {
  id: string
  shop_id: string
  user_id?: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address?: string
  total_amount: number
  advance_amount?: number
  balance_amount?: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_screenshot_url?: string
  status: OrderStatus
  notes?: string
  pickup_date?: string
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface Quotation {
  id: string
  shop_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    unit_price: number
    subtotal: number
  }>
  total_amount: number
  valid_until?: string
  notes?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  created_at: string
}
