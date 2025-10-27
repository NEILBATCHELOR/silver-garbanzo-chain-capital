/**
 * PSP Rate Limiting Middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@/utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 100
};

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  standard: DEFAULT_RATE_LIMIT,
  webhooks: {
    windowMs: 60 * 1000,
    maxRequests: 1000
  },
  payments: {
    windowMs: 60 * 1000,
    maxRequests: 50
  },
  identity: {
    windowMs: 60 * 1000,
    maxRequests: 20
  },
  trades: {
    windowMs: 60 * 1000,
    maxRequests: 50
  }
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitType(path: string): string {
  if (path.includes('/webhooks')) return 'webhooks';
  if (path.includes('/payments')) return 'payments';
  if (path.includes('/trades')) return 'trades';
  if (path.includes('/identity')) return 'identity';
  return 'standard';
}

function getRateLimitKey(projectId: string, limitType: string): string {
  return `ratelimit:${projectId}:${limitType}`;
}

function getRateLimitConfig(limitType: string): RateLimitConfig {
  const config = RATE_LIMITS[limitType];
  if (config) {
    return config;
  }
  return DEFAULT_RATE_LIMIT;
}

function checkRateLimit(
  projectId: string,
  limitType: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const key = getRateLimitKey(projectId, limitType);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, entry);
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export async function pspRateLimiting(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const projectId = (request.user as any)?.project_id;
    
    if (!projectId) {
      return;
    }

    const limitType = getRateLimitType(request.url);
    const config = getRateLimitConfig(limitType);

    const { allowed, remaining, resetTime } = checkRateLimit(
      projectId,
      limitType,
      config
    );

    reply.header('X-RateLimit-Limit', config.maxRequests);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      logger.warn({
        msg: 'Rate limit exceeded',
        projectId,
        limitType,
        path: request.url,
        method: request.method,
        retryAfter
      });

      reply.header('Retry-After', retryAfter);

      return reply.code(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
          retryAfter
        }
      });
    }

    logger.debug({
      msg: 'Rate limit check passed',
      projectId,
      limitType,
      remaining,
      path: request.url
    });

  } catch (error) {
    logger.error({
      msg: 'Rate limiting error',
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.url,
      method: request.method
    });
  }
}

export async function pspRateLimitPlugin(fastify: any) {
  fastify.addHook('onRequest', pspRateLimiting);
}

export function getRateLimitStatus(projectId: string, limitType: string): {
  count: number;
  limit: number;
  remaining: number;
  resetTime: number;
} {
  const key = getRateLimitKey(projectId, limitType);
  const entry = rateLimitStore.get(key);
  const config = getRateLimitConfig(limitType);

  if (!entry || Date.now() > entry.resetTime) {
    return {
      count: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs
    };
  }

  return {
    count: entry.count,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}
