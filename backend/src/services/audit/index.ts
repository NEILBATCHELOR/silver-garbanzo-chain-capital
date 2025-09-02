// Audit services index - Chain Capital
// Exports all audit-related services, types, and utilities

// Main services
import { AuditService } from './AuditService'
import { AuditValidationService } from './AuditValidationService'
import { AuditAnalyticsService } from './AuditAnalyticsService'

export { AuditService, AuditValidationService, AuditAnalyticsService }

// Types and interfaces
export * from './types'

// Service factory for dependency injection
export class AuditServiceFactory {
  private static auditServiceInstance: AuditService
  private static validationServiceInstance: AuditValidationService
  private static analyticsServiceInstance: AuditAnalyticsService

  static getAuditService(): AuditService {
    if (!this.auditServiceInstance) {
      this.auditServiceInstance = new AuditService()
    }
    return this.auditServiceInstance
  }

  static getValidationService(): AuditValidationService {
    if (!this.validationServiceInstance) {
      this.validationServiceInstance = new AuditValidationService()
    }
    return this.validationServiceInstance
  }

  static getAnalyticsService(): AuditAnalyticsService {
    if (!this.analyticsServiceInstance) {
      this.analyticsServiceInstance = new AuditAnalyticsService()
    }
    return this.analyticsServiceInstance
  }

  static getAllServices() {
    return {
      audit: this.getAuditService(),
      validation: this.getValidationService(),
      analytics: this.getAnalyticsService()
    }
  }
}

// Note: Convenience exports removed to prevent database initialization issues
// Use AuditServiceFactory.getAuditService() etc. instead
