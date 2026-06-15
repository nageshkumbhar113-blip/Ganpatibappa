export interface Category {
  id: string
  shop_id: string
  name: string
  slug: string
  description?: string
  image_url?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  shop_id: string
  category_id?: string
  name: string
  slug: string
  description?: string
  price: number
  sale_price?: number
  images: string[]
  stock_quantity?: number
  is_active: boolean
  is_featured: boolean
  height_cm?: number
  material?: string
  finish?: string
  weight_kg?: number
  tags: string[]
  created_at: string
  updated_at: string
  categories?: Category
}

export interface Review {
  id: string
  shop_id: string
  product_id: string
  user_id?: string
  customer_name: string
  rating: number
  comment?: string
  is_approved: boolean
  created_at: string
  products?: Pick<Product, 'id' | 'name'>
}
