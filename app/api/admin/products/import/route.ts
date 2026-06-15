import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature, canAddProduct } from '@/lib/middleware/plan-guard'
import { parseProductsFromExcel } from '@/lib/excel/import'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    // Check plan feature
    const hasImport = await checkFeature(user.shop_id!, 'bulk_import')
    if (!hasImport) {
      return NextResponse.json(
        { error: 'Bulk import is not available on your current plan. Upgrade to Basic or Premium.' },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only Excel (.xlsx, .xls) and CSV files are supported.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { valid, errors } = parseProductsFromExcel(buffer)

    if (valid.length === 0) {
      return NextResponse.json({
        imported: 0,
        errors,
        message: 'No valid products found in file.',
      })
    }

    // Check plan limit
    const limitCheck = await canAddProduct(user.shop_id!)
    const canImport = limitCheck.limit === -1
      ? valid.length
      : Math.min(valid.length, limitCheck.limit - limitCheck.current)

    if (canImport === 0) {
      return NextResponse.json(
        {
          error: `Product limit reached (${limitCheck.current}/${limitCheck.limit}). Cannot import more.`,
          code: 'PLAN_LIMIT_EXCEEDED',
        },
        { status: 403 }
      )
    }

    const toImport = valid.slice(0, canImport)
    const supabase = createClient()

    // Batch insert (deduplicate slugs within shop)
    const { data: existing } = await supabase
      .from('products')
      .select('slug')
      .eq('shop_id', user.shop_id!)
      .in('slug', toImport.map((p) => p.slug))

    const existingSlugs = new Set(existing?.map((e) => e.slug) ?? [])

    const toInsert = toImport.map((p) => {
      let slug = p.slug
      if (existingSlugs.has(slug)) {
        slug = `${slug}-${Date.now()}`
      }
      return { ...p, shop_id: user.shop_id!, slug }
    })

    const { data: inserted, error } = await supabase
      .from('products')
      .insert(toInsert)
      .select('id')

    if (error) throw error

    const skipped = valid.length - canImport

    return NextResponse.json({
      imported: inserted?.length ?? 0,
      errors,
      skipped,
      message: skipped > 0
        ? `Imported ${inserted?.length ?? 0} products. ${skipped} skipped due to plan limit.`
        : `Successfully imported ${inserted?.length ?? 0} products.`,
    })
  } catch (error: any) {
    console.error('[POST /api/admin/products/import]', error)
    return NextResponse.json({ error: error?.message ?? 'Import failed' }, { status: 500 })
  }
}
