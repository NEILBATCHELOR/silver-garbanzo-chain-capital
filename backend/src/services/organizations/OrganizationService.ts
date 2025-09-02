/**
 * Organization Management Service
 * Provides comprehensive CRUD operations for organization/issuer management
 * Resolves architectural anti-pattern by moving database operations to backend
 */

import { BaseService } from '../BaseService'
import type { ServiceResult } from '../BaseService'

export interface Organization {
  id: string
  name: string
  legal_name: string | null
  business_type: string | null
  registration_number: string | null
  registration_date: string | null
  tax_id: string | null
  jurisdiction: string | null
  status: string | null
  contact_email: string | null
  contact_phone: string | null
  website: string | null
  address: any | null
  legal_representatives: any | null
  compliance_status: string | null
  onboarding_completed: boolean | null
  created_at: string
  updated_at: string | null
}

export interface OrganizationSummary {
  id: string
  name: string
  legal_name: string | null
  business_type: string | null
  status: string | null
  compliance_status: string | null
  onboarding_completed: boolean | null
  document_count: number
  created_at: string
  updated_at: string | null
}

export interface OrganizationDocument {
  id: string
  document_name: string
  document_type: string
  status: string
  file_url: string | null
  uploaded_at: string
  is_public: boolean | null
  metadata: any | null
}

export interface CreateOrganizationRequest {
  name: string
  legal_name?: string
  business_type?: string
  registration_number?: string
  registration_date?: string
  tax_id?: string
  jurisdiction?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: any
  legal_representatives?: any
}

export interface UpdateOrganizationRequest {
  name?: string
  legal_name?: string
  business_type?: string
  registration_number?: string
  registration_date?: string
  tax_id?: string
  jurisdiction?: string
  status?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: any
  legal_representatives?: any
  compliance_status?: string
  onboarding_completed?: boolean
}

export class OrganizationService extends BaseService {
  
  constructor() {
    super('Organization')
  }
  
  /**
   * Get all organizations with document counts
   */
  async getOrganizations(options: {
    page?: number
    limit?: number
    status?: string
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<ServiceResult<{
    organizations: OrganizationSummary[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
      hasMore: boolean
    }
  }>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options

      let query = this.prisma.organizations.findMany({
        select: {
          id: true,
          name: true,
          legal_name: true,
          business_type: true,
          status: true,
          compliance_status: true,
          onboarding_completed: true,
          created_at: true,
          updated_at: true
        },
        where: {
          ...(status && { status }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { legal_name: { contains: search, mode: 'insensitive' } }
            ]
          })
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      })

      const [organizations, total] = await Promise.all([
        this.prisma.organizations.findMany({
          select: {
            id: true,
            name: true,
            legal_name: true,
            business_type: true,
            status: true,
            compliance_status: true,
            onboarding_completed: true,
            created_at: true,
            updated_at: true
          },
          where: {
            ...(status && { status }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { legal_name: { contains: search, mode: 'insensitive' } }
              ]
            })
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.organizations.count({
          where: {
            ...(status && { status }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { legal_name: { contains: search, mode: 'insensitive' } }
              ]
            })
          }
        })
      ])

      // Get document counts for each organization
      const organizationIds = organizations.map(org => org.id)
      const documentCounts = await this.prisma.issuer_documents.groupBy({
        by: ['issuer_id'],
        where: {
          issuer_id: { in: organizationIds }
        },
        _count: {
          id: true
        }
      })

      const documentCountMap = documentCounts.reduce((acc: Record<string, number>, item: any) => {
        acc[item.issuer_id] = item._count.id
        return acc
      }, {} as Record<string, number>)

      const organizationsWithCounts: OrganizationSummary[] = organizations.map((org: any) => ({
        id: org.id,
        name: org.name,
        legal_name: org.legal_name,
        business_type: org.business_type,
        status: org.status,
        compliance_status: org.compliance_status,
        onboarding_completed: org.onboarding_completed,
        created_at: org.created_at?.toISOString() || new Date().toISOString(),
        updated_at: org.updated_at?.toISOString() || null,
        document_count: documentCountMap[org.id] || 0
      }))

      const totalPages = Math.ceil(total / limit)

