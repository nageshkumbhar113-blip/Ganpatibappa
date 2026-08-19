import { NextResponse } from 'next/server'

/**
 * Shared error handler for API route handlers.
 *
 * Route handlers used to `catch {}` blindly and return a fixed
 * "401 Unauthorized" (or a bare 500). That hid the real failure: a
 * PostgREST schema error, a missing column, or a bad payload all surfaced
 * to the UI as an auth problem, which sent debugging down the wrong path
 * for every one of them.
 *
 * The auth guards (`requireAdmin` etc.) enforce access by calling Next's
 * `redirect()`, which throws a NEXT_REDIRECT error. So: a thrown redirect
 * really is an auth failure → 401. Anything else is a genuine server-side
 * fault → 500, logged with its real message so it is findable.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  const digest = (error as { digest?: string } | null)?.digest
  const message = error instanceof Error ? error.message : String(error)

  // Next.js redirect() throws with digest "NEXT_REDIRECT;..." — that is our
  // auth guards rejecting the request.
  if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.error(`[${context}]`, message, error)

  return NextResponse.json(
    {
      error: 'Request failed',
      // Surfaced so the admin UI can show what actually went wrong instead of
      // a misleading "Unauthorized". Contains no credentials or user data.
      message,
      context,
    },
    { status: 500 }
  )
}
