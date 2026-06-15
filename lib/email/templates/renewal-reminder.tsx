/** Subscription renewal reminder email template. */
export function renewalReminderTemplate({
  shopName,
  ownerName,
  planName,
  expiresAt,
  daysLeft,
  renewUrl,
}: {
  shopName: string
  ownerName: string
  planName: string
  expiresAt: string
  daysLeft: number
  renewUrl: string
}): string {
  const formattedDate = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const urgencyColor = daysLeft <= 1 ? '#dc2626' : daysLeft <= 3 ? '#ea580c' : '#d97706'
  const urgencyText = daysLeft === 1 ? 'LAST DAY!' : daysLeft <= 3 ? 'URGENT' : 'Action Required'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Renewal Reminder</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: ${urgencyColor}; padding: 24px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; }
    .header p { color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .urgency-badge { display: inline-block; background: ${urgencyColor}; color: #fff; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
    .cta { display: block; text-align: center; background: #ff6b00; color: #fff; text-decoration: none; border-radius: 8px; padding: 14px 24px; margin: 24px 0; font-weight: bold; font-size: 16px; }
    .footer { padding: 16px 32px; border-top: 1px solid #f0f0f0; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:28px; margin-bottom:8px;">⚠️</div>
      <h1>Subscription Expiring Soon</h1>
      <p>${shopName} — GanpatiBappa Platform</p>
    </div>
    <div class="body">
      <span class="urgency-badge">${urgencyText}</span>
      <h2 style="color:#1a1a1a; margin-top:8px;">Hello ${ownerName},</h2>
      <p>Your <strong>${planName}</strong> subscription for <strong>${shopName}</strong> expires on <strong>${formattedDate}</strong>.</p>
      <p>That's only <strong style="color:${urgencyColor}">${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> away!</p>
      <p>After expiry, your shop will be suspended and customers won't be able to place orders.</p>

      <a href="${renewUrl}" class="cta">Renew Subscription Now →</a>

      <p style="color:#666; font-size:13px;">
        If you have already renewed or have any questions, please contact us and we'll be happy to help.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GanpatiBappa Platform</p>
    </div>
  </div>
</body>
</html>`
}
