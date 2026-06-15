import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { exportProductsToExcel } from '@/lib/excel/export'
import { generateImportTemplate } from '@/lib/excel/import'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const { searchParams } = req.nextUrl
    const isTemplate = searchParams.get('template') === 'true'

    if (isTemplate) {
      const buffer = generateImportTemplate()
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="products-import-template.xlsx"',
        },
      })
    }

    // Check plan feature for export
    const hasExport = await checkFeature(user.shop_id!, 'bulk_import') // same feature flag
    if (!hasExport) {
      return NextResponse.json(
        { error: 'Export is not available on your current plan.' },
        { status: 403 }
      )
    }

    const supabase = createClient()
    const { data: products, error } = await supabase
      .from('products')
      .select('name, slug, price, offer_price, description, height_cm, material, weight_kg, stock, is_featured, is_active, created_at')
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })

    if (error) throw error

    const buffer = exportProductsToExcel(products ?? [])

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="products-export-${Date.now()}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/admin/products/export]', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
