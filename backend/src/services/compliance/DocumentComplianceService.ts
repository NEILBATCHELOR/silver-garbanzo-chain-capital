/**
 * DocumentComplianceService
 * Specialized service for document compliance verification, approval workflows,
 * and regulatory document management
 */

import { BaseService } from '../BaseService'
import type {
  ServiceResult,
  PaginatedResponse,
  QueryOptions
} from '@/types/index'

// Document Compliance Types
export interface DocumentComplianceCheck {
  id: string
  document_id: string
  document_type: string
  entity_id: string
  entity_type: 'investor' | 'issuer' | 'organization'
  compliance_status: 'pending' | 'approved' | 'rejected' | 'requires_review' | 'expired'
  verification_level: 'basic' | 'enhanced' | 'comprehensive'
  verification_results: {
    authenticity_check: boolean
    data_extraction: Record<string, any>
    expiry_validation: boolean
    format_validation: boolean
    completeness_score: number
    issues: string[]
  }
  regulatory_requirements: Array<{
    requirement_type: string
    status: 'met' | 'not_met' | 'pending'
    description: string
  }>
  approval_workflow: {
    current_stage: string
    approvers: Array<{
      role: string
      user_id?: string
      approved_at?: Date
      comments?: string
    }>
    auto_approval_eligible: boolean
  }
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface DocumentValidationResult {
  document_id: string
  is_valid: boolean
  validation_score: number
  validation_checks: Array<{
    check_type: string
    passed: boolean
    details: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
  extracted_data: Record<string, any>
  recommendations: string[]
  compliance_gaps: Array<{
    requirement: string
    gap_description: string
    remediation_steps: string[]
  }>
}

export interface ComplianceDocumentTemplate {
  id: string
  document_type: string
  template_name: string
  entity_type: 'investor' | 'issuer' | 'organization'
  jurisdiction: string
  required_fields: Array<{
    field_name: string
    field_type: string
    is_required: boolean
    validation_rules: Record<string, any>
  }>
  acceptance_criteria: Array<{
    criterion: string
    description: string
    mandatory: boolean
  }>
  regulatory_references: string[]
  template_version: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface BulkDocumentValidation {
  batch_id: string
  total_documents: number
  processed_documents: number
  successful_validations: number
  failed_validations: number
  pending_validations: number
  validation_results: DocumentValidationResult[]
  batch_status: 'pending' | 'processing' | 'completed' | 'failed'
  started_at: Date
  completed_at?: Date
  error_summary?: string[]
}

export class DocumentComplianceService extends BaseService {
  constructor() {
    super('DocumentCompliance')
  }

  /**
   * Validate document compliance
   */
  async validateDocumentCompliance(data: {
    document_id?: string
    document_url?: string
    document_type: string
    entity_id: string
    entity_type: 'investor' | 'issuer' | 'organization'
    validation_level?: 'basic' | 'enhanced' | 'comprehensive'
    jurisdiction?: string
  }): Promise<ServiceResult<DocumentValidationResult>> {
    try {
      const {
        document_id,
        document_url,
        document_type,
        entity_id,
        entity_type,
        validation_level = 'enhanced',
        jurisdiction = 'US'
      } = data

      // Get document if document_id provided
      let documentRecord: any = null
      if (document_id) {
        if (entity_type === 'investor') {
          // TODO: investor_documents table not in Prisma schema - using issuer_documents as fallback
          documentRecord = await this.db.issuer_documents.findUnique({
            where: { id: document_id }
          })
        } else {
          documentRecord = await this.db.issuer_documents.findUnique({
            where: { id: document_id }
          })
        }

        if (!documentRecord) {
          return this.error('Document not found', 'NOT_FOUND', 404)
        }
      }

      // Get compliance template for document type
      const template = await this.getComplianceTemplate(document_type, entity_type, jurisdiction)

      // Perform validation checks
      const validationChecks = await this.performValidationChecks(
        documentRecord?.file_url || document_url,
        document_type,
        validation_level,
        template
      )

      // Extract data from document
      const extractedData = await this.extractDocumentData(
        documentRecord?.file_url || document_url,
        document_type,
        template?.required_fields || []
      )

      // Calculate validation score
      const validationScore = this.calculateValidationScore(validationChecks, extractedData, template)

      // Generate recommendations
      const recommendations = this.generateRecommendations(validationChecks, extractedData, template)

      // Identify compliance gaps
      const complianceGaps = this.identifyComplianceGaps(validationChecks, template)

      const result: DocumentValidationResult = {
        document_id: document_id || this.generateId(),
        is_valid: validationScore >= 70 && !validationChecks.some(check => 
          check.severity === 'critical' && !check.passed
        ),
        validation_score: validationScore,
        validation_checks: validationChecks,
        extracted_data: extractedData,
        recommendations,
        compliance_gaps: complianceGaps
      }

      // Log validation activity
      await this.logActivity(
        'document_compliance_validated',
        entity_type,
        entity_id,
        {
          document_type,
          validation_level,
          validation_score: validationScore,
          is_valid: result.is_valid
        },
        'system'
      )

      return this.success(result)
    } catch (error) {
      this.logError('Failed to validate document compliance', { error, data })
      return this.error('Failed to validate document compliance', 'VALIDATION_ERROR')
    }
  }

  /**
   * Create compliance check for document
   */
  async createDocumentComplianceCheck(data: {
    document_id: string
    entity_id: string
    entity_type: 'investor' | 'issuer' | 'organization'
    verification_level?: 'basic' | 'enhanced' | 'comprehensive'
    auto_approve?: boolean
  }): Promise<ServiceResult<DocumentComplianceCheck>> {
    try {
      const {
        document_id,
        entity_id,
        entity_type,
        verification_level = 'enhanced',
        auto_approve = false
      } = data

      // Get document details
      let document: any = null
      if (entity_type === 'investor') {
        // TODO: investor_documents table not available in Prisma client - implement when available
        this.logWarn('investor_documents table not available in Prisma client')
        return this.error('Investor document validation not available', 'NOT_IMPLEMENTED', 501)
      } else {
        document = await this.db.issuer_documents.findUnique({
          where: { id: document_id }
        })
      }

      if (!document) {
        return this.error('Document not found', 'NOT_FOUND', 404)
      }

      // Check if compliance check already exists
      // TODO: document_compliance_checks table not in Prisma schema - using compliance_checks as fallback
      // Note: At this point entity_type can only be 'issuer' | 'organization' due to early return above
      const existingCheck = await this.db.compliance_checks?.findFirst({
        where: {
          // investor_id: undefined, // entity_type cannot be 'investor' at this point
          // document_id: document_id // TODO: Add when table updated
        }
      })

      if (existingCheck) {
        return this.error('Compliance check already exists for this document', 'CONFLICT', 409)
      }

      // Validate document compliance
      const validationResult = await this.validateDocumentCompliance({
        document_id,
        document_type: document.document_type,
        entity_id,
        entity_type,
        validation_level: verification_level
      })

      if (!validationResult.success) {
        return this.error('Failed to validate document for compliance check', 'VALIDATION_ERROR')
      }

      // Determine compliance status
      let complianceStatus: DocumentComplianceCheck['compliance_status'] = 'pending'
      if (auto_approve && validationResult.data!.is_valid && validationResult.data!.validation_score >= 85) {
        complianceStatus = 'approved'
      } else if (validationResult.data!.validation_score < 50) {
        complianceStatus = 'rejected'
      }

      // Create compliance check record
      const complianceCheck: DocumentComplianceCheck = {
        id: this.generateId(),
        document_id,
        document_type: document.document_type,
        entity_id,
        entity_type,
        compliance_status: complianceStatus,
        verification_level,
        verification_results: {
          authenticity_check: validationResult.data!.validation_score >= 70,
          data_extraction: validationResult.data!.extracted_data,
          expiry_validation: !validationResult.data!.compliance_gaps.some(gap => 
            gap.requirement.includes('expiry')
          ),
          format_validation: validationResult.data!.validation_checks.every(check => 
            check.check_type !== 'format' || check.passed
          ),
          completeness_score: validationResult.data!.validation_score,
          issues: validationResult.data!.compliance_gaps.map(gap => gap.gap_description)
        },
        regulatory_requirements: this.mapComplianceGapsToRequirements(validationResult.data!.compliance_gaps),
        approval_workflow: {
          current_stage: complianceStatus === 'approved' ? 'completed' : 'initial_review',
          approvers: [
            {
              role: 'system',
              user_id: 'system',
              approved_at: complianceStatus === 'approved' ? new Date() : undefined,
              comments: auto_approve ? 'Auto-approved based on validation score' : undefined
            }
          ],
          auto_approval_eligible: auto_approve
        },
        metadata: {
          validation_score: validationResult.data!.validation_score,
          validation_timestamp: new Date(),
          auto_approved: complianceStatus === 'approved'
        },
        created_at: new Date(),
        updated_at: new Date()
      }

      // TODO: Store in database (need to create document_compliance_checks table)

      // Update document status if approved
      if (complianceStatus === 'approved') {
        // Note: entity_type can only be 'issuer' | 'organization' at this point due to early return above
        await this.db.issuer_documents.update({
          where: { id: document_id },
          data: {
            status: 'approved',
            last_reviewed_at: new Date(),
            reviewed_by: 'system'
          }
        })
      }

      return this.success(complianceCheck)
    } catch (error) {
      this.logError('Failed to create document compliance check', { error, data })
      return this.error('Failed to create document compliance check', 'DATABASE_ERROR')
    }
  }

  /**
   * Perform bulk document validation
   */
  async performBulkDocumentValidation(data: {
    document_ids: string[]
    entity_type: 'investor' | 'issuer'
    validation_level?: 'basic' | 'enhanced' | 'comprehensive'
    auto_approve?: boolean
  }): Promise<ServiceResult<BulkDocumentValidation>> {
    try {
      const {
        document_ids,
        entity_type,
        validation_level = 'enhanced',
        auto_approve = false
      } = data

      const batchId = this.generateId()
      const validationResults: DocumentValidationResult[] = []
      let successfulValidations = 0
      let failedValidations = 0

      const bulkValidation: BulkDocumentValidation = {
        batch_id: batchId,
        total_documents: document_ids.length,
        processed_documents: 0,
        successful_validations: 0,
        failed_validations: 0,
        pending_validations: document_ids.length,
        validation_results: [],
        batch_status: 'processing',
        started_at: new Date()
      }

      // Process each document
      for (const documentId of document_ids) {
        try {
          // Get document details
          let document: any = null
          if (entity_type === 'investor') {
            document = await this.db.investor_documents.findUnique({
              where: { id: documentId },
              select: {
                id: true,
                document_type: true,
                investor_id: true,
                file_url: true
              }
            })
          } else {
            document = await this.db.issuer_documents.findUnique({
              where: { id: documentId },
              select: {
                id: true,
                document_type: true,
                issuer_id: true,
                file_url: true
              }
            })
          }

          if (!document) {
            failedValidations++
            continue
          }

          // Validate document
          const validationResult = await this.validateDocumentCompliance({
            document_id: documentId,
            document_type: document.document_type,
            entity_id: entity_type === 'investor' ? document.investor_id : document.issuer_id,
            entity_type,
            validation_level
          })

          if (validationResult.success && validationResult.data) {
            validationResults.push(validationResult.data)
            successfulValidations++

            // Create compliance check if auto_approve enabled
            if (auto_approve) {
              await this.createDocumentComplianceCheck({
                document_id: documentId,
                entity_id: entity_type === 'investor' ? document.investor_id : document.issuer_id,
                entity_type,
                verification_level: validation_level,
                auto_approve: true
              })
            }
          } else {
            failedValidations++
          }

          bulkValidation.processed_documents++
        } catch (error) {
          this.logError('Failed to validate document in bulk operation', { error, documentId })
          failedValidations++
          bulkValidation.processed_documents++
        }
      }

      // Update bulk validation result
      bulkValidation.successful_validations = successfulValidations
      bulkValidation.failed_validations = failedValidations
      bulkValidation.pending_validations = 0
      bulkValidation.validation_results = validationResults
      bulkValidation.batch_status = 'completed'
      bulkValidation.completed_at = new Date()

      return this.success(bulkValidation)
    } catch (error) {
      this.logError('Failed to perform bulk document validation', { error, data })
      return this.error('Failed to perform bulk document validation', 'VALIDATION_ERROR')
    }
  }

  /**
   * Get compliance templates for document types
   */
  async getComplianceTemplates(filters: {
    document_type?: string
    entity_type?: 'investor' | 'issuer' | 'organization'
    jurisdiction?: string
    is_active?: boolean
  } = {}): Promise<ServiceResult<ComplianceDocumentTemplate[]>> {
    try {
      // This is a placeholder - in real implementation, templates would be stored in database
      const mockTemplates: ComplianceDocumentTemplate[] = [
        {
          id: '1',
          document_type: 'passport',
          template_name: 'Individual Passport Verification',
          entity_type: 'investor',
          jurisdiction: 'US',
          required_fields: [
            {
              field_name: 'full_name',
              field_type: 'string',
              is_required: true,
              validation_rules: { min_length: 2, max_length: 100 }
            },
            {
              field_name: 'passport_number',
              field_type: 'string',
              is_required: true,
              validation_rules: { pattern: '^[A-Z0-9]{6,9}$' }
            },
            {
              field_name: 'expiry_date',
              field_type: 'date',
              is_required: true,
              validation_rules: { min_date: new Date() }
            }
          ],
          acceptance_criteria: [
            {
              criterion: 'document_authenticity',
              description: 'Document must pass authenticity verification',
              mandatory: true
            },
            {
              criterion: 'expiry_validation',
              description: 'Document must not be expired',
              mandatory: true
            }
          ],
          regulatory_references: ['31 CFR 1020.220', 'BSA Customer Identification Program'],
          template_version: '1.0',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]

      // Apply filters
      let filteredTemplates = mockTemplates
      if (filters.document_type) {
        filteredTemplates = filteredTemplates.filter(t => t.document_type === filters.document_type)
      }
      if (filters.entity_type) {
        filteredTemplates = filteredTemplates.filter(t => t.entity_type === filters.entity_type)
      }
      if (filters.jurisdiction) {
        filteredTemplates = filteredTemplates.filter(t => t.jurisdiction === filters.jurisdiction)
      }
      if (filters.is_active !== undefined) {
        filteredTemplates = filteredTemplates.filter(t => t.is_active === filters.is_active)
      }

      return this.success(filteredTemplates)
    } catch (error) {
      this.logError('Failed to get compliance templates', { error, filters })
      return this.error('Failed to get compliance templates', 'DATABASE_ERROR')
    }
  }

  /**
   * Private helper methods
   */

  private async getComplianceTemplate(
    documentType: string,
    entityType: string,
    jurisdiction: string
  ): Promise<ComplianceDocumentTemplate | null> {
    const templatesResult = await this.getComplianceTemplates({
      document_type: documentType,
      entity_type: entityType as any,
      jurisdiction,
      is_active: true
    })

    return templatesResult.success && templatesResult.data && templatesResult.data.length > 0 
      ? templatesResult.data[0] || null
      : null
  }

  private async performValidationChecks(
    documentUrl: string,
    documentType: string,
    validationLevel: string,
    template: ComplianceDocumentTemplate | null
  ): Promise<Array<{
    check_type: string
    passed: boolean
    details: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>> {
    const checks = []

    // Format validation
    checks.push({
      check_type: 'format',
      passed: true, // Placeholder
      details: 'Document format is valid',
      severity: 'medium' as const
    })

    // Authenticity check
    checks.push({
      check_type: 'authenticity',
      passed: true, // Placeholder
      details: 'Document appears authentic',
      severity: 'high' as const
    })

    // Expiry validation
    checks.push({
      check_type: 'expiry',
      passed: true, // Placeholder
      details: 'Document is not expired',
      severity: 'critical' as const
    })

    // Template compliance
    if (template) {
      checks.push({
        check_type: 'template_compliance',
        passed: true, // Placeholder
        details: 'Document meets template requirements',
        severity: 'high' as const
      })
    }

    return checks
  }

  private async extractDocumentData(
    documentUrl: string,
    documentType: string,
    requiredFields: any[]
  ): Promise<Record<string, any>> {
    // This is a placeholder implementation
    // In real implementation, this would use OCR/AI services to extract data
    return {
      full_name: 'John Doe',
      document_number: 'ABC123456',
      expiry_date: '2025-12-31',
      issue_date: '2020-01-01'
    }
  }

  private calculateValidationScore(
    validationChecks: any[],
    extractedData: Record<string, any>,
    template: ComplianceDocumentTemplate | null
  ): number {
    let score = 0
    let maxScore = 0

    // Score based on validation checks
    validationChecks.forEach(check => {
      const weight = check.severity === 'critical' ? 30 : 
                    check.severity === 'high' ? 20 : 
                    check.severity === 'medium' ? 15 : 10
      
      maxScore += weight
      if (check.passed) {
        score += weight
      }
    })

    // Score based on data extraction completeness
    if (template) {
      const requiredFieldsCount = template.required_fields.filter(f => f.is_required).length
      const extractedRequiredFields = template.required_fields.filter(f => 
        f.is_required && extractedData[f.field_name]
      ).length

      const dataCompletenessScore = requiredFieldsCount > 0 ? 
        (extractedRequiredFields / requiredFieldsCount) * 20 : 20

      score += dataCompletenessScore
      maxScore += 20
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  }

  private generateRecommendations(
    validationChecks: any[],
    extractedData: Record<string, any>,
    template: ComplianceDocumentTemplate | null
  ): string[] {
    const recommendations: string[] = []

    // Check for failed validations
    const failedChecks = validationChecks.filter(check => !check.passed)
    failedChecks.forEach(check => {
      if (check.check_type === 'expiry') {
        recommendations.push('Please provide a non-expired document')
      } else if (check.check_type === 'authenticity') {
        recommendations.push('Document authenticity could not be verified. Please provide an original document.')
      } else if (check.check_type === 'format') {
        recommendations.push('Please ensure document is in acceptable format (PDF, JPG, PNG)')
      }
    })

    // Check for missing required fields
    if (template) {
      const missingFields = template.required_fields.filter(field => 
        field.is_required && !extractedData[field.field_name]
      )
      
      if (missingFields.length > 0) {
        recommendations.push(`Please ensure document contains: ${missingFields.map(f => f.field_name).join(', ')}`)
      }
    }

    return recommendations
  }

  private identifyComplianceGaps(
    validationChecks: any[],
    template: ComplianceDocumentTemplate | null
  ): Array<{
    requirement: string
    gap_description: string
    remediation_steps: string[]
  }> {
    const gaps: Array<{
      requirement: string
      gap_description: string
      remediation_steps: string[]
    }> = []

    // Check for critical validation failures
    const criticalFailures = validationChecks.filter(check => 
      !check.passed && check.severity === 'critical'
    )

    criticalFailures.forEach(failure => {
      gaps.push({
        requirement: failure.check_type,
        gap_description: failure.details,
        remediation_steps: [
          'Provide a valid document that meets the requirement',
          'Contact support if you believe this is an error'
        ]
      })
    })

    return gaps
  }

  private mapComplianceGapsToRequirements(gaps: any[]): Array<{
    requirement_type: string
    status: 'met' | 'not_met' | 'pending'
    description: string
  }> {
    return gaps.map(gap => ({
      requirement_type: gap.requirement,
      status: 'not_met' as const,
      description: gap.gap_description
    }))
  }
}