import { BaseService } from '../BaseService'
import {
  CreateAuditEventRequest,
  AuditCategory,
  AuditSeverity,
  AuditServiceResult,
  AuditComplianceReport
} from './types'

/**
 * Audit Validation Service for Chain Capital
 * Handles validation of audit data and compliance checking
 */
export class AuditValidationService extends BaseService {
  
  constructor() {
    super('AuditValidation')
  }

  /**
   * Validate audit event data
   */
  async validateAuditEvent(eventData: CreateAuditEventRequest): Promise<AuditServiceResult<{
    valid: boolean
    errors: string[]
    warnings: string[]
    suggestions: string[]
  }>> {
    try {
      const errors: string[] = []
      const warnings: string[] = []
      const suggestions: string[] = []

      // Required field validation
      if (!eventData.action || eventData.action.trim().length === 0) {
        errors.push('Action is required')
      }

      if (!eventData.category) {
        errors.push('Category is required')
      }

      // Action length validation
      if (eventData.action && eventData.action.length > 255) {
        errors.push('Action must be 255 characters or less')
      }

      // Details length validation
      if (eventData.details && eventData.details.length > 2000) {
        errors.push('Details must be 2000 characters or less')
      }

      // Severity validation
      if (eventData.severity && !Object.values(AuditSeverity).includes(eventData.severity)) {
        errors.push('Invalid severity level')
      }

      // Category validation
      if (eventData.category && !Object.values(AuditCategory).includes(eventData.category)) {
        errors.push('Invalid category')
      }

      // Business logic validation
      if (eventData.category === AuditCategory.SECURITY && !eventData.severity) {
        warnings.push('Security events should have a severity level')
        suggestions.push('Consider adding a severity level for better tracking')
      }

      if (eventData.category === AuditCategory.DATA_OPERATION && !eventData.entity_type) {
        warnings.push('Data operations should specify entity type')
        suggestions.push('Add entity_type for better categorization')
      }

      if (eventData.category === AuditCategory.USER_ACTION && !eventData.user_id) {
        warnings.push('User actions should include user_id')
        suggestions.push('Add user_id for proper user activity tracking')
      }

      // Metadata validation
      if (eventData.metadata) {
        try {
          JSON.stringify(eventData.metadata)
        } catch {
          errors.push('Metadata must be valid JSON')
        }
      }

      const isValid = errors.length === 0

      return this.success({
        valid: isValid,
        errors,
        warnings,
        suggestions
      })
    } catch (error) {
      this.logger.error({ error, eventData }, 'Failed to validate audit event')
      return this.error('Failed to validate audit event', 'VALIDATION_ERROR')
    }
  }

  /**
   * Check compliance with regulatory standards
   */
  async checkCompliance(standard: string): Promise<AuditServiceResult<AuditComplianceReport>> {
    try {
      const reportId = this.generateId()
      const now = new Date()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      // Get audit events for compliance analysis
      const auditEvents = await this.db.audit_logs.findMany({
        where: {
          timestamp: {
            gte: thirtyDaysAgo,
            lte: now
          }
        }
      })

      const totalEvents = auditEvents.length
      let compliantEvents = 0
      let nonCompliantEvents = 0
      const findings: any[] = []

      // Standard-specific compliance checking
      switch (standard.toLowerCase()) {
        case 'sox':
          // SOX compliance checks
          const financialEvents = auditEvents.filter(e => 
            e.entity_type === 'financial' || 
            e.action?.includes('financial') ||
            e.category === 'compliance'
          )
          compliantEvents = financialEvents.length
          nonCompliantEvents = totalEvents - compliantEvents

          if (financialEvents.length === 0) {
            findings.push({
              category: 'Financial Controls',
              severity: AuditSeverity.HIGH,
              description: 'No financial control events found',
              recommendation: 'Implement financial transaction auditing',
              affected_records: totalEvents
            })
          }
          break

        case 'gdpr':
          // GDPR compliance checks
          const personalDataEvents = auditEvents.filter(e => 
            e.metadata && JSON.stringify(e.metadata).includes('personal') ||
            e.entity_type === 'user_data'
          )
          compliantEvents = personalDataEvents.length
          nonCompliantEvents = totalEvents - compliantEvents

          if (personalDataEvents.length === 0) {
            findings.push({
              category: 'Data Processing',
              severity: AuditSeverity.MEDIUM,
              description: 'Limited personal data processing audit trails',
              recommendation: 'Enhance personal data processing logging',
              affected_records: totalEvents
            })
          }
          break

        case 'pci':
          // PCI DSS compliance checks
          const paymentEvents = auditEvents.filter(e => 
            e.entity_type === 'payment' || 
            e.action?.includes('payment') ||
            e.action?.includes('card')
          )
          compliantEvents = paymentEvents.length
          nonCompliantEvents = totalEvents - compliantEvents
          break

        case 'iso27001':
          // ISO 27001 compliance checks
          const securityEvents = auditEvents.filter(e => 
            e.category === AuditCategory.SECURITY ||
            e.category === AuditCategory.AUTHENTICATION
          )
          compliantEvents = securityEvents.length
          nonCompliantEvents = totalEvents - compliantEvents
          break

        default:
          return this.error('Unsupported compliance standard', 'UNSUPPORTED_STANDARD', 400)
      }

      // Data integrity checks
      const tamperedRecords = auditEvents.filter(e => e.status === 'tampered').length
      const missingRecords = 0 // Would need specific logic to detect missing records
      const verifiedRecords = totalEvents - tamperedRecords - missingRecords
      const integrityScore = totalEvents > 0 ? (verifiedRecords / totalEvents) * 100 : 100

      const complianceReport: AuditComplianceReport = {
        report_id: reportId,
        generated_at: now,
        period: {
          start_date: thirtyDaysAgo,
          end_date: now
        },
        compliance_standard: standard.toUpperCase(),
        summary: {
          total_events: totalEvents,
          compliant_events: compliantEvents,
          non_compliant_events: nonCompliantEvents,
          compliance_percentage: totalEvents > 0 ? (compliantEvents / totalEvents) * 100 : 0
        },
        findings,
        data_integrity: {
          verified_records: verifiedRecords,
          tampered_records: tamperedRecords,
          missing_records: missingRecords,
          integrity_score: integrityScore
        }
      }

      return this.success(complianceReport)
    } catch (error) {
      this.logger.error({ error, standard }, 'Failed to check compliance')
      return this.error('Failed to check compliance', 'COMPLIANCE_CHECK_ERROR')
    }
  }

