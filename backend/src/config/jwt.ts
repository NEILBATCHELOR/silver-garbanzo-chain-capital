import { FastifyJWTOptions } from '@fastify/jwt'

/**
 * JWT configuration for authentication
 * Provides secure token-based authentication
 */
export const jwtOptions: FastifyJWTOptions = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  verify: {},
  decode: { complete: true },
  messages: {
    badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
    noAuthorizationInHeaderMessage: 'Authorization header is missing!',
    authorizationTokenExpiredMessage: 'Authorization token expired',
    authorizationTokenInvalid: 'Authorization token is invalid',
    authorizationTokenUntrusted: 'Untrusted authorization token'
  }
}

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string
  email: string
  role?: string
  permissions?: string[]
  iat?: number
  exp?: number
  iss?: string
  aud?: string
}

/**
 * Generate JWT token for user
 */
export function generateTokenPayload(user: {
  id: string
  email: string
  role?: string
  permissions?: string[]
}): JWTPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || []
  }
}
