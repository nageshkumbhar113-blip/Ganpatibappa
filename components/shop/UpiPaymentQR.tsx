'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Check, Copy } from 'lucide-react'

interface UpiPaymentQRProps {
  upiId: string
  payeeName?: string
  amount: number
  note?: string
}

/**
 * Live UPI deep-link QR — generated entirely client-side from
 * `upi://pay?...`, no static image, no Cloudinary storage. The amount is
 * baked into the link itself so the QR always matches what the customer
 * actually owes right now (full total, or the booking/advance amount if
 * they've entered one) — a plain screenshot of a QR can never do that.
 *
 * Values are percent-encoded by hand rather than via URLSearchParams,
 * which encodes spaces as '+' — some UPI apps don't decode '+' back to a
 * space in the payee name, silently mangling it.
 */
export function UpiPaymentQR({ upiId, payeeName, amount, note }: UpiPaymentQRProps) {
  const [copied, setCopied] = useState(false)

  if (!upiId || !(amount > 0)) return null

  const parts = [
    `pa=${encodeURIComponent(upiId)}`,
    payeeName ? `pn=${encodeURIComponent(payeeName)}` : null,
    `am=${encodeURIComponent(amount.toFixed(2))}`,
    'cu=INR',
    note ? `tn=${encodeURIComponent(note)}` : null,
  ].filter(Boolean)
  const upiLink = `upi://pay?${parts.join('&')}`

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API can be unavailable (older mobile browsers, http) —
      // the UPI ID is still visible as text for manual copy
    }
  }

  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50 p-4">
      <div className="rounded-lg bg-white p-3">
        <QRCode value={upiLink} size={152} />
      </div>
      <p className="text-center text-xs text-gray-600">
        कोणत्याही UPI app ने (GPay / PhonePe / Paytm) स्कॅन करा —{' '}
        <span className="font-semibold text-gray-800">₹{amount.toFixed(2)}</span> आपोआप भरलं जाईल
      </p>
      <button
        type="button"
        onClick={copyUpiId}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        {upiId}
      </button>
    </div>
  )
}
