import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies — OK to ignore
            // Cookies will be set by the middleware response
          }
        },
      },
      global: {
        // See lib/supabase/admin.ts — Next.js's fetch patching has been
        // observed to serve a stale cached row for a plain server-side
        // query even under `dynamic = 'force-dynamic'`. Force fresh data.
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
