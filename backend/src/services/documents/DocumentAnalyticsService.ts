import { BaseService } from '../BaseService'
import { 
  DocumentStatistics,
  DocumentAnalytics,
  DocumentStatus,
  DocumentCategory,
  EntityType,
  DocumentExportOptions,
  DocumentQueryOptions,
  DocumentAuditEntry,
  Document
} from '@/types/document-service'
import { ServiceResult } from '@/types/index'

/**
 * Document Analytics Service
 * 
 * Provides comprehensive analytics and reporting for documents including:
 * - Statistical summaries and metrics
 * - Trend analysis and reporting
 * - Entity breakdown and user activity
 * - Export capabilities in multiple formats
 * - Performance metrics and insights
 */
export class DocumentAnalyticsService extends BaseService {

  constructor() {
    super('DocumentAnalytics')
  }

  // === Core Analytics ===

  /**
   * Get comprehensive document statistics
   */
  async getDocumentStatistics(filters?: DocumentQueryOptions): Promise<ServiceResult<DocumentStatistics>> {
    try {
      const whereClause = this.buildWhereClause(filters)
      
      // Get total documents
      const totalDocuments = await this.db.documents.count({ where: whereClause })

      // Get documents by status
      const statusCounts = await this.db.documents.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { _all: true }
      })

