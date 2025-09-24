/**
 * Date utilities for financial calculations
 */

export const DAYS_IN_YEAR = 365.25

/**
 * Calculate years between two dates
 * Uses Actual/365.25 day count convention
 */
export function yearsBetween(startDate: Date, endDate: Date): number {
  const millisPerDay = 24 * 60 * 60 * 1000
  const daysDiff = (endDate.getTime() - startDate.getTime()) / millisPerDay
  return daysDiff / DAYS_IN_YEAR
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const millisPerDay = 24 * 60 * 60 * 1000
  return Math.round((endDate.getTime() - startDate.getTime()) / millisPerDay)
}

/**
 * Day count conventions for bond calculations
 */
export enum DayCountConvention {
  ACTUAL_365 = 'ACTUAL_365',
  ACTUAL_360 = 'ACTUAL_360',
  THIRTY_360 = 'THIRTY_360',
  ACTUAL_ACTUAL = 'ACTUAL_ACTUAL'
}

/**
 * Calculate year fraction based on day count convention
 */
export function yearFraction(
  startDate: Date, 
  endDate: Date, 
  convention: DayCountConvention = DayCountConvention.ACTUAL_365
): number {
  switch (convention) {
    case DayCountConvention.ACTUAL_365:
      return daysBetween(startDate, endDate) / 365
    
    case DayCountConvention.ACTUAL_360:
      return daysBetween(startDate, endDate) / 360
    
    case DayCountConvention.THIRTY_360:
      // 30/360 convention: assumes 30 days per month
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      const d1 = Math.min(start.getDate(), 30)
      const d2 = end.getDate() === 31 && d1 >= 30 ? 30 : end.getDate()
      
      const days = 360 * (end.getFullYear() - start.getFullYear()) +
                   30 * (end.getMonth() - start.getMonth()) +
                   (d2 - d1)
      
      return days / 360
    
    case DayCountConvention.ACTUAL_ACTUAL:
      // For simplicity, using 365.25
      return daysBetween(startDate, endDate) / 365.25
    
    default:
      return yearsBetween(startDate, endDate)
  }
}

/**
 * Add business days to a date (excluding weekends)
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let daysAdded = 0
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1)
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++
    }
  }
  
  return result
}

/**
 * Check if date is a business day
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6  // Not Sunday or Saturday
}

/**
 * Get the next coupon date for a bond
 */
export function getNextCouponDate(
  settlementDate: Date,
  maturityDate: Date,
  frequency: number  // Payments per year
): Date {
  const monthsBetweenPayments = 12 / frequency
  const nextDate = new Date(settlementDate)
  
  // Start from maturity and work backwards to find next coupon date
  const couponDate = new Date(maturityDate)
  
  while (couponDate > settlementDate) {
    const previousCouponDate = new Date(couponDate)
    previousCouponDate.setMonth(previousCouponDate.getMonth() - monthsBetweenPayments)
    
    if (previousCouponDate <= settlementDate) {
      return couponDate
    }
    
    couponDate.setMonth(couponDate.getMonth() - monthsBetweenPayments)
  }
  
  return nextDate
}
