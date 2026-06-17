'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Save, Cloud, CheckCircle, XCircle,
  ExternalLink, ChevronDown, ChevronUp, Copy, Key, Settings2, Upload
} from 'lucide-react'

const STEPS = [
  {
    icon: '1️⃣',
    title: 'Account बनवा',
    color: 'blue',
    items: [
      'खाली "Cloudinary वर जा" button click करा',
      '"Sign Up Free" वर click करा',
      'Google किंवा Email ने register करा (Free!)',
    ],
  },
  {
    icon: '2️⃣',
    title: 'Cloud Name मिळवा',
    color: 'purple',
    items: [
      'Login केल्यावर Dashboard उघडेल',
      '"Product Environment" section मध्ये बघा',
      'Cloud Name दिसेल → Copy करा',
    ],
    path: 'Dashboard → Product Environment → Cloud Name',
  },
  {
    icon: '3️⃣',
    title: 'API Key + Secret मिळवा',
    color: 'orange',
    items: [
      'वरती ⚙️ Settings icon click करा',
      '"API Keys" tab select करा',
      '"Primary Key" section मध्ये API Key दिसेल',
      'डोळ्याचे 👁️ icon click केल्यावर API Secret दिसेल',
    ],
    path: '⚙️ Settings → API Keys → Primary Key',
  },
  {
    icon: '4️⃣',
    title: 'Upload Preset बनवा',
    color: 'green',
    items: [
      '⚙️ Settings → "Upload" tab वर जा',
      '"Upload presets" section scroll करा',
      '"Add upload preset" button click करा',
      'Preset name: ganpatibappa_uploads',
      'Signing Mode: Unsigned निवडा ⚠️ (महत्त्वाचे!)',
      'Save करा',
    ],
    path: '⚙️ Settings → Upload → Upload presets → Add',
  },
]

export default function CloudinaryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const [form, setForm] = useState({
    cloud_name: '',
    api_key: '',
    api_secret: '',
    upload_preset: '',
  })

  useEffect(() => {
    fetch('/api/admin/cloudinary')
      .then((r) => r.json())
      .then((d) => {
        if (d.credentials) {
          setForm({
            cloud_name: d.credentials.cloud_name ?? '',
            api_key: d.credentials.api_key ?? '',
            api_secret: d.credentials.api_secret ? '••••••••' : '',
            upload_preset: d.credentials.upload_preset ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/cloudinary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Cloudinary credentials saved!')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save credentials')
      }
    })
  }

  async function handleTest() {
    setIsTesting(true)
    setTestResult(null)
    const res = await fetch('/api/admin/cloudinary/test', { method: 'POST' })
    const d = await res.json()
    setTestResult({ ok: res.ok, message: d.message ?? (res.ok ? 'Connection successful!' : 'Connection failed') })
    setIsTesting(false)
  }

  function copyPreset() {
    navigator.clipboard.writeText('ganpatibappa_uploads')
    toast.success('Preset name copied!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Cloud className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900">Cloudinary Settings</h1>
        </div>
        <p className="text-sm text-gray-500">
          तुमच्या shop साठी स्वतःचा Cloudinary account connect करा — images तुमच्या account मध्ये safe राहतील.
        </p>
      </div>

      {/* Go to Cloudinary CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-bold text-base mb-1">Cloudinary वर Free Account बनवा</p>
          <p className="text-blue-100 text-sm">25 GB storage + 25 GB bandwidth — बिल्कुल मोफत!</p>
        </div>
        <a
          href="https://cloudinary.com/users/register_free"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors shrink-0"
        >
          Cloudinary वर जा
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Setup Guide (collapsible) */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-sm text-gray-800">Setup Guide — Credentials कुठून मिळवायचे?</span>
          </div>
          {guideOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>

        {guideOpen && (
          <div className="divide-y divide-gray-100">
            {STEPS.map((step, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <span className="font-semibold text-sm text-gray-900">{step.title}</span>
                </div>
                {step.path && (
                  <div className="ml-7 inline-flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-600">
                    {step.path}
                  </div>
                )}
                <ul className="ml-7 space-y-1">
                  {step.items.map((item, j) => (
                    <li key={j} className="text-sm text-gray-600 flex items-start gap-1.5">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {step.icon === '4️⃣' && (
                  <div className="ml-7 flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700 font-medium">
                    <Upload className="h-3.5 w-3.5 shrink-0" />
                    Preset name copy करा:
                    <code className="font-mono bg-white border border-orange-200 px-2 py-0.5 rounded">ganpatibappa_uploads</code>
                    <button type="button" onClick={copyPreset} className="ml-auto hover:text-orange-900">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Quick links */}
            <div className="px-5 py-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-3">Quick Links</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Dashboard', href: 'https://console.cloudinary.com' },
                  { label: 'API Keys', href: 'https://console.cloudinary.com/settings/api-keys' },
                  { label: 'Upload Presets', href: 'https://console.cloudinary.com/settings/upload' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white text-blue-600 text-xs font-medium px-3 py-1.5 hover:bg-blue-50 transition-colors"
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-bold text-gray-900">Credentials</h2>
          </div>

          {[
            { label: 'Cloud Name', key: 'cloud_name', placeholder: 'your-cloud-name', hint: 'Dashboard → Product Environment मध्ये दिसेल' },
            { label: 'API Key', key: 'api_key', placeholder: '123456789012345', hint: 'Settings → API Keys मध्ये दिसेल' },
            { label: 'API Secret', key: 'api_secret', placeholder: '••••••••••••••', hint: 'API Key जवळ 👁️ click करा' },
            { label: 'Upload Preset', key: 'upload_preset', placeholder: 'ganpatibappa_uploads', hint: 'Settings → Upload मध्ये बनवा (Unsigned mode)' },
          ].map(({ label, key, placeholder, hint }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-gray-700 block mb-1">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={placeholder}
                type={key === 'api_secret' ? 'password' : 'text'}
              />
              <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
            </div>
          ))}
        </div>

        {/* Why use own Cloudinary */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1.5">स्वतःचा Cloudinary का वापरावा?</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">✓</span> तुमच्या images फक्त तुमच्या account मध्ये — secure</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">✓</span> 25 GB storage मोफत मिळतो</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">✓</span> Image resize, watermark, transformations control</li>
            <li className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">✓</span> Platform बंद झाली तरी तुमचे images safe</li>
          </ul>
        </div>

        {testResult && (
          <div className={`rounded-xl border p-3 flex items-center gap-2 text-sm ${
            testResult.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {testResult.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {testResult.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
            Test Connection
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
