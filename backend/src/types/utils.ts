/**
 * Utility Types
 * Common TypeScript utility types and helpers used across the backend
 */

/**
 * JSON type alias for database JSON fields (matches Prisma Json type)
 */
export type Json = any

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Make specific fields required in a type
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific fields optional in a type
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Create input type by omitting auto-generated fields
 */
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Update input type with partial fields except ID and createdAt
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt'>>
