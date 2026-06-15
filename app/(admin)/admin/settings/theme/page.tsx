'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Palette } from 'lucide-react'

const PRESET_THEMES = [
  { name: 'Saffron (Default)', primary: '#f97316', secondary: '#fed7aa', accent: '#ea580c' },
  { name: 'Royal Blue', primary: '#2563eb', secondary: '#bfdbfe', accent: '#1d4ed8' },
  { name: 'Forest Green', primary: '#16a34a', secondary: '#bbf7d0', accent: '#15803d' },
  { name: 'Deep Purple', primary: '#7c3aed', secondary: '#ede9fe', accent: '#6d28d9' },
  { name: 'Rose Pink', primary: '#e11d48', secondary: '#ffe4e6', accent: '#be123c' },
  { name: 'Teal', primary: '#0d9488', secondary: '#ccfbf1', accent: '#0f766e' },
]

interface ThemeConfig {
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
  border_radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const defaultTheme: ThemeConfig = {
  primary_color: '#f97316',
  secondary_color: '#fed7aa',
  accent_color: '#ea580c',
  font_family: 'inter',
  border_radius: 'lg',
}

export default function ThemePage() {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.theme_config) {
          setTheme({ ...defaultTheme, ...d.settings.theme_config })
        }
      })
      .catch(() => {})
  }, [])

  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) =>
    setTheme((t) => ({ ...t, [key]: value }))

  function applyPreset(p: typeof PRESET_THEMES[0]) {
    setTheme((t) => ({ ...t, primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent }))
  }

  async function handleSave() {
    startTransition(async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_config: theme }),
      })
      if (res.ok) toast.success('Theme saved!')
      else toast.error('Failed to save theme')
    })
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Theme & Colors</h1>
        <p className="text-sm text-gray-500">Shop चा रंग आणि design customize करा</p>
      </div>

      {/* Presets */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-400" />
          Color Presets
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET_THEMES.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                theme.primary_color === p.primary
                  ? 'border-gray-400 shadow-sm'
                  : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1.5 mb-2">
                <span className="h-4 w-4 rounded-full" style={{ background: p.primary }} />
                <span className="h-4 w-4 rounded-full" style={{ background: p.secondary }} />
                <span className="h-4 w-4 rounded-full" style={{ background: p.accent }} />
              </div>
              <p className="text-xs font-medium text-gray-700">{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom colors */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Custom Colors</h2>

        {[
          { key: 'primary_color' as const, label: 'Primary Color', desc: 'Buttons, links, badges' },
          { key: 'secondary_color' as const, label: 'Secondary Color', desc: 'Backgrounds, highlights' },
          { key: 'accent_color' as const, label: 'Accent Color', desc: 'Hover states, borders' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-lg border border-gray-200 cursor-pointer shadow-sm"
                style={{ background: theme[key] }}
              />
              <input
                type="color"
                value={theme[key]}
                onChange={(e) => set(key, e.target.value)}
                className="h-8 w-16 rounded border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={theme[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Typography & Radius */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Typography & Style</h2>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Font Family</label>
          <select
            value={theme.font_family}
            onChange={(e) => set('font_family', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="inter">Inter (Default)</option>
            <option value="poppins">Poppins</option>
            <option value="nunito">Nunito</option>
            <option value="roboto">Roboto</option>
            <option value="lato">Lato</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Border Radius (Cards, Buttons)</label>
          <div className="flex gap-2">
            {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
              <button
                key={r}
                onClick={() => set('border_radius', r)}
                className={`flex-1 py-2 text-xs font-medium border transition-colors ${
                  theme.border_radius === r
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                } rounded-lg`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Preview</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            className="px-4 py-2 text-sm font-bold text-white transition-colors"
            style={{ background: theme.primary_color, borderRadius: theme.border_radius === 'full' ? 9999 : theme.border_radius === 'lg' ? 12 : theme.border_radius === 'md' ? 8 : theme.border_radius === 'sm' ? 4 : 0 }}
          >
            Primary Button
          </button>
          <button
            className="px-4 py-2 text-sm font-medium border transition-colors"
            style={{ color: theme.primary_color, borderColor: theme.primary_color, background: theme.secondary_color, borderRadius: theme.border_radius === 'full' ? 9999 : theme.border_radius === 'lg' ? 12 : theme.border_radius === 'md' ? 8 : theme.border_radius === 'sm' ? 4 : 0 }}
          >
            Secondary Button
          </button>
          <span
            className="px-3 py-1 text-xs font-semibold"
            style={{ background: theme.secondary_color, color: theme.accent_color, borderRadius: 9999 }}
          >
            Badge
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Theme
      </button>
    </div>
  )
}
