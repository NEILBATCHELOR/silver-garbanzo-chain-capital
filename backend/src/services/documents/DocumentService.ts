import { BaseService } from '../BaseService'
import { 
  Document, 
  DocumentVersion,
  DocumentApproval,
  DocumentWorkflow,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateDocumentVersionRequest,
  DocumentApprovalRequest,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  DocumentResponse,
  DocumentWithStats,
  DocumentQueryOptions,
  DocumentServiceResult,
  BulkDocumentUpdateRequest,
  DocumentStatus,
  WorkflowStatus,
  EntityType
} from '@/types/document-service'
import { ServiceResult, QueryOptions, PaginatedResponse } from '@/types/index'

/**
 * Document Management Service
 * 
 * Provides comprehensive document management functionality including:
 * - CRUD operations on documents, versions, approvals, and workflows
 * - File upload and storage integration
 * - Version control and approval workflows
 * - Bulk operations and analytics
 */
export class DocumentService extends BaseService {
  
  constructor() {
    super('Document')
  }

  // === Core Document Operations ===

  /**
   * Create a new document
   */
  async createDocument(data: CreateDocumentRequest): Promise<ServiceResult<DocumentResponse>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(data, ['name', 'type', 'entity_id', 'entity_type'])
      if (!validation.success) {
        return this.error('Validation failed', 'VALIDATION_ERROR', 400)
      }

