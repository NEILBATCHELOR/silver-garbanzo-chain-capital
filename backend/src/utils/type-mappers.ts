/**
 * Type Mapping Utilities
 * Handles conversion between database null values and TypeScript undefined values
 */

/**
 * Converts database null values to undefined for optional fields
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * Converts undefined values to null for database operations
 */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value
}

/**
 * Maps database result to TypeScript interface by converting nulls to undefined
 */
export function mapDatabaseResult<T extends Record<string, any>>(result: T): T {
  const mapped = { ...result }
  
  for (const key in mapped) {
    if (mapped[key] === null) {
      (mapped[key] as any) = undefined
    } else if (typeof mapped[key] === 'object' && mapped[key] !== null) {
      // Recursively map nested objects
      mapped[key] = mapDatabaseResult(mapped[key])
    }
  }
  
  return mapped
}

/**
 * Maps array of database results
 */
export function mapDatabaseResults<T extends Record<string, any>>(results: T[]): T[] {
  return results.map(result => mapDatabaseResult(result))
}

/**
 * Safe JSON field converter - converts null JSON fields to undefined
 */
export function mapJsonField<T>(field: T | null): T | undefined {
  return nullToUndefined(field)
}

/**
 * Type-safe property mapper for optional fields
 */
export function mapOptionalFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const mapped = { ...obj }
  
  fields.forEach(field => {
    if (mapped[field] === null) {
      (mapped[field] as any) = undefined
    }
  })
  
  return mapped
}
