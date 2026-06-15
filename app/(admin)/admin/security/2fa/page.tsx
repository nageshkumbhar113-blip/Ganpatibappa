'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy } from 'lucide-react'
import Image from 'next/image'

type Step = 'idle' | 'setup' | 'enabled'

export default function TwoFAPage() {
  const [step, setStep] = useState<Step>('idle')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [token, setToken] = useState('')
  const [disableToken, setDisableToken] = useState('')
  const [showDisable, setShowDisable] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSetup() {
    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        setQrCodeUrl(d.qrCodeUrl)
        setSecret(d.secret)
        setStep('setup')
      } else {
        toast.error(d.error ?? 'Setup failed')
      }
    })
  }

  async function handleVerify() {
    if (token.length !== 6) { toast.error('6-digit code required'); return }
    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success('2FA enabled successfully!')
        setStep('enabled')
        setToken('')
      } else {
        toast.error(d.error ?? 'Invalid code')
      }
    })
  }

  async function handleDisable() {
    if (disableToken.length !== 6) { toast.error('6-digit code required'); return }
    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableToken }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success('2FA disabled')
        setStep('idle')
        setShowDisable(false)
        setDisableToken('')
      } else {
        toast.error(d.error ?? 'Invalid code')
      }
    })
  }

  function copySecret() {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copied!')
  }

  return (
    <div className="p-6 space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h1>
        <p className="text-sm text-gray-500">Google Authenticator वापरून account secure करा</p>
      </div>

      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs text-orange-700 font-medium">
        ⭐ Premium Feature
      </div>

      {/* Status card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        {step === 'idle' && (
          <>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-gray-300" />
              <div>
                <p className="font-semibold text-gray-900">2FA is not enabled</p>
                <p className="text-xs text-gray-400">Enable to add extra security to your account</p>
              </div>
            </div>
            <button
              onClick={handleSetup}
              disabled={isPending}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Enable 2FA
            </button>
          </>
        )}

        {step === 'setup' && (
          <>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Step 1: QR Code Scan करा</p>
              <p className="text-xs text-gray-500">
                Google Authenticator app उघडा → + → Scan QR code
              </p>
            </div>

            {qrCodeUrl && (
              <div className="flex justify-center">
                <img src={qrCodeUrl} alt="2FA QR Code" className="h-48 w-48 rounded-lg border border-gray-200" />
              </div>
            )}

            {/* Manual entry */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500 mb-1">QR scan नाही होत? Manual key enter करा:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-700 break-all flex-1">{secret}</code>
                <button onClick={copySecret} className="shrink-0 text-gray-400 hover:text-orange-500">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Step 2: 6-digit code टाका</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-2xl font-mono tracking-widest rounded-xl border border-gray-200 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={handleVerify}
                disabled={isPending || token.length !== 6}
                className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verify & Enable
              </button>
            </div>
          </>
        )}

        {step === 'enabled' && (
          <>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold text-green-700">2FA is Active</p>
                <p className="text-xs text-gray-400">Your account is protected with two-factor authentication</p>
              </div>
            </div>

            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <div className="space-y-3 border border-red-100 rounded-xl p-4 bg-red-50">
                <p className="text-xs text-red-700 font-medium">
                  Disable करण्यासाठी Authenticator code टाका:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-widest rounded-xl border border-red-200 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDisable(false); setDisableToken('') }}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisable}
                    disabled={isPending || disableToken.length !== 6}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                    Disable
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Google Authenticator कसे install करावे:</p>
        <p>1. Play Store / App Store मध्ये "Google Authenticator" शोधा</p>
        <p>2. Install करा → QR Code scan करा</p>
        <p>3. 6-digit code दर 30 सेकंदांनी बदलतो</p>
      </div>
    </div>
  )
}
