import { FastifyJWTOptions } from '@fastify/jwt'

/**
 * JWT configuration for authentication
 * Provides secure token-based authentication
 * 
 * IMPORTANT: We use SUPABASE_JWT_SECRET to verify tokens issued by Supabase Auth
 * This allows the backend to verify JWTs that the frontend receives from Supabase
 */
export const jwtOptions: FastifyJWTOptions = {
  // Use Supabase JWT secret for verifying tokens issued by Supabase Auth
  secret: process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  sign: {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  verify: {
    // Supabase tokens always have audience: "authenticated"
    // This ensures we only accept tokens from Supabase Auth
  },
  decode: { complete: true },
  messages: {
    badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
    noAuthorizationInHeaderMessage: 'Authorization header is missing!',
    authorizationTokenExpiredMessage: 'Authorization token expired',
    authorizationTokenInvalid: (err) => `Authorization token is invalid: ${err.message}`,
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
