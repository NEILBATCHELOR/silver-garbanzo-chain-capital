/**
 * Decimal Helper Utilities
 * 
 * Utilities for converting between Prisma Decimal and JavaScript number types
 * Handles precision and type safety for financial calculations
 */

import { Decimal } from '@prisma/client/runtime/library'

/**
 * Convert Prisma Decimal to number safely
 */
export function decimalToNumber(decimal: Decimal | null | undefined): number {
  if (!decimal) return 0
  return decimal.toNumber()
}

/**
 * Convert Prisma Decimal to string safely (for API compatibility)
 * Returns '0' for null/undefined values
 */
export function decimalToString(decimal: Decimal | null | undefined): string {
  if (!decimal) return '0'
  return decimal.toString()
}

/**
 * Convert Prisma Decimal to string or null (preserves null)
 */
export function decimalToStringOrNull(decimal: Decimal | null | undefined): string | null {
  if (!decimal) return null
  return decimal.toString()
}

/**
 * Convert number to Prisma Decimal
 */
export function numberToDecimal(num: number | null | undefined): Decimal {
  if (num === null || num === undefined) return new Decimal(0)
  return new Decimal(num)
}

/**
 * Add two decimal values safely
 */
export function addDecimals(a: Decimal | number, b: Decimal | number): number {
  const decA = a instanceof Decimal ? a : new Decimal(a || 0)
  const decB = b instanceof Decimal ? b : new Decimal(b || 0)
  return decA.add(decB).toNumber()
}

/**
 * Subtract two decimal values safely
 */
export function subtractDecimals(a: Decimal | number, b: Decimal | number): number {
  const decA = a instanceof Decimal ? a : new Decimal(a || 0)
  const decB = b instanceof Decimal ? b : new Decimal(b || 0)
  return decA.sub(decB).toNumber()
}

/**
 * Multiply two decimal values safely
 */
export function multiplyDecimals(a: Decimal | number, b: Decimal | number): number {
  const decA = a instanceof Decimal ? a : new Decimal(a || 0)
  const decB = b instanceof Decimal ? b : new Decimal(b || 0)
  return decA.mul(decB).toNumber()
}

/**
 * Divide two decimal values safely
 */
export function divideDecimals(a: Decimal | number, b: Decimal | number): number {
  const decA = a instanceof Decimal ? a : new Decimal(a || 0)
  const decB = b instanceof Decimal ? b : new Decimal(b || 0)
  if (decB.isZero()) return 0
  return decA.div(decB).toNumber()
}

/**
 * Compare decimal values
 */
export function compareDecimals(a: Decimal | number, b: Decimal | number): number {
  const decA = a instanceof Decimal ? a : new Decimal(a || 0)
  const decB = b instanceof Decimal ? b : new Decimal(b || 0)
  return decA.comparedTo(decB)
}

/**
 * Check if decimal is greater than another
 */
export function isGreaterThan(a: Decimal | number, b: Decimal | number): boolean {
  return compareDecimals(a, b) > 0
}

/**
 * Check if decimal is less than another
 */
export function isLessThan(a: Decimal | number, b: Decimal | number): boolean {
  return compareDecimals(a, b) < 0
}

/**
 * Check if decimal is greater than or equal to another
 */
export function isGreaterThanOrEqual(a: Decimal | number, b: Decimal | number): boolean {
  return compareDecimals(a, b) >= 0
}

/**
 * Check if decimal is less than or equal to another
 */
export function isLessThanOrEqual(a: Decimal | number, b: Decimal | number): boolean {
  return compareDecimals(a, b) <= 0
}

/**
 * Convert null values to undefined for TypeScript compatibility
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * Safely convert database record with Decimal fields to API response format
 */
export function convertDatabaseRecord<T extends Record<string, any>>(
  record: T,
  decimalFields: (keyof T)[]
): T {
  const converted = { ...record }
  
  for (const field of decimalFields) {
    const value = converted[field]
    if (value && typeof value === 'object' && 'toNumber' in value) {
      converted[field] = (value as any).toNumber() as T[keyof T]
    }
  }
  
  return converted
}

/**
 * Convert array of database records with Decimal fields
 */
export function convertDatabaseRecords<T extends Record<string, any>>(
  records: T[],
  decimalFields: (keyof T)[]
): T[] {
  return records.map(record => convertDatabaseRecord(record, decimalFields))
}
