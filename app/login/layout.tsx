import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your GanpatiBappa account',
  robots: { index: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 via-background to-gold-50">
      {children}
    </div>
  )
}
