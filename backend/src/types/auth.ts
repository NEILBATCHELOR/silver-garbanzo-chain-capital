/**
 * Authentication and Authorization Types
 * Types related to user authentication, authorization, and security
 */

/**
 * Authenticated User interface
 */
export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
  permissions?: string[]
  status?: string
  emailVerified?: boolean
}

/**
 * Login credentials for authentication
 */
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Login response with user data and tokens
 */
export interface LoginResponse {
  user: AuthUser
  token: string
  refreshToken?: string
  expiresIn: string
}

/**
 * Database transaction wrapper for auth operations
 */
export interface DatabaseTransaction {
  commit(): Promise<void>
  rollback(): Promise<void>
}
