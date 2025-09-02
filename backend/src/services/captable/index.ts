// Captable Services - Module exports
// Provides centralized exports for all captable services

import { CapTableService } from './CapTableService'
import { CapTableValidationService } from './CapTableValidationService'
import { CapTableAnalyticsService } from './CapTableAnalyticsService'

export { CapTableService } from './CapTableService'
export { CapTableValidationService } from './CapTableValidationService'
export { CapTableAnalyticsService } from './CapTableAnalyticsService'

// Export all types
export * from '@/types/captable-service'

// Service factory functions for dependency injection
export function createCapTableService(): CapTableService {
  return new CapTableService()
}

export function createCapTableValidationService(): CapTableValidationService {
  return new CapTableValidationService()
}

export function createCapTableAnalyticsService(): CapTableAnalyticsService {
  return new CapTableAnalyticsService()
}

// Service manager for coordinated operations
export class CapTableServiceManager {
  private capTableService: CapTableService
  private validationService: CapTableValidationService
  private analyticsService: CapTableAnalyticsService

  constructor() {
    this.capTableService = new CapTableService()
    this.validationService = new CapTableValidationService()
    this.analyticsService = new CapTableAnalyticsService()
  }

  /**
   * Get cap table service
   */
  getCapTableService(): CapTableService {
    return this.capTableService
  }

  /**
   * Get validation service
   */
  getValidationService(): CapTableValidationService {
    return this.validationService
  }

  /**
   * Get analytics service
   */
  getAnalyticsService(): CapTableAnalyticsService {
    return this.analyticsService
  }

  /**
   * Create cap table with validation
   */
  async createCapTableWithValidation(data: any, userId?: string) {
    // Validate first
    const validationResult = await this.validationService.validateCapTableCreate(data)
    if (!validationResult.success || !validationResult.data?.isValid) {
      return validationResult
    }

    // Create if validation passes
    return await this.capTableService.createCapTable(data, userId)
  }

  /**
   * Create investor with validation
   */
  async createInvestorWithValidation(data: any, userId?: string) {
    // Validate first
    const validationResult = await this.validationService.validateInvestorCreate(data)
    if (!validationResult.success || !validationResult.data?.isValid) {
      return validationResult
    }

    // Create if validation passes
    return await this.capTableService.createInvestor(data, userId)
  }

  /**
   * Create subscription with validation
   */
  async createSubscriptionWithValidation(data: any, userId?: string) {
    // Validate first
    const validationResult = await this.validationService.validateSubscriptionCreate(data)
    if (!validationResult.success || !validationResult.data?.isValid) {
      return validationResult
    }

    // Create if validation passes
    return await this.capTableService.createSubscription(data, userId)
  }

  /**
   * Get comprehensive cap table report
   */
  async getCapTableReport(projectId: string) {
    // Get cap table details
    const capTableResult = await this.capTableService.getCapTableByProject(projectId, {
      includeStats: true,
      includeRelated: true
    })

    if (!capTableResult.success) {
      return capTableResult
    }

    // Get analytics
    const analyticsResult = await this.analyticsService.getCapTableAnalytics(projectId)

    return {
      success: true,
      data: {
        capTable: capTableResult.data,
        analytics: analyticsResult.data
      }
    }
  }
}

// Lazy initialization of service manager
let _capTableServiceManager: CapTableServiceManager | null = null

/**
 * Get cap table service manager instance (lazy initialization)
 */
export function getCapTableServiceManager(): CapTableServiceManager {
  if (!_capTableServiceManager) {
    _capTableServiceManager = new CapTableServiceManager()
  }
  return _capTableServiceManager
}

// Backward compatibility export
export const capTableServiceManager = {
  get instance() {
    return getCapTableServiceManager()
  }
}