  /**
   * Validate audit data retention policies
   */
  async validateRetentionCompliance(): Promise<AuditServiceResult<{
    compliant: boolean
    issues: string[]
    recommendations: string[]
  }>> {
    try {
      const issues: string[] = []
      const recommendations: string[] = []

      // Check for very old records that should be archived
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      const oldRecords = await this.db.audit_logs.count({
        where: {
          timestamp: {
            lt: oneYearAgo
          },
          severity: {
            not: AuditSeverity.CRITICAL
          }
        }
      })

      if (oldRecords > 10000) {
        issues.push(`${oldRecords} old audit records should be archived`)
        recommendations.push('Consider implementing automated archival for records older than 1 year')
      }

      // Check for missing critical security events
      const recentCriticalEvents = await this.db.audit_logs.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          severity: AuditSeverity.CRITICAL
        }
      })

      if (recentCriticalEvents === 0) {
        recommendations.push('Monitor for critical security events - none found in the last week')
      }

      const isCompliant = issues.length === 0

      return this.success({
        compliant: isCompliant,
        issues,
        recommendations
      })
    } catch (error) {
      this.logger.error({ error }, 'Failed to validate retention compliance')
      return this.error('Failed to validate retention compliance', 'RETENTION_VALIDATION_ERROR')
    }
  }

  /**
   * Validate audit trail integrity
   */
  async validateAuditIntegrity(entityType: string, entityId: string): Promise<AuditServiceResult<{
    valid: boolean
    issues: string[]
    trail_length: number
  }>> {
    try {
      const auditTrail = await this.db.audit_logs.findMany({
        where: {
          entity_type: entityType,
          entity_id: entityId
        },
        orderBy: {
          timestamp: 'asc'
        }
      })

      const issues: string[] = []

      if (auditTrail.length === 0) {
        issues.push('No audit trail found for this entity')
        return this.success({
          valid: false,
          issues,
          trail_length: 0
        })
      }

      // Check for gaps in audit trail
      const timestamps = auditTrail
        .map(event => event.timestamp?.getTime())
        .filter((time): time is number => time !== undefined && time !== null)
        .sort((a, b) => a - b)

      for (let i = 1; i < timestamps.length; i++) {
        const currentTime = timestamps[i]
        const previousTime = timestamps[i - 1]
        
        if (currentTime !== undefined && previousTime !== undefined) {
          const timeDiff = currentTime - previousTime
          // Flag gaps longer than 24 hours for active entities
          if (timeDiff > 24 * 60 * 60 * 1000) {
            issues.push(`Audit trail gap detected: ${new Date(previousTime)} to ${new Date(currentTime)}`)
          }
        }
      }

      // Check for duplicate correlation IDs
      const correlationIds = auditTrail
        .map(event => event.correlation_id)
        .filter(id => id)
      const uniqueCorrelationIds = new Set(correlationIds)
      if (correlationIds.length !== uniqueCorrelationIds.size) {
        issues.push('Duplicate correlation IDs detected in audit trail')
      }

      const isValid = issues.length === 0

      return this.success({
        valid: isValid,
        issues,
        trail_length: auditTrail.length
      })
    } catch (error) {
      this.logger.error({ error, entityType, entityId }, 'Failed to validate audit integrity')
      return this.error('Failed to validate audit integrity', 'INTEGRITY_VALIDATION_ERROR')
    }
  }
}
