import * as React from 'react'

interface NewsletterEmailProps {
  shopName: string
  logoUrl?: string
  subject: string
  preheader?: string
  bodyHtml: string
  ctaText?: string
  ctaUrl?: string
  unsubscribeUrl: string
}

export function NewsletterEmail({
  shopName,
  logoUrl,
  subject,
  preheader,
  bodyHtml,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
}: NewsletterEmailProps) {
  return (
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        {preheader && (
          <style>{`
            .preheader { display: none; max-height: 0; overflow: hidden; mso-hide: all; }
          `}</style>
        )}
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', background: '#f9fafb', margin: 0, padding: 0 }}>
        {preheader && (
          <span className="preheader" style={{ display: 'none' }}>{preheader}</span>
        )}

        <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f9fafb', padding: '32px 16px' }}>
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{ background: '#ffffff', borderRadius: 12, overflow: 'hidden', maxWidth: '100%' }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      background: '#f97316',
                      padding: '24px 32px',
                      textAlign: 'center',
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={shopName}
                        height="48"
                        style={{ display: 'block', margin: '0 auto', maxHeight: 48 }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: '#ffffff',
                          letterSpacing: '-0.5px',
                        }}
                      >
                        🪔 {shopName}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: '32px', color: '#374151', fontSize: 15, lineHeight: 1.6 }}>
                    <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

                    {ctaText && ctaUrl && (
                      <div style={{ textAlign: 'center', marginTop: 32 }}>
                        <a
                          href={ctaUrl}
                          style={{
                            display: 'inline-block',
                            background: '#f97316',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 15,
                            padding: '12px 28px',
                            borderRadius: 8,
                            textDecoration: 'none',
                          }}
                        >
                          {ctaText}
                        </a>
                      </div>
                    )}
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      background: '#f9fafb',
                      padding: '20px 32px',
                      borderTop: '1px solid #e5e7eb',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: 12,
                    }}
                  >
                    <p style={{ margin: '0 0 4px' }}>
                      You received this email because you subscribed to updates from <strong>{shopName}</strong>.
                    </p>
                    <a
                      href={unsubscribeUrl}
                      style={{ color: '#9ca3af', textDecoration: 'underline' }}
                    >
                      Unsubscribe
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
