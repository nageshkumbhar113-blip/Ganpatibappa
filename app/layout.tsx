import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_Devanagari } from 'next/font/google'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-devanagari',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GanpatiBappa — Ganesh Murti Online',
    template: '%s | GanpatiBappa',
  },
  description: 'गणपती मूर्ती Online Order करा. Home delivery available.',
  keywords: ['ganesh murti', 'ganpati', 'eco friendly ganesh', 'ganesh idol online'],
  authors: [{ name: 'GanpatiBappa' }],
  creator: 'GanpatiBappa',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'mr_IN',
    alternateLocale: 'en_IN',
    siteName: 'GanpatiBappa',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ff6b00' },
    { media: '(prefers-color-scheme: dark)', color: '#ff6b00' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="mr"
      suppressHydrationWarning
      className={`${inter.variable} ${notoDevanagari.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              classNames: {
                toast: 'font-sans',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
