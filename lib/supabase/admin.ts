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
    }
  )
}
