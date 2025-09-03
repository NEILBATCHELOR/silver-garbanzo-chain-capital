/**
 * Investor Group Service
 * Manages investor groups, memberships, and segmentation
 */

import { BaseService } from '../BaseService'
import type {
  InvestorGroup,
  InvestorGroupMember
} from '@/types/investors'
import type { ServiceResult, PaginatedResponse } from '../../types/index'
import { mapDatabaseResult, mapDatabaseResults } from '../../utils/type-mappers'

export class InvestorGroupService extends BaseService {
  constructor() {
    super('InvestorGroup')
  }

  /**
   * Get all investor groups with pagination
   */
  async getGroups(options: {
    page?: number
    limit?: number
    search?: string
    project_id?: string
    include_members?: boolean
  } = {}): Promise<PaginatedResponse<InvestorGroup>> {
    try {
      const { page = 1, limit = 20, search, project_id, include_members = false } = options

      const where: any = {}
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (project_id) {
        where.project_id = project_id
      }

      const include: any = {}
      if (include_members) {
        include.investor_group_members = {
          include: {
            investors: {
              select: {
                investor_id: true,
                name: true,
                email: true,
                investor_type: true,
                investor_status: true
              }
            }
          }
        }
      }

      const { skip, take } = this.parseQueryOptions({ page, limit })

      const [groups, total] = await Promise.all([
        this.db.investor_groups.findMany({
          skip,
          take,
          where,
          include,
          orderBy: { created_at: 'desc' }
        }),
        this.db.investor_groups.count({ where })
      ])

      const mappedGroups = mapDatabaseResults(groups) as InvestorGroup[]
      return this.paginatedResponse(mappedGroups, total, page, limit)
    } catch (error) {
      this.logError('Failed to get investor groups', { error, options })
      throw error
    }
  }

  /**
   * Get group by ID
   */
  async getGroupById(id: string, includeMembers = false): Promise<ServiceResult<InvestorGroup>> {
    try {
      const include: any = {}
      if (includeMembers) {
        include.investor_group_members = {
          include: {
            investors: {
              select: {
                investor_id: true,
                name: true,
                email: true,
                investor_type: true,
                investor_status: true,
                kyc_status: true
              }
            }
          }
        }
      }

      const group = await this.db.investor_groups.findUnique({
        where: { id },
        include
      })

      if (!group) {
        return this.error('Investor group not found', 'NOT_FOUND', 404)
      }

      const mappedGroup = mapDatabaseResult(group) as InvestorGroup
      return this.success(mappedGroup)
    } catch (error) {
      this.logError('Failed to get investor group by ID', { error, id })
      return this.error('Failed to get investor group', 'DATABASE_ERROR')
    }
  }

  /**
   * Create new investor group
   */
  async createGroup(data: {
    name: string
    description?: string
    project_id?: string
    group?: string
  }): Promise<ServiceResult<InvestorGroup>> {
    try {
      // Validate required fields
      const validation = this.validateRequiredFields(data, ['name'])
      if (!validation.success) {
        return validation as ServiceResult<InvestorGroup>
      }

      // Check for existing group with same name
      const existing = await this.db.investor_groups.findFirst({
        where: { 
          name: data.name,
          project_id: data.project_id || null
        }
      })

      if (existing) {
        return this.error('Group with this name already exists for this project', 'CONFLICT', 409)
      }

      const group = await this.db.investor_groups.create({
        data: {
          name: data.name,
          description: data.description,
          project_id: data.project_id,
          group: data.group,
          member_count: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      this.logInfo('Investor group created successfully', { groupId: group.id })
      const mappedGroup = mapDatabaseResult(group) as InvestorGroup
      return this.success(mappedGroup)
    } catch (error) {
      this.logError('Failed to create investor group', { error, data })
      return this.error('Failed to create investor group', 'DATABASE_ERROR')
    }
  }

  /**
   * Update investor group
   */
  async updateGroup(
    id: string,
    data: {
      name?: string
      description?: string
      group?: string
    }
  ): Promise<ServiceResult<InvestorGroup>> {
    try {
      const existing = await this.db.investor_groups.findUnique({
        where: { id }
      })

      if (!existing) {
        return this.error('Investor group not found', 'NOT_FOUND', 404)
      }

      const group = await this.db.investor_groups.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date()
        }
      })

      this.logInfo('Investor group updated successfully', { groupId: id })
      const mappedGroup = mapDatabaseResult(group) as InvestorGroup
      return this.success(mappedGroup)
    } catch (error) {
      this.logError('Failed to update investor group', { error, id, data })
      return this.error('Failed to update investor group', 'DATABASE_ERROR')
    }
  }

  /**
   * Delete investor group
   */
  async deleteGroup(id: string): Promise<ServiceResult<boolean>> {
    try {
      const group = await this.db.investor_groups.findUnique({
        where: { id }
      })

      if (!group) {
        return this.error('Investor group not found', 'NOT_FOUND', 404)
      }

      // Remove all members first
      await this.db.investor_group_members.deleteMany({
        where: { group_id: id }
      })

      // Delete the group
      await this.db.investor_groups.delete({
        where: { id }
      })

      this.logInfo('Investor group deleted successfully', { groupId: id })
      return this.success(true)
    } catch (error) {
      this.logError('Failed to delete investor group', { error, id })
      return this.error('Failed to delete investor group', 'DATABASE_ERROR')
    }
  }

