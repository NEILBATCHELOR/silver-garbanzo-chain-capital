# PSP Middleware Documentation

## Overview

The PSP middleware layer provides comprehensive request handling, authentication, authorization, and protection for all Payment Service Provider API endpoints.

## Middleware Components

### 1. Request Logging (`requestLogging.ts`)

**Purpose**: Comprehensive request/response logging with timing and context tracking.

**Features**:
- Request ID generation for tracing
- Project context tracking
- Response timing metrics
- Error logging
- Slow request detection (> 2s threshold)
- Sanitized sensitive data

**Usage**:
```typescript
import { pspRequestLogging } from '@/middleware/psp';

fastify.addHook('onRequest', pspRequestLogging);
```

**Log Output**:
```json
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "projectId": "proj_abc123",
  "apiKeyId": "key_xyz789",
  "clientIp": "192.168.1.100",
  "method": "POST",
  "path": "/api/psp/payments/fiat",
  "statusCode": 201,
  "duration": 145,
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

---

### 2. API Key Validation (`apiKeyValidation.ts`)

**Purpose**: Validates API keys and attaches project context to requests.

**Features**:
- Bearer token extraction
- Key hash verification
- Expiration checking
- Status validation (active/suspended/revoked)
- IP whitelist enforcement
- Usage tracking

**Usage**:
```typescript
import { pspApiKeyValidation } from '@/middleware/psp';

fastify.addHook('onRequest', pspApiKeyValidation);
```

**Expected Header**:
```
Authorization: Bearer warp_abc123...
```

**Attached Context** (to `request.user`):
```typescript
{
  project_id: string;
  api_key_id: string;
  environment: 'sandbox' | 'production';
  warp_api_key: string; // Decrypted
}
```

**Error Responses**:
- `401 UNAUTHORIZED` - Missing or invalid key
- `401 INVALID_KEY` - Key not found or invalid hash
- `401 KEY_EXPIRED` - Key has expired
- `401 KEY_SUSPENDED` - Key is suspended
- `401 KEY_REVOKED` - Key is revoked
- `401 IP_NOT_WHITELISTED` - IP not in whitelist

---

### 3. IP Whitelist (`ipWhitelist.ts`)

**Purpose**: Validates that requests come from whitelisted IP addresses.

**Features**:
- IP extraction from headers (X-Forwarded-For, X-Real-IP)
- Whitelist validation
- CIDR range support (helper functions included)
- Detailed security logging

**Usage**:
```typescript
import { pspIpWhitelist } from '@/middleware/psp';

fastify.addHook('onRequest', pspIpWhitelist);
```

**Behavior**:
- If `ip_whitelist` is empty/null → Allow all IPs
- If `ip_whitelist` has entries → Only allow listed IPs
- Logs all denied attempts for security auditing

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "IP_NOT_WHITELISTED",
    "message": "Your IP address is not authorized to access this resource",
    "details": {
      "clientIp": "192.168.1.100"
    }
  }
}
```

---

### 4. Rate Limiting (`rateLimiting.ts`)

**Purpose**: Project-level rate limiting with configurable tiers.

**Features**:
- Per-project limits
- Sliding window algorithm
- Different limits per endpoint type
- In-memory store (Redis-ready)
- Automatic cleanup of expired entries

**Rate Limit Tiers**:
| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Standard | 100 req/min | 1 minute |
| Webhooks | 1000 req/min | 1 minute |
| Payments | 50 req/min | 1 minute |
| Identity | 20 req/min | 1 minute |
| Trades | 50 req/min | 1 minute |

**Usage**:
```typescript
import { pspRateLimiting } from '@/middleware/psp';

fastify.addHook('onRequest', pspRateLimiting);
```

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1706356800
```

**Error Response** (429 Too Many Requests):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 100 requests per 60 seconds.",
    "retryAfter": 45
  }
}
```

---

## Middleware Registration

### Option 1: Register All Middleware

```typescript
import { registerPspMiddleware } from '@/middleware/psp';

// Register all middleware with defaults
await registerPspMiddleware(fastify);

// Or with custom options
await registerPspMiddleware(fastify, {
  enableLogging: true,
  enableRateLimiting: true,
  enableIpWhitelist: true
});
```

### Option 2: Register Individual Middleware

```typescript
import {
  pspRequestLogging,
  pspApiKeyValidation,
  pspIpWhitelist,
  pspRateLimiting
} from '@/middleware/psp';

// IMPORTANT: Order matters!
fastify.addHook('onRequest', pspRequestLogging);    // 1. Logging
fastify.addHook('onRequest', pspApiKeyValidation);  // 2. Authentication
fastify.addHook('onRequest', pspIpWhitelist);       // 3. Authorization
fastify.addHook('onRequest', pspRateLimiting);      // 4. Protection
```

### Option 3: Use as Fastify Plugins

