'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
  redirectTo: z.string().optional(),
})

export type LoginState = {
  error?: string
  field?: string
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: formData.get('redirectTo') ?? undefined,
  })

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return { error: firstError.message, field: firstError.path[0] as string }
  }

  const { email, password, redirectTo } = parsed.data

  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return { error: 'Incorrect email or password. Please try again.' }
  }

  const adminSupabase = createAdminClient()

  // Get user profile (role, shop, active status)
  const { data: user, error: userError } = await adminSupabase
    .from('users')
    .select('id, role, shop_id, is_active, name')
    .eq('id', authData.user.id)
    .single()

  if (userError || !user) {
    await supabase.auth.signOut()
    return { error: 'User account not found. Please contact support.' }
  }

  if (!user.is_active) {
    await supabase.auth.signOut()
    return { error: 'Your account has been deactivated. Please contact support.' }
  }

  // Record login history
  const ip =
    headers().get('x-real-ip') ??
    headers().get('x-forwarded-for')?.split(',')[0].trim() ??
    '0.0.0.0'

  await adminSupabase.from('login_history').insert({
    user_id: user.id,
    shop_id: user.shop_id,
    ip_address: ip,
    user_agent: headers().get('user-agent'),
    status: 'success',
  })

  // Update FCM token if provided
  const fcmToken = formData.get('fcmToken') as string | null
  if (fcmToken) {
    await adminSupabase
      .from('users')
      .update({ fcm_token: fcmToken })
      .eq('id', user.id)
  }

  // Redirect based on role
  if (user.role === 'super_admin') {
    redirect(redirectTo?.startsWith('/super-admin') ? redirectTo : '/super-admin')
  }

  if (user.role === 'admin' || user.role === 'staff') {
    redirect(redirectTo?.startsWith('/admin') ? redirectTo : '/admin')
  }

  // Customer — redirect to shop home (handled by middleware)
  redirect(redirectTo ?? '/')
}

export async function logoutAction(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
