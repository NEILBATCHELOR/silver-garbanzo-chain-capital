/**
 * PSP Request Logging Middleware
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { logger } from '@/utils/logger';
import { randomUUID } from 'crypto';

interface RequestLogData {
  requestId: string;
  projectId?: string;
  apiKeyId?: string;
  clientIp: string;
  method: string;
  path: string;
  query?: any;
  userAgent?: string;
  environment?: string;
  timestamp: string;
}

interface ResponseLogData extends RequestLogData {
  statusCode: number;
  duration: number;
  error?: {
    code: string;
    message: string;
  };
}

function getClientIp(request: FastifyRequest): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor : forwardedFor.split(',');
    if (ips.length > 0 && ips[0]) {
      return ips[0].trim();
    }
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  return request.ip || '0.0.0.0';
}

function sanitizeQuery(query: any): any {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitized = { ...query };
  const sensitiveParams = ['password', 'token', 'secret', 'apiKey', 'api_key'];
  
  for (const param of sensitiveParams) {
    if (sanitized[param]) {
      sanitized[param] = '***REDACTED***';
    }
  }

  return sanitized;
}

export async function pspRequestLogging(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const requestId = randomUUID();

  (request as any).requestId = requestId;

  const requestLogData: RequestLogData = {
    requestId,
    projectId: (request.user as any)?.project_id,
    apiKeyId: (request.user as any)?.api_key_id,
    clientIp: getClientIp(request),
    method: request.method,
    path: request.url,
    query: sanitizeQuery(request.query),
    userAgent: request.headers['user-agent'],
    environment: (request.user as any)?.environment,
    timestamp: new Date().toISOString()
  };

  logger.info({ msg: 'PSP API Request', ...requestLogData });

  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;

    const responseLogData: ResponseLogData = {
      ...requestLogData,
      statusCode: reply.statusCode,
      duration
    };

    if (reply.statusCode >= 500) {
      logger.error({ msg: 'PSP API Response - Server Error', ...responseLogData });
    } else if (reply.statusCode >= 400) {
      logger.warn({ msg: 'PSP API Response - Client Error', ...responseLogData });
    } else {
      logger.info({ msg: 'PSP API Response - Success', ...responseLogData });
    }

    if (duration > 2000) {
      logger.warn({
        msg: 'PSP API Slow Request',
        ...responseLogData,
        threshold: '2000ms'
      });
    }
  });
}

export async function pspRequestLoggingPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', pspRequestLogging);
}

export function getRequestId(request: FastifyRequest): string | undefined {
  return (request as any).requestId;
}

export function logWithContext(
  request: FastifyRequest,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  additionalData?: any
): void {
  const context = {
    msg: message,
    requestId: getRequestId(request),
    projectId: (request.user as any)?.project_id,
    apiKeyId: (request.user as any)?.api_key_id,
    path: request.url,
    method: request.method,
    ...additionalData
  };

  logger[level](context);
}

export async function auditLog(
  request: FastifyRequest,
  action: string,
  resource: string,
  details?: any
): Promise<void> {
  const auditData = {
    msg: 'PSP Audit Log',
    requestId: getRequestId(request),
    projectId: (request.user as any)?.project_id,
    apiKeyId: (request.user as any)?.api_key_id,
    userId: (request.user as any)?.id,
    clientIp: getClientIp(request),
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  };

  logger.info(auditData);
}
