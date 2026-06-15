import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter for edge/serverless
// For production use Upstash Redis (see env: UPSTASH_REDIS_REST_URL)
// This implementation uses a sliding window counter

interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Max requests per window
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) rateLimitStore.delete(key)
    }
  }, 5 * 60 * 1000)
}

export function rateLimit(config: RateLimitConfig) {
  return function checkRateLimit(identifier: string): {
    success: boolean
    limit: number
    remaining: number
    resetAt: number
  } {
    const now = Date.now()
    const key = identifier

    const existing = rateLimitStore.get(key)

    if (!existing || existing.resetAt < now) {
      const resetAt = now + config.windowMs
      rateLimitStore.set(key, { count: 1, resetAt })
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt,
      }
    }

    if (existing.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt: existing.resetAt,
      }
    }

    existing.count++
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - existing.count,
      resetAt: existing.resetAt,
    }
  }
}

// Pre-configured limiters
export const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 })
export const apiRateLimit = rateLimit({ windowMs: 60 * 1000, maxRequests: 60 })
export const uploadRateLimit = rateLimit({ windowMs: 60 * 1000, maxRequests: 20 })

/** Middleware helper: check rate limit and return 429 if exceeded. */
export function withRateLimit(
  req: NextRequest,
  limiter: ReturnType<typeof rateLimit>,
  identifierFn?: (req: NextRequest) => string
): NextResponse | null {
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    '127.0.0.1'

  const identifier = identifierFn ? identifierFn(req) : ip
  const result = limiter(identifier)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  return null
}
