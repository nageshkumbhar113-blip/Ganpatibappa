import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service Role client — bypasses RLS.
// Use ONLY in server-side API routes that require privileged access.
// NEVER expose the service role key to the client.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        // supabase-js's requests go through the same global fetch that
        // Next.js patches for its Data Cache. That cache is meant for a
        // page's own `dynamic = 'force-dynamic'` export to disable, but in
        // practice a fetch issued from inside an awaited helper function
        // (not the page component itself) has been observed on Vercel to
        // still get served a stale cached response — confirmed by running
        // the identical query outside Next.js, where it always returns the
        // current row. Forcing no-store here bypasses Next's Data Cache for
        // every admin-client request regardless of which page called it.
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
