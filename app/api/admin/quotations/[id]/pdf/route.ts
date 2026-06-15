import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { generateQuotationPDF } from '@/lib/pdf/quotation'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const hasQuote = await checkFeature(user.shop_id!, 'quotation')
    if (!hasQuote) {
      return NextResponse.json({ error: 'Quotations not available on your plan.' }, { status: 403 })
    }

    const supabase = createClient()

    const [{ data: quotation }, { data: shop }] = await Promise.all([
      supabase
        .from('quotations')
        .select('*')
        .eq('id', params.id)
        .eq('shop_id', user.shop_id!)
        .single(),
      supabase
        .from('shops')
        .select('name, address, whatsapp')
        .eq('id', user.shop_id!)
        .single(),
    ])

    if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const pdfBuffer = generateQuotationPDF(shop, {
      ...quotation,
      items: quotation.items as any[],
    })

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quotation-${quotation.id.substring(0, 8)}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/admin/quotations/[id]/pdf]', error)
    return NextResponse.json({ error: 'Failed to generate quotation PDF' }, { status: 500 })
  }
}
