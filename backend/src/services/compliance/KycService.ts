/**
 * KycService
 * Specialized service for KYC (Know Your Customer) and AML (Anti-Money Laundering) operations
 * Handles verification workflows, document validation, and regulatory compliance
 */

import { BaseService } from '../BaseService'
import type {
  ServiceResult,
  PaginatedResponse,
  QueryOptions
} from '@/types/index'

// KYC/AML Types
export interface KycVerificationRequest {
  investor_id: string
  verification_type: 'individual' | 'corporate' | 'institutional'
  verification_level: 'basic' | 'enhanced' | 'comprehensive'
  documents: Array<{
    type: string
    file_url: string
    metadata?: Record<string, any>
  }>
  provider?: string
  force_reverification?: boolean
}

export interface KycVerificationResult {
  verification_id: string
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired'
  verification_score: number
  risk_score: number
  verification_data: {
    identity_verified: boolean
    address_verified: boolean
    document_verification: Record<string, any>
    biometric_verification?: Record<string, any>
    sanctions_check: {
      status: 'clear' | 'match' | 'review_required'
      matches: any[]
    }
    pep_check: {
      status: 'clear' | 'match' | 'review_required'
      matches: any[]
    }
    adverse_media_check: {
      status: 'clear' | 'match' | 'review_required'
      matches: any[]
    }
  }
  required_actions: string[]
  expiry_date?: Date
  provider_response?: Record<string, any>
}

export interface AmlScreeningRequest {
  entity_id: string
  entity_type: 'investor' | 'issuer' | 'organization'
  entity_data: {
    name: string
    legal_name?: string
    date_of_birth?: string
    nationality?: string
    address?: Record<string, any>
    identification_numbers?: Record<string, string>
  }
  screening_types: Array<'sanctions' | 'pep' | 'adverse_media' | 'watchlist'>
  provider?: string
}

export interface DocumentVerificationRequest {
  document_type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'articles_of_incorporation' | 'certificate_of_good_standing'
  document_url: string
  entity_id: string
  entity_type: 'investor' | 'issuer'
  verification_requirements?: {
    extract_data: boolean
    verify_authenticity: boolean
    check_expiry: boolean
  }
}