  /**
   * Add investor to group
   */
  async addInvestorToGroup(groupId: string, investorId: string): Promise<ServiceResult<InvestorGroupMember>> {
    try {
      // Check if group exists
      const group = await this.db.investor_groups.findUnique({
        where: { id: groupId }
      })

      if (!group) {
        return this.error('Investor group not found', 'NOT_FOUND', 404)
      }

      // Check if investor exists
      const investor = await this.db.investors.findUnique({
        where: { investor_id: investorId }
      })

      if (!investor) {
        return this.error('Investor not found', 'NOT_FOUND', 404)
      }

      // Check if membership already exists
      const existingMembership = await this.db.investor_group_members.findFirst({
        where: {
          group_id: groupId,
          investor_id: investorId
        }
      })

      if (existingMembership) {
        return this.error('Investor is already a member of this group', 'CONFLICT', 409)
      }

      // Create membership
      const membership = await this.db.investor_group_members.create({
        data: {
          group_id: groupId,
          investor_id: investorId,
          created_at: new Date()
        }
      })

      // Update group member count
      await this.db.investor_groups.update({
        where: { id: groupId },
        data: { member_count: { increment: 1 } }
      })

      this.logInfo('Investor added to group successfully', { groupId, investorId })
      return this.success(membership)
    } catch (error) {
      this.logError('Failed to add investor to group', { error, groupId, investorId })
      return this.error('Failed to add investor to group', 'DATABASE_ERROR')
    }
  }

  /**
   * Remove investor from group
   */
  async removeInvestorFromGroup(groupId: string, investorId: string): Promise<ServiceResult<boolean>> {
    try {
      // Check if membership exists
      const membership = await this.db.investor_group_members.findFirst({
        where: {
          group_id: groupId,
          investor_id: investorId
        }
      })

      if (!membership) {
        return this.error('Investor is not a member of this group', 'NOT_FOUND', 404)
      }

      // Remove membership
      await this.db.investor_group_members.delete({
        where: {
          group_id_investor_id: {
            group_id: groupId,
            investor_id: investorId
          }
        }
      })

      // Update group member count
      await this.db.investor_groups.update({
        where: { id: groupId },
        data: { member_count: { decrement: 1 } }
      })

      this.logInfo('Investor removed from group successfully', { groupId, investorId })
      return this.success(true)
    } catch (error) {
      this.logError('Failed to remove investor from group', { error, groupId, investorId })
      return this.error('Failed to remove investor from group', 'DATABASE_ERROR')
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(
    groupId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<any>> {
    try {
      const { page = 1, limit = 20 } = options

      const group = await this.db.investor_groups.findUnique({
        where: { id: groupId }
      })

      if (!group) {
        throw new Error('Investor group not found')
      }

      const { skip, take } = this.parseQueryOptions({ page, limit })

      const [members, total] = await Promise.all([
        this.db.investor_group_members.findMany({
          skip,
          take,
          where: { group_id: groupId },
          include: {
            investors: {
              select: {
                investor_id: true,
                name: true,
                email: true,
                investor_type: true,
                investor_status: true,
                kyc_status: true,
                created_at: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }),
        this.db.investor_group_members.count({
          where: { group_id: groupId }
        })
      ])

      const formattedMembers = members.map((member: any) => ({
        membership_date: member.created_at,
        ...member.investors
      }))

      return this.paginatedResponse(formattedMembers, total, page, limit)
    } catch (error) {
      this.logError('Failed to get group members', { error, groupId, options })
      throw error
    }
  }

  /**
   * Bulk add investors to group
   */
  async bulkAddInvestorsToGroup(
    groupId: string,
    investorIds: string[]
  ): Promise<ServiceResult<{
    successful: string[]
    failed: Array<{ investorId: string, error: string }>
    summary: { total: number, success: number, failed: number }
  }>> {
    try {
      const successful: string[] = []
      const failed: Array<{ investorId: string, error: string }> = []

      for (const investorId of investorIds) {
        try {
          const result = await this.addInvestorToGroup(groupId, investorId)
          if (result.success) {
            successful.push(investorId)
          } else {
            failed.push({ investorId, error: result.error || 'Unknown error' })
          }
        } catch (error) {
          failed.push({ 
            investorId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      const summary = {
        total: investorIds.length,
        success: successful.length,
        failed: failed.length
      }

      this.logInfo('Bulk add investors to group completed', { groupId, summary })

      return this.success({
        successful,
        failed,
        summary
      })
    } catch (error) {
      this.logError('Failed to bulk add investors to group', { error, groupId, investorIds })
      return this.error('Failed to bulk add investors to group', 'DATABASE_ERROR')
    }
  }
}
