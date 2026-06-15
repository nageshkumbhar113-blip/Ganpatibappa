/** Order confirmation email HTML template. */
export function orderConfirmTemplate({
  shopName,
  customerName,
  orderNumber,
  totalAmount,
  deliveryDate,
  whatsapp,
}: {
  shopName: string
  customerName: string
  orderNumber: string
  totalAmount: number
  deliveryDate?: string | null
  whatsapp?: string | null
}): string {
  const formattedAmount = `₹${totalAmount.toLocaleString('en-IN')}`
  const formattedDate = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : 'Will be confirmed soon'

  return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #ff6b00; padding: 28px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1a1a1a; margin-top: 0; font-size: 18px; }
    .detail-box { background: #fff8f5; border: 1px solid #ffe0cc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #333; border-bottom: 1px solid #f0e0d8; }
    .detail-row:last-child { border-bottom: none; font-weight: bold; }
    .label { color: #666; }
    .cta { display: block; text-align: center; background: #ff6b00; color: #fff; text-decoration: none; border-radius: 8px; padding: 14px 24px; margin: 24px 0; font-weight: bold; font-size: 15px; }
    .footer { padding: 20px 32px; border-top: 1px solid #f0f0f0; text-align: center; color: #999; font-size: 12px; }
    .ganesh { font-size: 28px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="ganesh">🙏</div>
      <h1>${shopName}</h1>
      <p>Ganesh Murti Online Order</p>
    </div>
    <div class="body">
      <h2>Order Confirmed! 🎉</h2>
      <p>Namaste ${customerName},</p>
      <p>Your order has been confirmed. We will start preparing your Ganesh Murti soon.</p>

      <div class="detail-box">
        <div class="detail-row">
          <span class="label">Order Number</span>
          <span>#${orderNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Delivery Date</span>
          <span>${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Amount</span>
          <span>${formattedAmount}</span>
        </div>
      </div>

      <p style="color:#666; font-size:13px;">
        For any queries, please contact us on WhatsApp:<br>
        <strong>${whatsapp ?? 'Contact us'}</strong>
      </p>

      <p style="color:#666; font-size:13px;">
        गणपती बाप्पा मोरया! 🙏
      </p>
    </div>
    <div class="footer">
      <p>This email was sent by ${shopName} via GanpatiBappa Platform</p>
      <p>© ${new Date().getFullYear()} GanpatiBappa</p>
    </div>
  </div>
</body>
</html>`
}