      // Create document with default values
      const documentData = {
        ...data,
        status: DocumentStatus.PENDING,
        version: 1,
        metadata: data.metadata || {},
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await this.createEntity<Document>(
        this.db.documents,
        documentData
      )

      if (!result.success) {
        return this.error('Failed to create document', 'DOCUMENT_CREATE_ERROR')
      }

      return this.success({
        document: result.data!,
        versions: [],
        approvals: [],
        workflow: undefined
      })

    } catch (error) {
      this.logError('Failed to create document', { error, data })
      return this.error('Failed to create document', 'DOCUMENT_CREATE_ERROR')
    }
  }

  /**
   * Get document by ID with optional related data
   */
  async getDocument(id: string, options: { 
    include_versions?: boolean
    include_approvals?: boolean
    include_workflow?: boolean
  } = {}): Promise<ServiceResult<DocumentResponse>> {
    try {
      const include: any = {}
      
      if (options.include_versions) {
        include.document_versions = {
          orderBy: { version_number: 'desc' }
        }
      }
      
      if (options.include_approvals) {
        include.document_approvals = {
          include: { users: { select: { id: true, email: true } } }
        }
      }

      if (options.include_workflow) {
        include.document_workflows = true
      }

      const result = await this.findById<Document>(this.db.documents, id)
      if (!result.success) {
        return this.error('Document not found', 'DOCUMENT_NOT_FOUND', 404)
      }

      const document = result.data
      if (!document) {
        return this.error('Document not found', 'DOCUMENT_NOT_FOUND', 404)
      }

      // Get related data separately to avoid property access issues
      const versionsRaw = options.include_versions ? 
        await this.db.document_versions.findMany({
          where: { document_id: id },
          orderBy: { version_number: 'desc' }
        }) : []

      // Transform versions to match interface
      const versions: DocumentVersion[] = versionsRaw.map(v => ({
        id: v.id,
        document_id: v.document_id || undefined,
        version_number: v.version_number,
        file_path: v.file_path || undefined,
        file_url: v.file_url || undefined,
        uploaded_by: v.uploaded_by || undefined,
        metadata: v.metadata as any,
        created_at: v.created_at || undefined
      }))

      const approvalsRaw = options.include_approvals ?
        await this.db.document_approvals.findMany({
          where: { document_id: id },
          include: { users: { select: { id: true, email: true } } }
        }) : []
      
      // Transform approvals to match interface
      const approvals: DocumentApproval[] = approvalsRaw.map(a => ({
        id: a.id,
        document_id: a.document_id || undefined,
        approver_id: a.approver_id || undefined,
        status: a.status,
        comments: a.comments || undefined,
        created_at: a.created_at || undefined,
        updated_at: a.updated_at || undefined
      }))

      const workflowRaw = options.include_workflow ?
        await this.db.document_workflows.findFirst({
          where: { document_id: id }
        }) : null
      
      // Transform workflow to match interface
      const workflow: DocumentWorkflow | undefined = workflowRaw ? {
        id: workflowRaw.id,
        document_id: workflowRaw.document_id,
        required_signers: workflowRaw.required_signers,
        completed_signers: workflowRaw.completed_signers,
        status: workflowRaw.status as any,
        deadline: workflowRaw.deadline || undefined,
        metadata: workflowRaw.metadata as any,
        created_at: workflowRaw.created_at,
        updated_at: workflowRaw.updated_at,
        created_by: workflowRaw.created_by,
        updated_by: workflowRaw.updated_by
      } : undefined

      return this.success({
        document,
        versions,
        approvals,
        workflow
      })

    } catch (error) {
      this.logError('Failed to get document', { error, id })
      return this.error('Failed to get document', 'DOCUMENT_GET_ERROR')
    }
  }

  /**
   * Update document
   */
  async updateDocument(id: string, data: UpdateDocumentRequest): Promise<ServiceResult<DocumentResponse>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date()
      }

      const result = await this.updateEntity<Document>(
        this.db.documents,
        id,
        updateData
      )

      if (result.success) {
        this.logInfo('Document updated successfully', { documentId: id })
        return this.success({
          document: result.data!,
          versions: [],
          approvals: [],
          workflow: undefined
        })
      }

      return this.error('Failed to update document', 'DOCUMENT_UPDATE_ERROR')

    } catch (error) {
      this.logError('Failed to update document', { error, id, data })
      return this.error('Failed to update document', 'DOCUMENT_UPDATE_ERROR')
    }
  }

  /**
   * Delete document (with cascade to versions, approvals, workflows)
   */
  async deleteDocument(id: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if document exists
      const existsResult = await this.findById(this.db.documents, id)
      if (!existsResult.success) {
        return this.error('Document not found', 'DOCUMENT_NOT_FOUND', 404)
      }

      // Delete within transaction to handle cascades
      try {
        await this.db.$transaction(async (tx) => {
          // Delete related data first
          await tx.document_approvals.deleteMany({ where: { document_id: id } })
          await tx.document_versions.deleteMany({ where: { document_id: id } })
          await tx.document_workflows.deleteMany({ where: { document_id: id } })
          
          // Delete main document
          await tx.documents.delete({ where: { id } })
        })
        
        this.logInfo('Document deleted successfully', { documentId: id })
        return this.success(true)
      } catch (transactionError) {
        this.logError('Failed to delete document in transaction', { error: transactionError, id })
        return this.error('Failed to delete document', 'DOCUMENT_DELETE_ERROR')
      }

    } catch (error) {
      this.logError('Failed to delete document', { error, id })
      return this.error('Failed to delete document', 'DOCUMENT_DELETE_ERROR')
    }
  }

  /**
   * List documents with filtering and pagination
   */
  async listDocuments(options: DocumentQueryOptions = {}): Promise<PaginatedResponse<DocumentWithStats>> {
    try {
      const queryOptions: QueryOptions = {
        page: options.page,
        limit: options.limit,
        offset: options.offset,
        sortBy: options.sortBy || 'updated_at',
        sortOrder: options.sortOrder || 'desc',
        search: options.search,
        searchFields: options.searchFields || ['name', 'type']
      }

      // Build where clause for document-specific filters
      const where: any = {}

      if (options.status) {
        where.status = Array.isArray(options.status) ? { in: options.status } : options.status
      }

      if (options.type) {
        where.type = Array.isArray(options.type) ? { in: options.type } : options.type
      }

      if (options.category) {
        where.category = Array.isArray(options.category) ? { in: options.category } : options.category
      }

      if (options.entity_type) {
        where.entity_type = Array.isArray(options.entity_type) ? { in: options.entity_type } : options.entity_type
      }

      if (options.entity_id) {
        where.entity_id = Array.isArray(options.entity_id) ? { in: options.entity_id } : options.entity_id
      }

      if (options.project_id) {
        where.project_id = Array.isArray(options.project_id) ? { in: options.project_id } : options.project_id
      }

      if (options.uploaded_by) {
        where.uploaded_by = Array.isArray(options.uploaded_by) ? { in: options.uploaded_by } : options.uploaded_by
      }

      // Date filters
      if (options.created_after || options.created_before) {
        where.created_at = {}
        if (options.created_after) where.created_at.gte = new Date(options.created_after)
        if (options.created_before) where.created_at.lte = new Date(options.created_before)
      }

      if (options.expires_after || options.expires_before) {
        where.expiry_date = {}
        if (options.expires_after) where.expiry_date.gte = new Date(options.expires_after)
        if (options.expires_before) where.expiry_date.lte = new Date(options.expires_before)
      }

      queryOptions.where = where

      // Build include clause
      const include: any = {}
      
      if (options.include_versions) {
        include.document_versions = { select: { id: true } }
      }
      
      if (options.include_approvals) {
        include.document_approvals = { select: { id: true, status: true } }
      }

      if (options.include_workflow) {
        include.document_workflows = { select: { id: true, status: true } }
      }

      queryOptions.include = include

      const result = await this.executePaginatedQuery<DocumentWithStats>(
        this.db.documents,
        queryOptions
      )

      // Add computed statistics if requested
      if (options.include_stats) {
        result.data = result.data.map(doc => this.addDocumentStats(doc))
      }

      return result

    } catch (error) {
      this.logError('Failed to list documents', { error, options })
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          hasMore: false,
          totalPages: 0
        },
        message: 'Failed to list documents',
        timestamp: new Date().toISOString()
      }
    }
  }

  // === Version Management ===

  /**
   * Create a new document version
   */
  async createDocumentVersion(data: CreateDocumentVersionRequest): Promise<ServiceResult<DocumentVersion>> {
    try {
      // Validate document exists
      const docResult = await this.findById(this.db.documents, data.document_id)
      if (!docResult.success) {
        return this.error('Document not found', 'DOCUMENT_NOT_FOUND', 404)
      }

      // Get latest version number
      const latestVersion = await this.db.document_versions.findFirst({
        where: { document_id: data.document_id },
        orderBy: { version_number: 'desc' }
      })

      const nextVersionNumber = (latestVersion?.version_number || 0) + 1

      const versionData = {
        ...data,
        version_number: nextVersionNumber,
        created_at: new Date()
      }

      const createdVersion = await this.db.document_versions.create({
        data: versionData
      })
      
      // Transform to DocumentVersion interface
      const result: DocumentVersion = {
        id: createdVersion.id,
        document_id: createdVersion.document_id || undefined,
        version_number: createdVersion.version_number,
        file_path: createdVersion.file_path || undefined,
        file_url: createdVersion.file_url || undefined,
        uploaded_by: createdVersion.uploaded_by || undefined,
        metadata: createdVersion.metadata as any,
        created_at: createdVersion.created_at || undefined
      }

      // Update main document version
      await this.db.documents.update({
        where: { id: data.document_id },
        data: { 
          version: nextVersionNumber,
          updated_at: new Date()
        }
      })

      this.logInfo('Document version created', { 
        documentId: data.document_id, 
        version: nextVersionNumber 
      })

      return this.success(result)

    } catch (error) {
      this.logError('Failed to create document version', { error, data })
      return this.error('Failed to create document version', 'VERSION_CREATE_ERROR')
    }
  }

  /**
   * Get all versions for a document
   */
  async getDocumentVersions(documentId: string): Promise<ServiceResult<DocumentVersion[]>> {
    try {
      const versions = await this.db.document_versions.findMany({
        where: { document_id: documentId },
        orderBy: { version_number: 'desc' }
      })

      // Transform to match DocumentVersion interface
      const documentVersions: DocumentVersion[] = versions.map(v => ({
        id: v.id,
        document_id: v.document_id || undefined,
        version_number: v.version_number,
        file_path: v.file_path || undefined,
        file_url: v.file_url || undefined,
        uploaded_by: v.uploaded_by || undefined,
        metadata: v.metadata as any,
        created_at: v.created_at || undefined
      }))

      return this.success(documentVersions)

    } catch (error) {
      this.logError('Failed to get document versions', { error, documentId })
      return this.error('Failed to get document versions', 'VERSION_GET_ERROR')
    }
  }

  // === Approval Management ===

  /**
   * Create document approval
   */
  async createDocumentApproval(data: DocumentApprovalRequest): Promise<ServiceResult<DocumentApproval>> {
    try {
      // Validate document exists
      const docResult = await this.findById(this.db.documents, data.document_id)
      if (!docResult.success) {
        return this.error('Document not found', 'DOCUMENT_NOT_FOUND', 404)
      }

      const approvalData = {
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      }

      const createdApproval = await this.db.document_approvals.create({
        data: approvalData,
        include: {
          users: { select: { id: true, email: true } }
        }
      })
      
      // Transform to DocumentApproval interface
      const result: DocumentApproval = {
        id: createdApproval.id,
        document_id: createdApproval.document_id || undefined,
        approver_id: createdApproval.approver_id || undefined,
        status: createdApproval.status,
        comments: createdApproval.comments || undefined,
        created_at: createdApproval.created_at || undefined,
        updated_at: createdApproval.updated_at || undefined
      }

      if (data.status === 'approved') {
        // Update document status if approved
        await this.db.documents.update({
          where: { id: data.document_id },
          data: { 
            status: DocumentStatus.APPROVED,
            updated_at: new Date()
          }
        })
      }

      return this.success(result)

    } catch (error) {
      this.logError('Failed to create document approval', { error, data })
      return this.error('Failed to create document approval', 'APPROVAL_CREATE_ERROR')
    }
  }

  // === Utility Methods ===

  /**
   * Add computed statistics to document
   */
  private addDocumentStats(doc: any): DocumentWithStats {
    const now = new Date()
    const expiryDate = doc.expiry_date ? new Date(doc.expiry_date) : null
    
    return {
      ...doc,
      version_count: doc.document_versions?.length || 0,
      approval_count: doc.document_approvals?.length || 0,
      pending_approvals: doc.document_approvals?.filter((a: any) => a.status === 'pending')?.length || 0,
      has_workflow: Boolean(doc.document_workflows?.length),
      workflow_status: doc.document_workflows?.[0]?.status || null,
      days_until_expiry: expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      is_expired: expiryDate ? expiryDate < now : false
    }
  }

  /**
   * Bulk update multiple documents
   */
  async bulkUpdateDocuments(data: BulkDocumentUpdateRequest): Promise<ServiceResult<{ updated: number; failed: number }>> {
    try {
      const results = await this.db.documents.updateMany({
        where: { id: { in: data.document_ids } },
        data: {
          ...data.updates,
          updated_at: new Date()
        }
      })

      this.logInfo('Bulk document update completed', { 
        documentIds: data.document_ids, 
        updated: results.count 
      })

      return this.success({
        updated: results.count,
        failed: data.document_ids.length - results.count
      })

    } catch (error) {
      this.logError('Failed to bulk update documents', { error, data })
      return this.error('Failed to bulk update documents', 'BULK_UPDATE_ERROR')
    }
  }
}
