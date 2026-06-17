import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './_components/LoginForm'
import { ShopVisitBox } from './_components/ShopVisitBox'

interface LoginPageProps {
  searchParams: {
    redirect?: string
    redirectTo?: string
    error?: string
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'You do not have permission to access that page.',
  no_shop: 'Your account is not linked to any shop. Please contact support.',
  session_expired: 'Your session has expired. Please sign in again.',
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? 'An error occurred. Please try again.'
    : undefined

  const redirectTo = searchParams.redirectTo ?? searchParams.redirect

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-5">

        {/* Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl shadow-lg">
            🙏
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            GanpatiBappa
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ganesh Murti Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm
                redirectTo={redirectTo}
                error={errorMessage}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Visit Shop Box */}
        <ShopVisitBox />

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GanpatiBappa. All rights reserved.
        </p>
      </div>
    </div>
  )
}
