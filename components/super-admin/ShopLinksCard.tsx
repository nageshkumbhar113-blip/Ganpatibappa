'use client'

import { Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  shopName: string
  shopSlug: string
}

export function ShopLinksCard({ shopName, shopSlug }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shopUrl = `${origin}/shop/${shopSlug}`
  const adminLoginUrl = `${origin}/login`
  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  const waText = encodeURIComponent(
    `🙏 *${shopName}* — आपली shop visit करा!\n\n` +
    `🌐 *Shop URL:*\n${shopUrl}\n\n` +
    `🔐 *Admin Login:*\n${adminLoginUrl}\n\n` +
    `वरील link वरून आपली shop open करा.`
  )

  return (
    <div className="space-y-3">
      {/* Shop URL */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Shop URL (Customers साठी)</p>
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-blue-900 break-all">{shopUrl}</code>
          <button onClick={() => copy(shopUrl, 'Shop URL')} className="shrink-0 text-blue-400 hover:text-blue-600">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-600">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Admin Login URL */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Admin Login URL</p>
        <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
          <code className="flex-1 text-xs font-mono text-orange-900 break-all">{adminLoginUrl}</code>
          <button onClick={() => copy(adminLoginUrl, 'Login URL')} className="shrink-0 text-orange-400 hover:text-orange-600">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Share */}
      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-lg border border-green-300 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp वर Share करा
      </a>
    </div>
  )
}