export interface OnboardingWorkflow {
  id: string
  entity_id: string
  entity_type: 'investor' | 'issuer'
  workflow_type: 'individual_kyc' | 'corporate_kyc' | 'institutional_kyc' | 'issuer_onboarding'
  current_step: string
  total_steps: number
  completed_steps: string[]
  pending_steps: string[]
  status: 'not_started' | 'in_progress' | 'pending_review' | 'completed' | 'rejected'
  completion_percentage: number
  estimated_completion_time?: Date
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export class KycService extends BaseService {
  constructor() {
    super('KYC')
  }

  /**
   * Initiate KYC verification process
   */
  async initiateKycVerification(request: KycVerificationRequest): Promise<ServiceResult<KycVerificationResult>> {
    try {
      const {
        investor_id,
        verification_type,
        verification_level,
        documents,
        provider = 'onfido',
        force_reverification = false
      } = request

      // Validate investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id },
        select: {
          investor_id: true,
          name: true,
          email: true,
          kyc_status: true,
          kyc_expiry_date: true,
          verification_details: true
        }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Check if reverification is needed
      if (!force_reverification && investor.kyc_status === 'approved' && 
          investor.kyc_expiry_date && investor.kyc_expiry_date > new Date()) {
        return this.error('KYC verification is still valid. Use force_reverification=true to override.', 'CONFLICT', 409)
      }

      // Create verification record
      const verificationId = this.generateId()
      
      // Perform document verification
      const documentResults = await Promise.all(
        documents.map(doc => this.verifyDocument({
          document_type: doc.type as any,
          document_url: doc.file_url,
          entity_id: investor_id,
          entity_type: 'investor',
          verification_requirements: {
            extract_data: true,
            verify_authenticity: true,
            check_expiry: true
          }
        }))
      )

      // Perform AML screening
      const amlResult = await this.performAmlScreening({
        entity_id: investor_id,
        entity_type: 'investor',
        entity_data: {
          name: investor.name,
          // Add other investor data as needed
        },
        screening_types: ['sanctions', 'pep', 'adverse_media'],
        provider: 'chainalysis' // or other AML provider
      })

      // Calculate verification score
      const verificationScore = this.calculateVerificationScore(documentResults, amlResult.data)
      const riskScore = this.calculateRiskScore(amlResult.data, verification_type)

      // Determine verification status
      let status: KycVerificationResult['status'] = 'pending'
      const requiredActions: string[] = []

      if (verificationScore >= 80 && riskScore <= 30) {
        status = 'approved'
      } else if (verificationScore < 50 || riskScore > 70) {
        status = 'rejected'
        requiredActions.push('Resubmit verification documents')
      } else {
        status = 'pending'
        requiredActions.push('Manual review required')
      }

      // Calculate expiry date (typically 1 year from now)
      const expiryDate = status === 'approved' ? 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined

      // Update investor KYC status
      await this.db.investors.update({
        where: { investor_id },
        data: {
          kyc_status: status === 'approved' ? 'approved' : 
                     status === 'rejected' ? 'failed' : 'pending',
          kyc_expiry_date: expiryDate,
          verification_details: {
            provider,
            verification_id: verificationId,
            verification_score: verificationScore,
            risk_score: riskScore,
            last_verified: new Date()
          },
          updated_at: new Date()
        }
      })

      // Create verification result
      const result: KycVerificationResult = {
        verification_id: verificationId,
        status,
        verification_score: verificationScore,
        risk_score: riskScore,
        verification_data: {
          identity_verified: verificationScore >= 60,
          address_verified: verificationScore >= 70,
          document_verification: this.aggregateDocumentResults(documentResults),
          sanctions_check: amlResult.data?.sanctions_check || { status: 'clear', matches: [] },
          pep_check: amlResult.data?.pep_check || { status: 'clear', matches: [] },
          adverse_media_check: amlResult.data?.adverse_media_check || { status: 'clear', matches: [] }
        },
        required_actions: requiredActions,
        expiry_date: expiryDate,
        provider_response: {
          provider,
          timestamp: new Date(),
          request_id: verificationId
        }
      }

      // Log audit event
      await this.logActivity(
        'kyc_verification_initiated',
        'investor',
        investor_id,
        { verification_type, verification_level, status, verification_score: verificationScore, risk_score: riskScore },
        'system'
      )

      return this.success(result)
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to initiate KYC verification')
      return this.error('Failed to initiate KYC verification', 'DATABASE_ERROR')
    }
  }

  /**
   * Verify document using external provider or internal validation
   */
  async verifyDocument(request: DocumentVerificationRequest): Promise<ServiceResult<{
    document_type: string
    verification_status: 'verified' | 'failed' | 'pending'
    extracted_data?: Record<string, any>
    verification_score: number
    issues: string[]
  }>> {
    try {
      const {
        document_type,
        document_url,
        entity_id,
        entity_type,
        verification_requirements = {
          extract_data: true,
          verify_authenticity: true,
          check_expiry: true
        }
      } = request

      // This is a placeholder implementation
      // In real implementation, this would integrate with document verification providers
      // like Onfido, Jumio, Trulioo, etc.

      const mockResult = {
        document_type,
        verification_status: 'verified' as const,
        extracted_data: {
          name: 'John Doe',
          document_number: 'ABC123456',
          expiry_date: '2025-12-31',
          issue_date: '2020-01-01'
        },
        verification_score: 85,
        issues: []
      }

      // Log verification attempt
      await this.logActivity(
        'document_verification_completed',
        entity_type,
        entity_id,
        { document_type, verification_status: mockResult.verification_status, verification_score: mockResult.verification_score },
        'system'
      )

      return this.success(mockResult)
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to verify document')
      return this.error('Failed to verify document', 'VERIFICATION_ERROR')
    }
  }

  /**
   * Perform AML screening
   */
  async performAmlScreening(request: AmlScreeningRequest): Promise<ServiceResult<{
    sanctions_check: { status: 'clear' | 'match' | 'review_required'; matches: any[] }
    pep_check: { status: 'clear' | 'match' | 'review_required'; matches: any[] }
    adverse_media_check: { status: 'clear' | 'match' | 'review_required'; matches: any[] }
    overall_risk_score: number
    recommendation: 'approve' | 'reject' | 'review'
  }>> {
    try {
      const { entity_id, entity_type, entity_data, screening_types, provider = 'chainalysis' } = request

      // This is a placeholder implementation
      // In real implementation, this would integrate with AML screening providers
      // like Chainalysis, Elliptic, WorldCheck, Dow Jones, etc.

      const mockResult = {
        sanctions_check: { status: 'clear' as const, matches: [] },
        pep_check: { status: 'clear' as const, matches: [] },
        adverse_media_check: { status: 'clear' as const, matches: [] },
        overall_risk_score: 15,
        recommendation: 'approve' as const
      }

      // Log screening attempt
      await this.logActivity(
        'aml_screening_completed',
        entity_type,
        entity_id,
        { screening_types, provider, overall_risk_score: mockResult.overall_risk_score, recommendation: mockResult.recommendation },
        'system'
      )

      return this.success(mockResult)
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to perform AML screening')
      return this.error('Failed to perform AML screening', 'SCREENING_ERROR')
    }
  }

  /**
   * Get KYC status for entity
   */
  async getKycStatus(entity_id: string, entity_type: 'investor' | 'issuer'): Promise<ServiceResult<{
    entity_id: string
    entity_type: string
    kyc_status: string
    verification_level?: string
    expiry_date?: Date
    last_verified?: Date
    compliance_score: number
    required_actions: string[]
    documents_status: Record<string, any>
  }>> {
    try {
      let entity: any
      
      if (entity_type === 'investor') {
        entity = await this.db.investors.findUnique({
          where: { investor_id: entity_id },
          select: {
            investor_id: true,
            name: true,
            kyc_status: true,
            kyc_expiry_date: true,
            verification_details: true,
            last_compliance_check: true
          }
        })
      } else {
        // For issuers, we'd query organizations table
        entity = await this.db.organizations.findUnique({
          where: { id: entity_id },
          select: {
            id: true,
            name: true,
            compliance_status: true,
            onboarding_completed: true
          }
        })
      }

      if (!entity) {
        return this.error('Entity not found', 'NOT_FOUND', 404)
      }

      // Calculate compliance score
      const complianceScore = await this.calculateComplianceScore(entity_id, entity_type)

      // Determine required actions
      const requiredActions = await this.getRequiredActions(entity_id, entity_type, entity)

      // Get documents status
      const documentsStatus = await this.getDocumentsStatus(entity_id, entity_type)

      const result = {
        entity_id,
        entity_type,
        kyc_status: entity_type === 'investor' ? entity.kyc_status : entity.compliance_status,
        verification_level: entity.verification_details?.verification_level,
        expiry_date: entity.kyc_expiry_date,
        last_verified: entity.verification_details?.last_verified,
        compliance_score: complianceScore,
        required_actions: requiredActions,
        documents_status: documentsStatus
      }

      return this.success(result)
    } catch (error) {
      this.logger.error({ error, entity_id, entity_type }, 'Failed to get KYC status')
      return this.error('Failed to get KYC status', 'DATABASE_ERROR')
    }
  }

  /**
   * Create onboarding workflow
   */
  async createOnboardingWorkflow(data: {
    entity_id: string
    entity_type: 'investor' | 'issuer'
    workflow_type: OnboardingWorkflow['workflow_type']
    custom_steps?: string[]
  }): Promise<ServiceResult<OnboardingWorkflow>> {
    try {
      const { entity_id, entity_type, workflow_type, custom_steps } = data

      // Define default workflow steps
      const workflowSteps = custom_steps || this.getDefaultWorkflowSteps(workflow_type)

      // Create workflow
      const workflow: OnboardingWorkflow = {
        id: this.generateId(),
        entity_id,
        entity_type,
        workflow_type,
        current_step: workflowSteps[0] || 'initial_setup',
        total_steps: workflowSteps.length,
        completed_steps: [],
        pending_steps: workflowSteps,
        status: 'not_started',
        completion_percentage: 0,
        estimated_completion_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        metadata: {
          workflow_steps: workflowSteps,
          created_by: 'system'
        },
        created_at: new Date(),
        updated_at: new Date()
      }

      // TODO: Store workflow in database (need to create onboarding_workflows table)
      
      return this.success(workflow)
    } catch (error) {
      this.logger.error({ error, data }, 'Failed to create onboarding workflow')
      return this.error('Failed to create onboarding workflow', 'DATABASE_ERROR')
    }
  }

  /**
   * Update workflow step completion
   */
  async updateWorkflowStep(
    workflow_id: string,
    step_name: string,
    status: 'completed' | 'failed' | 'skipped'
  ): Promise<ServiceResult<OnboardingWorkflow>> {
    try {
      // TODO: Implement workflow step update
      // This would update the workflow in the database and recalculate completion percentage
      
      const mockWorkflow: OnboardingWorkflow = {
        id: workflow_id,
        entity_id: 'test',
        entity_type: 'investor',
        workflow_type: 'individual_kyc',
        current_step: step_name,
        total_steps: 5,
        completed_steps: [step_name],
        pending_steps: ['step2', 'step3'],
        status: 'in_progress',
        completion_percentage: 20,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      }

      return this.success(mockWorkflow)
    } catch (error) {
      this.logger.error({ error, workflow_id, step_name, status }, 'Failed to update workflow step')
      return this.error('Failed to update workflow step', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private calculateVerificationScore(documentResults: any[], amlResult: any): number {
    let score = 0
    
    // Document verification score (60% weight)
    if (documentResults.length > 0) {
      const avgDocScore = documentResults.reduce((sum, result) => 
        sum + (result.data?.verification_score || 0), 0
      ) / documentResults.length
      score += avgDocScore * 0.6
    }

    // AML screening score (40% weight)
    if (amlResult && amlResult.overall_risk_score !== undefined) {
      const amlScore = 100 - amlResult.overall_risk_score // Invert risk score to verification score
      score += amlScore * 0.4
    }

    return Math.round(score)
  }

  private calculateRiskScore(amlResult: any, verificationType: string): number {
    let riskScore = 10 // Base risk score

    if (amlResult) {
      // Add risk based on AML findings
      if (amlResult.sanctions_check?.status === 'match') riskScore += 50
      if (amlResult.pep_check?.status === 'match') riskScore += 30
      if (amlResult.adverse_media_check?.status === 'match') riskScore += 20
    }

    // Adjust based on verification type
    if (verificationType === 'institutional') {
      riskScore += 5 // Institutional entities have slightly higher base risk
    } else if (verificationType === 'corporate') {
      riskScore += 10 // Corporate entities have higher base risk
    }

    return Math.min(riskScore, 100) // Cap at 100
  }

  private aggregateDocumentResults(documentResults: any[]): Record<string, any> {
    const aggregated: Record<string, any> = {}

    documentResults.forEach((result, index) => {
      if (result.success && result.data) {
        aggregated[`document_${index}`] = {
          type: result.data.document_type,
          status: result.data.verification_status,
          score: result.data.verification_score,
          issues: result.data.issues
        }
      }
    })

    return aggregated
  }

  private async calculateComplianceScore(entity_id: string, entity_type: string): Promise<number> {
    // This would calculate a comprehensive compliance score based on:
    // - KYC status
    // - Document completeness
    // - AML screening results
    // - Regulatory requirements
    return 85 // Placeholder
  }

  private async getRequiredActions(entity_id: string, entity_type: string, entity: any): Promise<string[]> {
    const actions: string[] = []

    if (entity_type === 'investor') {
      if (entity.kyc_status === 'not_started') {
        actions.push('Complete KYC verification')
      }
      if (entity.kyc_status === 'failed') {
        actions.push('Resubmit KYC documents')
      }
      if (entity.kyc_expiry_date && entity.kyc_expiry_date <= new Date()) {
        actions.push('Renew KYC verification')
      }
    }

    return actions
  }

  private async getDocumentsStatus(entity_id: string, entity_type: string): Promise<Record<string, any>> {
    const status: Record<string, any> = {}

    if (entity_type === 'investor') {
      // TODO: investor_documents table not in Prisma schema - using issuer_documents as fallback
      const documents = await this.db.issuer_documents.findMany({
        where: { issuer_id: entity_id },
        select: {
          document_type: true,
          status: true,
          uploaded_at: true,
          expires_at: true
        }
      })

      documents.forEach((doc: any) => {
        status[doc.document_type] = {
          status: doc.status,
          uploaded_at: doc.uploaded_at,
          expires_at: doc.expires_at
        }
      })
    } else {
      const documents = await this.db.issuer_documents.findMany({
        where: { issuer_id: entity_id },
        select: {
          document_type: true,
          status: true,
          uploaded_at: true,
          expires_at: true
        }
      })

      documents.forEach(doc => {
        status[doc.document_type] = {
          status: doc.status,
          uploaded_at: doc.uploaded_at,
          expires_at: doc.expires_at
        }
      })
    }

    return status
  }

  private getDefaultWorkflowSteps(workflow_type: OnboardingWorkflow['workflow_type']): string[] {
    const workflows = {
      individual_kyc: [
        'personal_information',
        'identity_verification',
        'address_verification',
        'source_of_funds',
        'final_review'
      ],
      corporate_kyc: [
        'company_information',
        'beneficial_ownership',
        'corporate_documents',
        'authorized_signatories',
        'compliance_review',
        'final_approval'
      ],
      institutional_kyc: [
        'institutional_profile',
        'regulatory_status',
        'compliance_documentation',
        'risk_assessment',
        'due_diligence_review',
        'final_approval'
      ],
      issuer_onboarding: [
        'organization_setup',
        'legal_documentation',
        'compliance_verification',
        'token_structure_review',
        'regulatory_approval',
        'platform_integration'
      ]
    }

    return workflows[workflow_type] || ['basic_verification', 'compliance_check', 'final_review']
  }
}