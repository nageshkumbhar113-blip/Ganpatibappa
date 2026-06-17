'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, type LoginState } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in…
        </>
      ) : (
        'Sign In'
      )}
    </Button>
  )
}

interface LoginFormProps {
  redirectTo?: string
  error?: string
}

export function LoginForm({ redirectTo, error: initialError }: LoginFormProps) {
  const [rawState, formAction] = useFormState<LoginState, FormData>(loginAction, {
    error: initialError,
  })
  const state = rawState ?? {}
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.field === 'email') emailRef.current?.focus()
  }, [state.field])

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{state.error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            placeholder="admin@example.com"
            autoComplete="email"
            required
            className={`pl-9 ${state.field === 'email' ? 'border-destructive' : ''}`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className={`pl-9 pr-10 ${state.field === 'password' ? 'border-destructive' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <SubmitButton />
    </form>
  )
}
