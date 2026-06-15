import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { generateInvoicePDF } from '@/lib/pdf/invoice'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const hasInvoice = await checkFeature(user.shop_id!, 'pdf_invoice')
    if (!hasInvoice) {
      return NextResponse.json(
        { error: 'PDF Invoice is not available on your current plan.' },
        { status: 403 }
      )
    }

    const supabase = createClient()

    const [{ data: order }, { data: shop }] = await Promise.all([
      supabase
        .from('orders')
        .select('*, order_items(product_name, price, quantity, subtotal)')
        .eq('id', params.id)
        .eq('shop_id', user.shop_id!)
        .single(),
      supabase
        .from('shops')
        .select('name, address, whatsapp, logo_url')
        .eq('id', user.shop_id!)
        .single(),
    ])

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

    const pdfBuffer = generateInvoicePDF({
      shop,
      order,
      items: order.order_items ?? [],
    })

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${order.order_number}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[GET /api/admin/orders/[id]/invoice]', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
