import * as XLSX from 'xlsx'

interface ExportProduct {
  name: string
  slug: string
  price: number
  offer_price?: number | null
  description?: string | null
  height_cm?: number | null
  material?: string | null
  weight_kg?: number | null
  stock?: number | null
  is_featured?: boolean | null
  is_active?: boolean | null
  created_at?: string
}

interface ExportOrder {
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  advance_amount?: number | null
  balance_amount?: number | null
  status: string
  payment_status: string
  created_at: string
  delivery_date?: string | null
}

/** Export products to XLSX buffer. */
export function exportProductsToExcel(products: ExportProduct[]): Buffer {
  const headers = [
    'Name', 'Slug', 'Price (₹)', 'Offer Price (₹)', 'Description',
    'Height (cm)', 'Material', 'Weight (kg)', 'Stock',
    'Featured', 'Active', 'Created At',
  ]

  const rows = products.map((p) => [
    p.name,
    p.slug,
    p.price,
    p.offer_price ?? '',
    p.description ?? '',
    p.height_cm ?? '',
    p.material ?? '',
    p.weight_kg ?? '',
    p.stock ?? '',
    p.is_featured ? 'Yes' : 'No',
    p.is_active ? 'Yes' : 'No',
    p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '',
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

/** Export orders to XLSX buffer. */
export function exportOrdersToExcel(orders: ExportOrder[]): Buffer {
  const headers = [
    'Order #', 'Customer', 'Phone', 'Total (₹)', 'Advance (₹)',
    'Balance (₹)', 'Status', 'Payment Status', 'Delivery Date', 'Created At',
  ]

  const rows = orders.map((o) => [
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.total_amount,
    o.advance_amount ?? 0,
    o.balance_amount ?? o.total_amount,
    o.status,
    o.payment_status,
    o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('en-IN') : '',
    new Date(o.created_at).toLocaleDateString('en-IN'),
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orders')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

/** Export report data (generic) to XLSX. */
export function exportReportToExcel(
  title: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31))

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
