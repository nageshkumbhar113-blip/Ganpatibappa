'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Cloud, CheckCircle, XCircle } from 'lucide-react'

export default function CloudinaryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

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
        toast.success('Cloudinary credentials saved')
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
    setTestResult({ ok: res.ok, message: d.message ?? (res.ok ? 'Connection successful' : 'Connection failed') })
    setIsTesting(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="p-6 space-y-5 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cloudinary Settings</h1>
        <p className="text-sm text-gray-500">
          Configure your own Cloudinary account for image storage. Leave blank to use the platform default.
        </p>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">Why use your own Cloudinary?</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Your images are stored in your account</li>
          <li>Higher storage limits based on your plan</li>
          <li>Better control over transformations</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-900">Credentials</h2>
        </div>

        {[
          { label: 'Cloud Name', key: 'cloud_name', placeholder: 'your-cloud-name' },
          { label: 'API Key', key: 'api_key', placeholder: '123456789012345' },
          { label: 'API Secret', key: 'api_secret', placeholder: '••••••••••••••' },
          { label: 'Upload Preset (optional)', key: 'upload_preset', placeholder: 'ml_default' },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
            <input
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={placeholder}
            />
          </div>
        ))}
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
          Save
        </button>
      </div>
    </form>
  )
}