      return this.success({
        organizations: organizationsWithCounts,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages
        }
      })
    } catch (error) {
      return this.handleError('Failed to fetch organizations', error)
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string): Promise<ServiceResult<Organization>> {
    try {
      const organization = await this.prisma.organizations.findUnique({
        where: { id }
      })

      if (!organization) {
        return this.error('Organization not found', 'NOT_FOUND', 404)
      }

      return this.success({
        ...organization,
        registration_date: organization.registration_date?.toISOString() || null,
        created_at: organization.created_at?.toISOString() || new Date().toISOString(),
        updated_at: organization.updated_at?.toISOString() || null
      })
    } catch (error) {
      return this.handleError('Failed to fetch organization', error)
    }
  }

  /**
   * Create new organization
   */
  async createOrganization(data: CreateOrganizationRequest): Promise<ServiceResult<Organization>> {
    try {
      // Validate required fields
      if (!data.name?.trim()) {
        return this.error('Organization name is required', 'VALIDATION_ERROR', 400)
      }

      const organization = await this.prisma.organizations.create({
        data: {
          name: data.name.trim(),
          legal_name: data.legal_name?.trim() || null,
          business_type: data.business_type || null,
          registration_number: data.registration_number || null,
          registration_date: data.registration_date ? new Date(data.registration_date) : null,
          tax_id: data.tax_id || null,
          jurisdiction: data.jurisdiction || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          website: data.website || null,
          address: data.address || null,
          legal_representatives: data.legal_representatives || null,
          status: 'pending',
          compliance_status: 'pending_review',
          onboarding_completed: false
        }
      })

      return this.success({
        ...organization,
        registration_date: organization.registration_date?.toISOString() || null,
        created_at: organization.created_at?.toISOString() || new Date().toISOString(),
        updated_at: organization.updated_at?.toISOString() || null
      })
    } catch (error) {
      return this.handleError('Failed to create organization', error)
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<ServiceResult<Organization>> {
    try {
      // Check if organization exists
      const existing = await this.prisma.organizations.findUnique({
        where: { id }
      })

      if (!existing) {
        return this.error('Organization not found', 'NOT_FOUND', 404)
      }

      const organization = await this.prisma.organizations.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.legal_name !== undefined && { legal_name: data.legal_name?.trim() || null }),
          ...(data.business_type !== undefined && { business_type: data.business_type }),
          ...(data.registration_number !== undefined && { registration_number: data.registration_number }),
          ...(data.registration_date !== undefined && { 
            registration_date: data.registration_date ? new Date(data.registration_date) : null 
          }),
          ...(data.tax_id !== undefined && { tax_id: data.tax_id }),
          ...(data.jurisdiction !== undefined && { jurisdiction: data.jurisdiction }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.contact_email !== undefined && { contact_email: data.contact_email }),
          ...(data.contact_phone !== undefined && { contact_phone: data.contact_phone }),
          ...(data.website !== undefined && { website: data.website }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.legal_representatives !== undefined && { legal_representatives: data.legal_representatives }),
          ...(data.compliance_status !== undefined && { compliance_status: data.compliance_status }),
          ...(data.onboarding_completed !== undefined && { onboarding_completed: data.onboarding_completed }),
          updated_at: new Date()
        }
      })

      return this.success({
        ...organization,
        registration_date: organization.registration_date?.toISOString() || null,
        created_at: organization.created_at?.toISOString() || new Date().toISOString(),
        updated_at: organization.updated_at?.toISOString() || null
      })
    } catch (error) {
      return this.handleError('Failed to update organization', error)
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(id: string): Promise<ServiceResult<void>> {
    try {
      // Check if organization exists
      const existing = await this.prisma.organizations.findUnique({
        where: { id }
      })

      if (!existing) {
        return this.error('Organization not found', 'NOT_FOUND', 404)
      }

      await this.prisma.organizations.delete({
        where: { id }
      })

      return this.success(undefined)
    } catch (error) {
      return this.handleError('Failed to delete organization', error)
    }
  }

  /**
   * Get organization documents
   */
  async getOrganizationDocuments(organizationId: string): Promise<ServiceResult<OrganizationDocument[]>> {
    try {
      // Check if organization exists
      const organization = await this.prisma.organizations.findUnique({
        where: { id: organizationId }
      })

      if (!organization) {
        return this.error('Organization not found', 'NOT_FOUND', 404)
      }

      const documents = await this.prisma.issuer_documents.findMany({
        where: { issuer_id: organizationId },
        select: {
          id: true,
          document_name: true,
          document_type: true,
          status: true,
          file_url: true,
          uploaded_at: true,
          is_public: true,
          metadata: true
        },
        orderBy: { uploaded_at: 'desc' }
      })

      const formattedDocuments: OrganizationDocument[] = documents.map((doc: any) => ({
        id: doc.id,
        document_name: doc.document_name,
        document_type: doc.document_type,
        status: doc.status,
        file_url: doc.file_url,
        uploaded_at: doc.uploaded_at.toISOString(),
        is_public: doc.is_public,
        metadata: doc.metadata
      }))

      return this.success(formattedDocuments)
    } catch (error) {
      return this.handleError('Failed to fetch organization documents', error)
    }
  }

  /**
   * Get organizations by status
   */
  async getOrganizationsByStatus(status: string): Promise<ServiceResult<OrganizationSummary[]>> {
    try {
      const result = await this.getOrganizations({ 
        status,
        limit: 1000 // Get all for status filter
      })

      if (!result.success || !result.data) {
        return this.error('Failed to fetch organizations by status', 'FETCH_ERROR', 500)
      }

      return this.success(result.data.organizations)
    } catch (error) {
      return this.handleError('Failed to fetch organizations by status', error)
    }
  }

  /**
   * Search organizations
   */
  async searchOrganizations(query: string, options: {
    limit?: number
    page?: number
  } = {}): Promise<ServiceResult<OrganizationSummary[]>> {
    try {
      const result = await this.getOrganizations({
        search: query,
        limit: options.limit,
        page: options.page
      })

      if (!result.success || !result.data) {
        return this.error('Failed to search organizations', 'SEARCH_ERROR', 500)
      }

      return this.success(result.data.organizations)
    } catch (error) {
      return this.handleError('Failed to search organizations', error)
    }
  }

  /**
   * Update compliance status
   */
  async updateComplianceStatus(id: string, complianceStatus: string): Promise<ServiceResult<void>> {
    try {
      const result = await this.updateOrganization(id, { 
        compliance_status: complianceStatus 
      })

      if (!result.success) {
        return this.error(result.error || 'Failed to update compliance status', result.code || 'UPDATE_ERROR', result.statusCode || 500)
      }

      return this.success(undefined)
    } catch (error) {
      return this.handleError('Failed to update compliance status', error)
    }
  }

  /**
   * Complete organization onboarding
   */
  async completeOnboarding(id: string): Promise<ServiceResult<void>> {
    try {
      const result = await this.updateOrganization(id, {
        onboarding_completed: true,
        status: 'active'
      })

      if (!result.success) {
        return this.error(result.error || 'Failed to complete onboarding', result.code || 'UPDATE_ERROR', result.statusCode || 500)
      }

      return this.success(undefined)
    } catch (error) {
      return this.handleError('Failed to complete onboarding', error)
    }
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStatistics(): Promise<ServiceResult<{
    total: number
    by_status: Record<string, number>
    by_compliance_status: Record<string, number>
    onboarding_completed: number
    recent_registrations: number
  }>> {
    try {
      const [
        total,
        byStatus,
        byComplianceStatus,
        onboardingCompleted,
        recentRegistrations
      ] = await Promise.all([
        this.prisma.organizations.count(),
        this.prisma.organizations.groupBy({
          by: ['status'],
          _count: true
        }),
        this.prisma.organizations.groupBy({
          by: ['compliance_status'],
          _count: true
        }),
        this.prisma.organizations.count({
          where: { onboarding_completed: true }
        }),
        this.prisma.organizations.count({
          where: {
            created_at: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        })
      ])

      const statusCounts = byStatus.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status || 'null'] = item._count
        return acc
      }, {} as Record<string, number>)

      const complianceCounts = byComplianceStatus.reduce((acc: Record<string, number>, item: any) => {
        acc[item.compliance_status || 'null'] = item._count
        return acc
      }, {} as Record<string, number>)

      return this.success({
        total,
        by_status: statusCounts,
        by_compliance_status: complianceCounts,
        onboarding_completed: onboardingCompleted,
        recent_registrations: recentRegistrations
      })
    } catch (error) {
      return this.handleError('Failed to fetch organization statistics', error)
    }
  }
}
