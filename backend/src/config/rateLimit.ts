import { RateLimitPluginOptions } from '@fastify/rate-limit'

/**
 * Rate limiting configuration to protect API from abuse
 * Implements different limits for different endpoints
 */
export const rateLimitOptions: RateLimitPluginOptions = {
  global: true,
  max: parseInt(process.env.RATE_LIMIT_MAX || '10000', 10), // 10,000 requests (high for dev)
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  allowList: ['127.0.0.1', '::1'], // Allow localhost
  skipOnError: false,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true
  },
  errorResponseBuilder: (request, context) => {
    const timeWindowSeconds = Math.floor((rateLimitOptions.timeWindow as number || 60000) / 1000)
    return {
      error: {
        message: 'Rate limit exceeded',
        statusCode: 429,
        details: `Too many requests from this IP, please try again later. Limit: ${context.max} requests per ${timeWindowSeconds} seconds.`,
        retryAfter: context.ttl
      }
    }
  },
  keyGenerator: (request) => {
    // Use IP address as the key, but you could also use user ID if authenticated
    const forwarded = request.headers['x-forwarded-for'] as string
    const ip = forwarded ? forwarded.split(',')[0] : request.ip
    return ip || 'unknown'
  }
}

/**
 * Strict rate limiting for sensitive endpoints (auth, admin)
 */
export const strictRateLimitOptions: RateLimitPluginOptions = {
  max: 10,
  timeWindow: 60000, // 1 minute
  skipOnError: false,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true
  },
  errorResponseBuilder: (request, context) => {
    return {
      error: {
        message: 'Rate limit exceeded for sensitive endpoint',
        statusCode: 429,
        details: 'Too many attempts. Please wait before trying again.',
        retryAfter: context.ttl
      }
    }
  }
}

/**
 * Relaxed rate limiting for public endpoints (docs, health checks)
 */
export const relaxedRateLimitOptions: RateLimitPluginOptions = {
  max: 1000,
  timeWindow: 60000, // 1 minute
  skipOnError: true,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
}
