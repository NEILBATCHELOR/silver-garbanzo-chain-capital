/**
 * Compliance Services Index
 * Exports all compliance-related services and types
 */

// Import the service classes first
import { ComplianceService } from './ComplianceService'
import { KycService } from './KycService'
import { DocumentComplianceService } from './DocumentComplianceService'
import { OrganizationComplianceService } from './OrganizationComplianceService'

// Re-export the service classes
export { ComplianceService } from './ComplianceService'
export { KycService } from './KycService'
export { DocumentComplianceService } from './DocumentComplianceService'
export { OrganizationComplianceService } from './OrganizationComplianceService'

// Types from ComplianceService
export type {
  ComplianceCheck,
  ComplianceReport,
  KycVerification,
  AmlScreening,
  ComplianceMetrics,
  ComplianceSettings
} from './ComplianceService'

// Types from KycService
export type {
  KycVerificationRequest,
  KycVerificationResult,
  AmlScreeningRequest,
  DocumentVerificationRequest,
  OnboardingWorkflow
} from './KycService'

// Types from DocumentComplianceService
export type {
  DocumentComplianceCheck,
  DocumentValidationResult,
  ComplianceDocumentTemplate,
  BulkDocumentValidation
} from './DocumentComplianceService'

// Types from OrganizationComplianceService
export type {
  OrganizationComplianceProfile,
  KybVerificationRequest,
  ComplianceOnboardingWorkflow,
  RegulatoryAssessment
} from './OrganizationComplianceService'

// Service factory for dependency injection
export class ComplianceServiceFactory {
  private static complianceService: ComplianceService | null = null
  private static kycService: KycService | null = null
  private static documentComplianceService: DocumentComplianceService | null = null
  private static organizationComplianceService: OrganizationComplianceService | null = null

  static getComplianceService(): ComplianceService {
    if (!this.complianceService) {
      this.complianceService = new ComplianceService()
    }
    return this.complianceService
  }

  static getKycService(): KycService {
    if (!this.kycService) {
      this.kycService = new KycService()
    }
    return this.kycService
  }

  static getDocumentComplianceService(): DocumentComplianceService {
    if (!this.documentComplianceService) {
      this.documentComplianceService = new DocumentComplianceService()
    }
    return this.documentComplianceService
  }

  static getOrganizationComplianceService(): OrganizationComplianceService {
    if (!this.organizationComplianceService) {
      this.organizationComplianceService = new OrganizationComplianceService()
    }
    return this.organizationComplianceService
  }

  // Get all services as a single object
  static getAllServices() {
    return {
      complianceService: this.getComplianceService(),
      kycService: this.getKycService(),
      documentComplianceService: this.getDocumentComplianceService(),
      organizationComplianceService: this.getOrganizationComplianceService()
    }
  }

  // Reset all service instances (useful for testing)
  static resetInstances(): void {
    this.complianceService = null
    this.kycService = null
    this.documentComplianceService = null
    this.organizationComplianceService = null
  }
}