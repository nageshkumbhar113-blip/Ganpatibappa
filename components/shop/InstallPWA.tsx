'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA({ shopName }: { shopName?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('pwa-install-dismissed')
    if (stored) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after 3 seconds
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-4 right-4 z-40 max-w-sm mx-auto sm:mx-0 sm:left-4 sm:right-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-xl">🙏</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Add to Home Screen</p>
          <p className="text-xs text-gray-500 truncate">
            Install {shopName ?? 'the app'} for quick access
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