```typescript
import {
  pspRequestLoggingPlugin,
  pspApiKeyPlugin,
  pspIpWhitelistPlugin,
  pspRateLimitPlugin
} from '@/middleware/psp';

await fastify.register(pspRequestLoggingPlugin);
await fastify.register(pspApiKeyPlugin);
await fastify.register(pspIpWhitelistPlugin);
await fastify.register(pspRateLimitPlugin);
```

---

## Middleware Execution Order

The middleware executes in this order:

```
1. Request Logging
   ↓
2. API Key Validation
   ↓
3. IP Whitelist Check
   ↓
4. Rate Limiting
   ↓
5. Route Handler
```

**Why This Order?**
1. **Logging first** - Captures all requests (even failures)
2. **Auth second** - Establish identity before authorization
3. **IP check third** - Verify authorized source
4. **Rate limit last** - Protect resources after validation

---

## Advanced Usage

### Custom Rate Limit Status Check

```typescript
import { getRateLimitStatus } from '@/middleware/psp';

const status = getRateLimitStatus('proj_123', 'payments');
console.log(status);
// {
//   count: 25,
//   limit: 50,
//   remaining: 25,
//   resetTime: 1706356800000
// }
```

### Audit Logging for Sensitive Operations

```typescript
import { auditLog } from '@/middleware/psp';

await auditLog(
  request,
  'CREATE_PAYMENT',
  'payment_xyz',
  { amount: '1000', currency: 'USD' }
);
```

### Context-Aware Logging

```typescript
import { logWithContext } from '@/middleware/psp';

logWithContext(
  request,
  'info',
  'Payment processed successfully',
  { paymentId: 'pay_123', amount: '1000' }
);
```

### Get Request ID

```typescript
import { getRequestId } from '@/middleware/psp';

const requestId = getRequestId(request);
console.log(`Processing request: ${requestId}`);
```

---

## Testing

### Test API Key Validation

```bash
# Valid request
curl -H "Authorization: Bearer warp_valid_key" \
  https://api.example.com/api/psp/payments

# Invalid format
curl -H "Authorization: warp_invalid_format" \
  https://api.example.com/api/psp/payments
# → 401 UNAUTHORIZED

# Missing header
curl https://api.example.com/api/psp/payments
# → 401 UNAUTHORIZED
```

### Test IP Whitelist

```bash
# From whitelisted IP
curl -H "Authorization: Bearer warp_key" \
  -H "X-Forwarded-For: 192.168.1.100" \
  https://api.example.com/api/psp/payments

# From non-whitelisted IP
curl -H "Authorization: Bearer warp_key" \
  -H "X-Forwarded-For: 10.0.0.1" \
  https://api.example.com/api/psp/payments
# → 403 IP_NOT_WHITELISTED
```

### Test Rate Limiting

```bash
# Rapid requests to trigger limit
for i in {1..101}; do
  curl -H "Authorization: Bearer warp_key" \
    https://api.example.com/api/psp/payments
done
# After 100 requests → 429 RATE_LIMIT_EXCEEDED
```

---

## Production Considerations

### 1. Rate Limiting with Redis

For distributed systems, replace in-memory store with Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// Use redis.get/set/expire for rate limit tracking
```

### 2. IP Whitelist with CIDR Support

Enable CIDR range matching for flexible IP management:

```typescript
import { isIpInCIDR } from '@/middleware/psp';

const allowed = isIpInCIDR('192.168.1.100', '192.168.1.0/24');
// true - IP is in range
```

### 3. Monitoring and Alerts

Set up alerts for:
- High rate limit violations
- Suspicious IP access patterns
- Expired/revoked key usage attempts
- Slow requests (> 2s)

### 4. Log Aggregation

Integrate with log aggregation services:
- Datadog
- New Relic
- CloudWatch
- ELK Stack

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate API keys** regularly (90-day cycle)
3. **Monitor failed auth attempts** for suspicious patterns
4. **Use strict IP whitelists** for production environments
5. **Set appropriate rate limits** based on usage patterns
6. **Log all security events** to audit table
7. **Enable all middleware** in production
8. **Review logs regularly** for security threats

---

## Troubleshooting

### Issue: 401 UNAUTHORIZED despite valid key

**Check**:
1. Key format: Must start with `warp_`
2. Key status: Must be `active`
3. Expiration: Check `expires_at` date
4. IP whitelist: Verify client IP is allowed

### Issue: 403 IP_NOT_WHITELISTED

**Check**:
1. Client IP in `ip_whitelist` array
2. X-Forwarded-For header correct
3. Proxy configuration

### Issue: 429 RATE_LIMIT_EXCEEDED

**Check**:
1. Request volume within limits
2. Rate limit tier appropriate for endpoint
3. Consider upgrading limits for production

---

## API Reference

See individual middleware files for detailed API documentation:
- `apiKeyValidation.ts` - Authentication
- `ipWhitelist.ts` - Authorization
- `rateLimiting.ts` - Resource protection
- `requestLogging.ts` - Observability
