import * as XLSX from 'xlsx'

export interface ImportedProduct {
  name: string
  slug: string
  description?: string
  price: number
  offer_price?: number
  height_cm?: number
  material?: string
  weight_kg?: number
  stock?: number
  is_featured?: boolean
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
}

export interface ImportResult {
  valid: ImportedProduct[]
  errors: Array<{ row: number; message: string }>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200)
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val === 1
  if (typeof val === 'string') return ['yes', 'true', '1', 'y'].includes(val.toLowerCase())
  return false
}

export function parseProductsFromExcel(buffer: Buffer): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]

  const valid: ImportedProduct[] = []
  const errors: Array<{ row: number; message: string }> = []

  rows.forEach((row, index) => {
    const rowNum = index + 2 // 1-indexed + header

    const name = String(row['name'] ?? '').trim()
    const priceRaw = Number(row['price'])
    const offerPriceRaw = row['offer_price'] !== '' ? Number(row['offer_price']) : undefined
    const heightRaw = row['height_cm'] !== '' ? Number(row['height_cm']) : undefined
    const weightRaw = row['weight_kg'] !== '' ? Number(row['weight_kg']) : undefined
    const stockRaw = row['stock'] !== '' ? parseInt(String(row['stock'])) : undefined

    if (!name) {
      errors.push({ row: rowNum, message: 'name is required' })
      return
    }

    if (isNaN(priceRaw) || priceRaw <= 0) {
      errors.push({ row: rowNum, message: 'price must be a positive number' })
      return
    }

    if (offerPriceRaw !== undefined && (isNaN(offerPriceRaw) || offerPriceRaw <= 0)) {
      errors.push({ row: rowNum, message: 'offer_price must be a positive number if provided' })
      return
    }

    const slug = String(row['slug'] ?? '').trim() || slugify(name)

    valid.push({
      name,
      slug,
      description: String(row['description'] ?? '').trim() || undefined,
      price: priceRaw,
      offer_price: offerPriceRaw,
      height_cm: heightRaw && !isNaN(heightRaw) ? heightRaw : undefined,
      material: String(row['material'] ?? '').trim() || undefined,
      weight_kg: weightRaw && !isNaN(weightRaw) ? weightRaw : undefined,
      stock: stockRaw !== undefined && !isNaN(stockRaw) ? stockRaw : 0,
      is_featured: parseBoolean(row['is_featured']),
      seo_title: String(row['seo_title'] ?? '').trim() || undefined,
      seo_description: String(row['seo_description'] ?? '').trim() || undefined,
      seo_keywords: String(row['seo_keywords'] ?? '').trim() || undefined,
    })
  })

  return { valid, errors }
}

/** Generate a template XLSX file for bulk import. */
export function generateImportTemplate(): Buffer {
  const headers = [
    'name', 'slug', 'price', 'offer_price', 'description',
    'height_cm', 'material', 'weight_kg', 'stock', 'is_featured',
    'seo_title', 'seo_description', 'seo_keywords',
  ]

  const example = [
    'Shadu Ganpati 2 feet', 'shadu-ganpati-2-feet', 1500, 1200, 'Beautiful 2ft Shadu clay Ganpati murti',
    60, 'Shadu Clay', 8, 50, 'no',
    'Shadu Ganpati 2 feet | GanpatiBappa', 'Buy 2ft Shadu Ganpati online', 'ganpati murti online pune',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')

  // Column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length, 15) }))

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
