import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface InvoiceShop {
  name: string
  address?: string | null
  whatsapp?: string | null
  logo_url?: string | null
}

interface InvoiceOrder {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address?: string | null
  total_amount: number
  advance_amount?: number | null
  balance_amount?: number | null
  payment_method?: string | null
  payment_status: string
  delivery_date?: string | null
  created_at: string
  notes?: string | null
}

interface InvoiceItem {
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

interface GenerateInvoiceOptions {
  shop: InvoiceShop
  order: InvoiceOrder
  items: InvoiceItem[]
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function generateInvoicePDF({ shop, order, items }: GenerateInvoiceOptions): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const orange = [255, 107, 0] as [number, number, number]
  const darkGray = [30, 30, 30] as [number, number, number]
  const lightGray = [200, 200, 200] as [number, number, number]

  // Header background
  doc.setFillColor(...orange)
  doc.rect(0, 0, 210, 40, 'F')

  // Shop name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text(shop.name, 14, 18)

  // Invoice label
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('INVOICE', 196, 18, { align: 'right' })

  // Shop details below header
  doc.setTextColor(...darkGray)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let y = 50

  if (shop.address) doc.text(shop.address, 14, y), (y += 5)
  if (shop.whatsapp) doc.text(`WhatsApp: ${shop.whatsapp}`, 14, y), (y += 5)

  // Order info (right side)
  const rightX = 140
  doc.setFont('helvetica', 'bold')
  doc.text('Order Number:', rightX, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${order.order_number}`, 196, 50, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('Date:', rightX, 56)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(order.created_at), 196, 56, { align: 'right' })

  if (order.delivery_date) {
    doc.setFont('helvetica', 'bold')
    doc.text('Delivery:', rightX, 62)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(order.delivery_date), 196, 62, { align: 'right' })
  }

  // Divider
  y = 72
  doc.setDrawColor(...lightGray)
  doc.line(14, y, 196, y)
  y += 8

  // Customer info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Bill To:', 14, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(order.customer_name, 14, y)
  y += 5
  doc.text(order.customer_phone, 14, y)
  y += 5
  if (order.customer_address) {
    const addrLines = doc.splitTextToSize(order.customer_address, 80)
    doc.text(addrLines, 14, y)
    y += addrLines.length * 5
  }

  y += 6

  // Items table
  autoTable(doc, {
    startY: y,
    head: [['#', 'Product', 'Price', 'Qty', 'Subtotal']],
    body: items.map((item, idx) => [
      idx + 1,
      item.product_name,
      formatCurrency(item.price),
      item.quantity,
      formatCurrency(item.subtotal),
    ]),
    headStyles: {
      fillColor: orange,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: 'right' },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  })

  const tableY = (doc as any).lastAutoTable.finalY + 6

  // Payment summary box
  const summaryX = 120
  let summaryY = tableY

  doc.setFillColor(250, 250, 250)
  doc.rect(summaryX, summaryY, 76, order.advance_amount ? 30 : 18, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  summaryY += 7
  doc.text('Total Amount:', summaryX + 4, summaryY)
  doc.setFont('helvetica', 'bold')
  doc.text(formatCurrency(order.total_amount), 192, summaryY, { align: 'right' })

  if (order.advance_amount) {
    summaryY += 6
    doc.setFont('helvetica', 'normal')
    doc.text('Advance Paid:', summaryX + 4, summaryY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 150, 80)
    doc.text(formatCurrency(order.advance_amount), 192, summaryY, { align: 'right' })

    summaryY += 6
    doc.setTextColor(...darkGray)
    doc.setFont('helvetica', 'bold')
    doc.text('Balance Due:', summaryX + 4, summaryY)
    doc.setTextColor(200, 50, 50)
    doc.text(formatCurrency(order.balance_amount ?? order.total_amount - order.advance_amount), 192, summaryY, { align: 'right' })
    doc.setTextColor(...darkGray)
  }

  // Payment status badge
  summaryY += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  const payStatusColor =
    order.payment_status === 'paid' ? [0, 150, 80] : order.payment_status === 'partial' ? [200, 140, 0] : [200, 50, 50]
  doc.setTextColor(...(payStatusColor as [number, number, number]))
  doc.text(`Payment: ${order.payment_status.toUpperCase()}`, summaryX + 4, summaryY)
  doc.setTextColor(...darkGray)

  // Notes
  if (order.notes) {
    summaryY += 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Notes:', 14, summaryY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const noteLines = doc.splitTextToSize(order.notes, 100)
    doc.text(noteLines, 14, summaryY + 5)
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setDrawColor(...lightGray)
  doc.line(14, pageHeight - 20, 196, pageHeight - 20)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Thank you for your order! For queries, contact us on WhatsApp: ${shop.whatsapp ?? ''}`,
    105,
    pageHeight - 13,
    { align: 'center' }
  )
  doc.text(`Generated by GanpatiBappa Platform`, 105, pageHeight - 8, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