      const byStatus = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count._all
        return acc
      }, {} as Record<string, number>)

      // Get documents by type
      const typeCounts = await this.db.documents.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { _all: true }
      })

      const byType = typeCounts.reduce((acc, item) => {
        acc[item.type] = item._count._all
        return acc
      }, {} as Record<string, number>)

      // Get documents by category
      const categoryCounts = await this.db.documents.groupBy({
        by: ['category'],
        where: whereClause,
        _count: { _all: true }
      })

      const byCategory = categoryCounts.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = item._count._all
        }
        return acc
      }, {} as Record<string, number>)

      // Get documents by entity type
      const entityTypeCounts = await this.db.documents.groupBy({
        by: ['entity_type'],
        where: whereClause,
        _count: { _all: true }
      })

      const byEntityType = entityTypeCounts.reduce((acc, item) => {
        acc[item.entity_type] = item._count._all
        return acc
      }, {} as Record<string, number>)

      // Get expired documents
      const expiredCount = await this.db.documents.count({
        where: {
          ...whereClause,
          expiry_date: {
            lt: new Date()
          }
        }
      })

      // Get documents expiring soon (next 30 days)
      const expiringSoonCount = await this.db.documents.count({
        where: {
          ...whereClause,
          expiry_date: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      })

      // Get pending approvals
      const pendingApprovals = await this.db.document_approvals.count({
        where: {
          status: 'pending',
          documents: whereClause ? { ...whereClause } : undefined
        }
      })

      // Get total versions
      const totalVersions = await this.db.document_versions.count({
        where: {
          documents: whereClause ? { ...whereClause } : undefined
        }
      })

      // Calculate storage used (mock calculation - would integrate with actual storage)
      const storageUsed = totalDocuments * 1024 * 1024 // Mock: 1MB per document

      // Calculate average approval time
      const averageApprovalTime = await this.calculateAverageApprovalTime(whereClause)

      const statistics: DocumentStatistics = {
        total_documents: totalDocuments,
        by_status: byStatus,
        by_type: byType,
        by_category: byCategory,
        by_entity_type: byEntityType,
        expired_count: expiredCount,
        expiring_soon_count: expiringSoonCount,
        pending_approvals: pendingApprovals,
        total_versions: totalVersions,
        storage_used: storageUsed,
        average_approval_time: averageApprovalTime
      }

      return this.success(statistics)

    } catch (error) {
      this.logger.error({ error, filters }, 'Failed to get document statistics')
      return this.error('Failed to get document statistics', 'STATS_ERROR')
    }
  }

  /**
   * Get comprehensive document analytics with trends
   */
  async getDocumentAnalytics(filters?: DocumentQueryOptions): Promise<ServiceResult<DocumentAnalytics>> {
    try {
      // Get basic statistics
      const statsResult = await this.getDocumentStatistics(filters)
      if (!statsResult.success) {
        return this.error('Failed to get statistics', 'STATS_ERROR')
      }

      const whereClause = this.buildWhereClause(filters)

      // Get upload trends by month
      const uploadTrends = await this.getUploadTrends(whereClause)
      
      // Get approval trends by month
      const approvalTrends = await this.getApprovalTrends(whereClause)
      
      // Get rejection trends by month
      const rejectionTrends = await this.getRejectionTrends(whereClause)

      // Get entity breakdown
      const entityBreakdown = await this.getEntityBreakdown(whereClause)

      // Get user activity
      const userActivity = await this.getUserActivity(whereClause)

      const analytics: DocumentAnalytics = {
        statistics: statsResult.data!,
        trends: {
          uploads_by_month: uploadTrends,
          approvals_by_month: approvalTrends,
          rejections_by_month: rejectionTrends
        },
        entity_breakdown: entityBreakdown,
        user_activity: userActivity
      }

      return this.success(analytics)

    } catch (error) {
      this.logger.error({ error, filters }, 'Failed to get document analytics')
      return this.error('Failed to get document analytics', 'ANALYTICS_ERROR')
    }
  }

  /**
   * Get document completion metrics for an entity
   */
  async getDocumentCompletionMetrics(entityType: string, entityId: string): Promise<ServiceResult<{
    required_documents: number;
    uploaded_documents: number;
    approved_documents: number;
    completion_percentage: number;
    missing_documents: string[];
    expired_documents: string[];
  }>> {
    try {
      const whereClause = { entity_type: entityType, entity_id: entityId }

      // Get all documents for entity
      const documents = await this.db.documents.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          status: true,
          expiry_date: true
        }
      })

      // Define required documents by entity type (this could be configurable)
      const requiredDocumentsByEntity: Record<string, string[]> = {
        [EntityType.ISSUER]: [
          'certificate_incorporation',
          'director_list',
          'shareholder_register',
          'financial_statements'
        ],
        [EntityType.INVESTOR]: [
          'aml_kyc_description',
          'proof_identity',
          'proof_address'
        ],
        [EntityType.PROJECT]: [
          'business_description',
          'regulatory_status'
        ]
      }

      const requiredTypes = requiredDocumentsByEntity[entityType] || []
      const uploadedTypes = documents.map(d => d.type)
      const approvedDocuments = documents.filter(d => d.status === DocumentStatus.APPROVED)
      const expiredDocuments = documents.filter(d => 
        d.expiry_date && new Date(d.expiry_date) < new Date()
      )

      const missingDocuments = requiredTypes.filter(type => !uploadedTypes.includes(type))
      const completionPercentage = requiredTypes.length > 0 
        ? Math.round((approvedDocuments.length / requiredTypes.length) * 100)
        : 100

      const metrics = {
        required_documents: requiredTypes.length,
        uploaded_documents: documents.length,
        approved_documents: approvedDocuments.length,
        completion_percentage: completionPercentage,
        missing_documents: missingDocuments,
        expired_documents: expiredDocuments.map(d => d.type)
      }

      return this.success(metrics)

    } catch (error) {
      this.logger.error({ error, entityType, entityId }, 'Failed to get completion metrics')
      return this.error('Failed to get completion metrics', 'METRICS_ERROR')
    }
  }

  /**
   * Export document data in specified format
   */
  async exportDocuments(options: DocumentExportOptions): Promise<ServiceResult<{
    format: string;
    data: any;
    filename: string;
    size: number;
  }>> {
    try {
      const whereClause = this.buildWhereClause(options.filters)
      
      // Get documents based on filters
      const documents = await this.db.documents.findMany({
        where: whereClause,
        include: {
          document_versions: options.include_versions,
          document_approvals: options.include_approvals
        },
        orderBy: { created_at: 'desc' }
      })

      let exportData: any
      let filename: string
      let size: number

      switch (options.format) {
        case 'csv':
          exportData = this.formatAsCSV(documents, options)
          filename = `documents_export_${new Date().toISOString().split('T')[0]}.csv`
          size = Buffer.byteLength(exportData, 'utf8')
          break

        case 'excel':
          exportData = this.formatAsExcel(documents, options)
          filename = `documents_export_${new Date().toISOString().split('T')[0]}.xlsx`
          size = exportData.length
          break

        case 'json':
          exportData = JSON.stringify(documents, null, 2)
          filename = `documents_export_${new Date().toISOString().split('T')[0]}.json`
          size = Buffer.byteLength(exportData, 'utf8')
          break

        case 'pdf':
          exportData = await this.formatAsPDF(documents, options)
          filename = `documents_report_${new Date().toISOString().split('T')[0]}.pdf`
          size = exportData.length
          break

        default:
          return this.error('Unsupported export format', 'INVALID_FORMAT', 400)
      }

      return this.success({
        format: options.format,
        data: exportData,
        filename,
        size
      })

    } catch (error) {
      this.logger.error({ error, options }, 'Failed to export documents')
      return this.error('Failed to export documents', 'EXPORT_ERROR')
    }
  }

  /**
   * Get document audit trail
   */
  async getDocumentAuditTrail(documentId: string, limit = 50): Promise<ServiceResult<DocumentAuditEntry[]>> {
    try {
      // Query audit logs for this document
      const auditEntries = await this.db.audit_logs.findMany({
        where: {
          entity_type: 'document',
          entity_id: documentId
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          user_id: true,
          user_email: true,
          timestamp: true,
          old_data: true,
          new_data: true,
          metadata: true,
          ip_address: true,
          user_agent: true
        }
      })

      const formattedEntries: DocumentAuditEntry[] = auditEntries.map(entry => ({
        id: entry.id,
        document_id: documentId,
        action: entry.action as any,
        user_id: entry.user_id || undefined,
        user_email: entry.user_email || undefined,
        timestamp: entry.timestamp,
        old_data: entry.old_data as any,
        new_data: entry.new_data as any,
        metadata: entry.metadata as any,
        ip_address: entry.ip_address || undefined,
        user_agent: entry.user_agent || undefined
      }))

      return this.success(formattedEntries)

    } catch (error) {
      this.logger.error({ error, documentId }, 'Failed to get audit trail')
      return this.error('Failed to get audit trail', 'AUDIT_ERROR')
    }
  }

  // === Private Helper Methods ===

  private buildWhereClause(filters?: DocumentQueryOptions): any {
    const where: any = {}

    if (!filters) return where

    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status
    }

    if (filters.type) {
      where.type = Array.isArray(filters.type) ? { in: filters.type } : filters.type
    }

    if (filters.category) {
      where.category = Array.isArray(filters.category) ? { in: filters.category } : filters.category
    }

    if (filters.entity_type) {
      where.entity_type = Array.isArray(filters.entity_type) ? { in: filters.entity_type } : filters.entity_type
    }

    if (filters.entity_id) {
      where.entity_id = Array.isArray(filters.entity_id) ? { in: filters.entity_id } : filters.entity_id
    }

    if (filters.project_id) {
      where.project_id = Array.isArray(filters.project_id) ? { in: filters.project_id } : filters.project_id
    }

    if (filters.created_after || filters.created_before) {
      where.created_at = {}
      if (filters.created_after) where.created_at.gte = new Date(filters.created_after)
      if (filters.created_before) where.created_at.lte = new Date(filters.created_before)
    }

    return where
  }

  private async calculateAverageApprovalTime(whereClause: any): Promise<number> {
    try {
      // Get approved documents with their approval dates
      const approvedDocs = await this.db.documents.findMany({
        where: {
          ...whereClause,
          status: DocumentStatus.APPROVED
        },
        include: {
          document_approvals: {
            where: { status: 'approved' },
            orderBy: { created_at: 'asc' },
            take: 1
          }
        }
      })

      if (approvedDocs.length === 0) return 0

      const approvalTimes = approvedDocs
        .filter(doc => doc.document_approvals.length > 0 && doc.created_at && doc.document_approvals[0]?.created_at)
        .map(doc => {
          const created = new Date(doc.created_at!)
          const approved = new Date(doc.document_approvals[0]!.created_at!)
          return approved.getTime() - created.getTime()
        })

      const average = approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length
      return Math.round(average / (1000 * 60 * 60)) // Convert to hours

    } catch (error) {
      this.logger.error({ error }, 'Failed to calculate average approval time')
      return 0
    }
  }

  private async getUploadTrends(whereClause: any): Promise<Array<{ month: string; count: number }>> {
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const uploads = await this.db.documents.groupBy({
        by: ['created_at'],
        where: {
          ...whereClause,
          created_at: { gte: sixMonthsAgo }
        },
        _count: { _all: true }
      })

      // Group by month and return formatted data
      const monthlyUploads: Record<string, number> = {}
      
      uploads.forEach(upload => {
        const month = new Date(upload.created_at!).toISOString().substring(0, 7)
        monthlyUploads[month] = (monthlyUploads[month] || 0) + upload._count._all
      })

      return Object.entries(monthlyUploads).map(([month, count]) => ({ month, count }))

    } catch (error) {
      this.logger.error({ error }, 'Failed to get upload trends')
      return []
    }
  }

  private async getApprovalTrends(whereClause: any): Promise<Array<{ month: string; count: number }>> {
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const approvals = await this.db.document_approvals.groupBy({
        by: ['created_at'],
        where: {
          status: 'approved',
          created_at: { gte: sixMonthsAgo },
          documents: whereClause ? { ...whereClause } : undefined
        },
        _count: { _all: true }
      })

      const monthlyApprovals: Record<string, number> = {}
      
      approvals.forEach(approval => {
        const month = new Date(approval.created_at!).toISOString().substring(0, 7)
        monthlyApprovals[month] = (monthlyApprovals[month] || 0) + approval._count._all
      })

      return Object.entries(monthlyApprovals).map(([month, count]) => ({ month, count }))

    } catch (error) {
      this.logger.error({ error }, 'Failed to get approval trends')
      return []
    }
  }

  private async getRejectionTrends(whereClause: any): Promise<Array<{ month: string; count: number }>> {
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const rejections = await this.db.document_approvals.groupBy({
        by: ['created_at'],
        where: {
          status: 'rejected',
          created_at: { gte: sixMonthsAgo },
          documents: whereClause ? { ...whereClause } : undefined
        },
        _count: { _all: true }
      })

      const monthlyRejections: Record<string, number> = {}
      
      rejections.forEach(rejection => {
        const month = new Date(rejection.created_at!).toISOString().substring(0, 7)
        monthlyRejections[month] = (monthlyRejections[month] || 0) + rejection._count._all
      })

      return Object.entries(monthlyRejections).map(([month, count]) => ({ month, count }))

    } catch (error) {
      this.logger.error({ error }, 'Failed to get rejection trends')
      return []
    }
  }

  private async getEntityBreakdown(whereClause: any): Promise<Array<{
    entity_type: string;
    entity_id: string;
    document_count: number;
    pending_count: number;
    approved_count: number;
  }>> {
    try {
      const entities = await this.db.documents.groupBy({
        by: ['entity_type', 'entity_id'],
        where: whereClause,
        _count: { _all: true }
      })

      const breakdown = await Promise.all(
        entities.map(async (entity) => {
          const pendingCount = await this.db.documents.count({
            where: {
              ...whereClause,
              entity_type: entity.entity_type,
              entity_id: entity.entity_id,
              status: DocumentStatus.PENDING
            }
          })

          const approvedCount = await this.db.documents.count({
            where: {
              ...whereClause,
              entity_type: entity.entity_type,
              entity_id: entity.entity_id,
              status: DocumentStatus.APPROVED
            }
          })

          return {
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            document_count: entity._count._all,
            pending_count: pendingCount,
            approved_count: approvedCount
          }
        })
      )

      return breakdown

    } catch (error) {
      this.logger.error({ error }, 'Failed to get entity breakdown')
      return []
    }
  }

  private async getUserActivity(whereClause: any): Promise<Array<{
    user_id: string;
    uploads: number;
    approvals: number;
    last_activity: Date | string;
  }>> {
    try {
      // Get upload activity
      const uploads = await this.db.documents.groupBy({
        by: ['uploaded_by'],
        where: {
          ...whereClause,
          uploaded_by: { not: null }
        },
        _count: { _all: true }
      })

      // Get approval activity
      const approvals = await this.db.document_approvals.groupBy({
        by: ['approver_id'],
        where: {
          approver_id: { not: null }
        },
        _count: { _all: true }
      })

      // Combine activities
      const userActivities = new Map<string, { uploads: number; approvals: number; last_activity: Date }>()

      uploads.forEach(upload => {
        if (upload.uploaded_by) {
          userActivities.set(upload.uploaded_by, {
            uploads: upload._count._all,
            approvals: 0,
            last_activity: new Date()
          })
        }
      })

      approvals.forEach(approval => {
        if (approval.approver_id) {
          const existing = userActivities.get(approval.approver_id) || { uploads: 0, approvals: 0, last_activity: new Date() }
          existing.approvals = approval._count._all
          userActivities.set(approval.approver_id, existing)
        }
      })

      return Array.from(userActivities.entries()).map(([user_id, activity]) => ({
        user_id,
        uploads: activity.uploads,
        approvals: activity.approvals,
        last_activity: activity.last_activity
      }))

    } catch (error) {
      this.logger.error({ error }, 'Failed to get user activity')
      return []
    }
  }

  private formatAsCSV(documents: any[], options: DocumentExportOptions): string {
    if (documents.length === 0) return 'No documents to export'

    const headers = ['ID', 'Name', 'Type', 'Status', 'Entity Type', 'Entity ID', 'Created At', 'Updated At']
    
    if (options.include_metadata) {
      headers.push('Metadata')
    }

    const rows = documents.map(doc => [
      doc.id,
      doc.name,
      doc.type,
      doc.status,
      doc.entity_type,
      doc.entity_id,
      doc.created_at,
      doc.updated_at,
      ...(options.include_metadata ? [JSON.stringify(doc.metadata)] : [])
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  private formatAsExcel(documents: any[], options: DocumentExportOptions): Buffer {
    // Mock Excel generation - would use a library like ExcelJS
    return Buffer.from('Excel data placeholder')
  }

  private async formatAsPDF(documents: any[], options: DocumentExportOptions): Promise<Buffer> {
    // Mock PDF generation - would use a library like PDFKit
    return Buffer.from('PDF data placeholder')
  }
}
