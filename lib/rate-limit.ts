/**
 * Optional rate limiting via Upstash Redis.
 * When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set,
 * every call returns { success: true } so the app works without Redis.
 */

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit?: number
  /** Window in seconds */
  windowSecs?: number
}

const DISABLED: RateLimitResult = { success: true, limit: 0, remaining: 0, reset: 0 }

function isEnabled() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Check rate limit for a given identifier (e.g. IP address).
 * Identifier should be scoped with a prefix, e.g. `login:1.2.3.4`
 */
export async function rateLimit(
  identifier: string,
  { limit = 10, windowSecs = 60 }: RateLimitConfig = {}
): Promise<RateLimitResult> {
  if (!isEnabled()) return DISABLED

  try {
    const { Redis } = await import('@upstash/redis')
    const { Ratelimit } = await import('@upstash/ratelimit')

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
      analytics: false,
    })

    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch {
    return DISABLED
  }
}

/** Extract real IP from Next.js request headers */
export function getIP(req: Request | { headers: Headers }): string {
  const h = req instanceof Request ? req.headers : req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'anonymous'
  )
}

/** Return a 429 Response with Retry-After header */
export function rateLimitResponse(reset: number): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(retryAfter, 1)),
      },
    }
  )
}
