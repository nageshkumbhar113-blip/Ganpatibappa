'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, ExternalLink, ChevronDown, ChevronUp, BarChart2, Search, Share2, Bot } from 'lucide-react'

function GuideBox({
  title,
  icon: Icon,
  color,
  steps,
  links,
}: {
  title: string
  icon: React.ElementType
  color: string
  steps: string[]
  links: { label: string; href: string }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-xl border ${color === 'blue' ? 'border-blue-100 bg-blue-50' : color === 'indigo' ? 'border-indigo-100 bg-indigo-50' : color === 'green' ? 'border-green-100 bg-green-50' : 'border-purple-100 bg-purple-50'} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color === 'blue' ? 'text-blue-500' : color === 'indigo' ? 'text-indigo-500' : color === 'green' ? 'text-green-600' : 'text-purple-500'}`} />
          <span className={`text-xs font-bold ${color === 'blue' ? 'text-blue-700' : color === 'indigo' ? 'text-indigo-700' : color === 'green' ? 'text-green-700' : 'text-purple-700'}`}>
            {title} कसे setup करायचे?
          </span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <ol className="space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className={`shrink-0 font-bold ${color === 'blue' ? 'text-blue-500' : color === 'indigo' ? 'text-indigo-500' : color === 'green' ? 'text-green-600' : 'text-purple-500'}`}>{i + 1}.</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 pt-1">
            {links.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${color === 'blue' ? 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50' : color === 'indigo' ? 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50' : color === 'green' ? 'bg-white border-green-200 text-green-600 hover:bg-green-50' : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50'} transition-colors`}
              >
                {label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MarketingPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [form, setForm] = useState({
    google_analytics_id: '',
    google_search_console: '',
    facebook_pixel_id: '',
    og_image_url: '',
    custom_robots: '',
  })

  useEffect(() => {
    fetch('/api/admin/marketing')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setForm({
            google_analytics_id: d.settings.google_analytics_id ?? '',
            google_search_console: d.settings.google_search_console ?? '',
            facebook_pixel_id: d.settings.facebook_pixel_id ?? '',
            og_image_url: d.settings.og_image_url ?? '',
            custom_robots: d.settings.custom_robots ?? '',
          })
        }
      })
      .catch(() => toast.error('Failed to load marketing settings'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Marketing settings saved!')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save')
      }
    })
  }

  const Field = ({
    label, name, placeholder, hint,
  }: { label: string; name: keyof typeof form; placeholder: string; hint?: string }) => (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-1">{label}</label>
      <input
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        placeholder={placeholder}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marketing & SEO</h1>
          <p className="text-sm text-gray-500">Analytics, tracking, and search engine settings</p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {/* ── GOOGLE ANALYTICS ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-900">Google Analytics</h2>
        </div>

        <GuideBox
          title="Google Analytics"
          icon={BarChart2}
          color="blue"
          steps={[
            'analytics.google.com वर जा → Sign in (Google account)',
            '"Start measuring" → Property बनवा (तुमच्या shop चे नाव)',
            'Property type: Web निवडा → shop URL टाका',
            'Data Stream तयार होईल → "Measurement ID" copy करा (G-XXXXXXXXXX format)',
            'खाली paste करा → Save करा',
            'तुमच्या shop वर visitor आल्यावर Google Analytics मध्ये data दिसेल',
          ]}
          links={[
            { label: 'Google Analytics', href: 'https://analytics.google.com' },
            { label: 'New Property बनवा', href: 'https://analytics.google.com/analytics/web/#/provision/create' },
          ]}
        />

        <Field
          label="Measurement ID"
          name="google_analytics_id"
          placeholder="G-XXXXXXXXXX"
          hint="Google Analytics → Admin → Data Streams → Web stream → Measurement ID"
        />
      </div>

      {/* ── GOOGLE SEARCH CONSOLE ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-900">Google Search Console</h2>
        </div>

        <GuideBox
          title="Google Search Console"
          icon={Search}
          color="indigo"
          steps={[
            'search.google.com/search-console वर जा',
            '"Add property" → URL prefix → तुमची shop URL टाका',
            'Verification method: "HTML tag" निवडा',
            'एक meta tag मिळेल जसे: <meta name="google-site-verification" content="abc123"/>',
            'तो पूर्ण meta tag copy करा → खाली paste करा',
            '"Verify" click करा — done! Google तुमची site index करेल',
          ]}
          links={[
            { label: 'Search Console', href: 'https://search.google.com/search-console' },
            { label: 'Property Add करा', href: 'https://search.google.com/search-console/welcome' },
          ]}
        />

        <Field
          label="Verification Meta Tag"
          name="google_search_console"
          placeholder='<meta name="google-site-verification" content="…" />'
          hint="Search Console → Settings → Ownership verification → HTML tag copy करा"
        />
      </div>

      {/* ── FACEBOOK PIXEL ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-[9px] font-black">f</span>
          </div>
          <h2 className="text-sm font-bold text-gray-900">Facebook / Meta Pixel</h2>
        </div>

        <GuideBox
          title="Facebook Pixel"
          icon={BarChart2}
          color="indigo"
          steps={[
            'business.facebook.com वर जा → Login (Facebook account)',
            'Events Manager → "Connect Data Sources" → Web → "Meta Pixel"',
            'Pixel नाव द्या (e.g. GanpatiBappa Pixel) → Continue',
            '"Install code manually" निवडा',
            'Pixel ID दिसेल (15-digit number) → Copy करा',
            'खाली paste करा → Save',
            'Facebook ads चालवल्यावर visitor tracking सुरू होईल',
          ]}
          links={[
            { label: 'Events Manager', href: 'https://business.facebook.com/events_manager' },
            { label: 'Meta Business Suite', href: 'https://business.facebook.com' },
          ]}
        />

        <Field
          label="Facebook Pixel ID"
          name="facebook_pixel_id"
          placeholder="123456789012345"
          hint="Events Manager → Data Sources → तुमचा Pixel → Pixel ID (15 digits)"
        />
      </div>

      {/* ── SOCIAL SHARING ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900">Social Sharing (OG Image)</h2>
        </div>

        <GuideBox
          title="OG Image"
          icon={Share2}
          color="green"
          steps={[
            'WhatsApp / Facebook वर shop link share केल्यावर एक preview image दिसते',
            'ती image म्हणजे OG (Open Graph) Image',
            '1200 × 630 pixels size असावी',
            'तुमच्या shop logo / products असलेले attractive image बनवा',
            'Cloudinary मध्ये upload करा → image URL copy करा',
            'खाली paste करा → Save',
          ]}
          links={[
            { label: 'OG Image बनवा (Canva)', href: 'https://www.canva.com/create/facebook-posts/' },
            { label: 'Preview test करा', href: 'https://www.opengraph.xyz' },
          ]}
        />

        <Field
          label="Default OG Image URL"
          name="og_image_url"
          placeholder="https://res.cloudinary.com/your-cloud/image/upload/og-image.jpg"
          hint="1200×630px image — WhatsApp/Facebook share preview मध्ये दिसते"
        />
      </div>

      {/* ── ROBOTS.TXT ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-bold text-gray-900">Custom Robots.txt</h2>
        </div>

        <GuideBox
          title="Robots.txt"
          icon={Bot}
          color="indigo"
          steps={[
            'Robots.txt Google ला सांगतो — कोणते pages index करायचे, कोणते नाही',
            'Default (blank सोडल्यास): सर्व pages allow, /admin block',
            'Custom लिहायचे असेल तरच हे field वापरा',
            'Sitemap URL पण आत टाका: Sitemap: https://yourshop.com/sitemap.xml',
            'चुकीचे लिहिल्यास Google तुमची site index करणार नाही — सांभाळून!',
          ]}
          links={[
            { label: 'Robots.txt तपासा', href: 'https://www.google.com/webmasters/tools/robots-testing-tool' },
          ]}
        />

        <p className="text-xs text-gray-400">रिकामे सोडल्यास default वापरले जाईल (सर्व allow, /admin block)</p>
        <textarea
          rows={6}
          value={form.custom_robots}
          onChange={(e) => setForm((f) => ({ ...f, custom_robots: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          placeholder={`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://yourshop.com/sitemap.xml`}
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Marketing Settings
      </button>
    </form>
  )
}
