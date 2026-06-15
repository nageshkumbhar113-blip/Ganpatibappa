import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'GanpatiBappa <noreply@ganpatibappa.in>'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

/** Send a transactional email via Resend. */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const resend = getResend()
    if (!resend) return false
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
    })

    if (error) {
      console.error('[sendEmail] Resend error:', error)
      return false
    }

    return !!data?.id
  } catch (error) {
    console.error('[sendEmail] Exception:', error)
    return false
  }
}

/** Send bulk emails to multiple recipients. */
export async function sendBulkEmail(
  recipients: Array<{ email: string; name?: string }>,
  subject: string,
  htmlTemplate: (name: string) => string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  // Resend batches — process in chunks of 50
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50)
    await Promise.all(
      batch.map(async (r) => {
        const ok = await sendEmail({
          to: r.email,
          subject,
          html: htmlTemplate(r.name ?? 'Customer'),
        })
        if (ok) sent++
        else failed++
      })
    )
  }

  return { sent, failed }
}
