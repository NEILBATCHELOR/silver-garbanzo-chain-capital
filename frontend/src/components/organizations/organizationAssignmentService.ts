/**
 * Organization Assignment Service
 * Service for managing user-organization assignments and relationships
 */

import { supabase } from '@/infrastructure/database/client';
import type { 
  Organization, 
  UserOrganizationRole, 
  OrganizationAssignmentRequest,
  OrganizationSearchOptions,
  ProjectOrganizationAssignmentData
} from './types';

export class OrganizationAssignmentService {
  
  /**
   * Get all organizations for assignment selection
   */
  static async getOrganizations(options: OrganizationSearchOptions = {}): Promise<Organization[]> {
    try {
      let query = supabase
        .from('organizations')
        .select('id, name, legal_name, business_type, status, compliance_status, created_at, updated_at')
        .order('name', { ascending: true });

      // Apply search filter
      if (options.query) {
        query = query.or(`name.ilike.%${options.query}%,legal_name.ilike.%${options.query}%`);
      }

      // Apply status filter
      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      // Apply business type filter
      if (options.businessType && options.businessType !== 'all') {
        query = query.eq('business_type', options.businessType);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.page && options.limit) {
        const offset = (options.page - 1) * options.limit;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch organizations:', error);
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      // Map to proper camelCase format
      return (data || []).map(org => ({
        id: org.id,
        name: org.name,
        legalName: org.legal_name,
        businessType: org.business_type,
        status: org.status,
        complianceStatus: org.compliance_status,
        createdAt: org.created_at,
        updatedAt: org.updated_at
      }));
    } catch (error) {
      console.error('Error in getOrganizations:', error);
      throw error;
    }
  }

  /**
   * Get user's current organization assignments
   */
  static async getUserOrganizationRoles(userId: string): Promise<UserOrganizationRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_organization_roles')
        .select(`
          id,
          user_id,
          role_id,
          organization_id,
          created_at,
          updated_at,
          organizations!inner(name),
          roles!inner(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch user organization roles:', error);
        throw new Error(`Failed to fetch user organization roles: ${error.message}`);
      }

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        roleId: item.role_id,
        organizationId: item.organization_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getUserOrganizationRoles:', error);
      throw error;
    }
  }

  /**
   * Assign organizations to user with role
   */
  static async assignOrganizationsToUser(request: OrganizationAssignmentRequest): Promise<void> {
    try {
      const { userId, roleId, mode, organizationIds } = request;

      // Remove existing organization assignments for this user and role
      await this.removeUserOrganizationAssignments(userId, roleId);

      if (mode === 'all') {
        // Get all organization IDs
        const allOrgs = await this.getOrganizations();
        const allOrgIds = allOrgs.map(org => org.id);
        
        // Create assignments for all organizations using upsert
        await this.upsertOrganizationAssignments(userId, roleId, allOrgIds);
      } else if (mode === 'multiple' || mode === 'single') {
        // Create assignments for selected organizations
        if (organizationIds.length > 0) {
          await this.upsertOrganizationAssignments(userId, roleId, organizationIds);
        }
      }
    } catch (error) {
      console.error('Error in assignOrganizationsToUser:', error);
      throw error;
    }
  }

  /**
   * Upsert organization assignments with duplicate handling
   */
  private static async upsertOrganizationAssignments(userId: string, roleId: string, organizationIds: string[]): Promise<void> {
    try {
      // Process assignments in batches to handle duplicates gracefully
      for (const orgId of organizationIds) {
        const assignment = {
          user_id: userId,
          role_id: roleId,
          organization_id: orgId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Use upsert to handle duplicate key conflicts
        const { error } = await supabase
          .from('user_organization_roles')
          .upsert(assignment, { 
            onConflict: 'user_id,role_id,organization_id',
            ignoreDuplicates: false 
          });

        if (error) {
          // If upsert fails, try individual insert with error handling
          console.warn(`Upsert failed for user ${userId}, role ${roleId}, org ${orgId}:`, error);
          
          const { error: insertError } = await supabase
            .from('user_organization_roles')
            .insert(assignment);

          if (insertError && insertError.code !== '23505') {
            // Only throw if it's not a duplicate key error
            throw new Error(`Failed to assign organization ${orgId}: ${insertError.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in upsertOrganizationAssignments:', error);
      throw error;
    }
  }

  /**
   * Remove user's organization assignments for specific role
   */
  static async removeUserOrganizationAssignments(userId: string, roleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_organization_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .not('organization_id', 'is', null); // Only remove organization-specific assignments

      if (error) {
        throw new Error(`Failed to remove organization assignments: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in removeUserOrganizationAssignments:', error);
      throw error;
    }
  }

  /**
   * Get organization assignment summary for user
   */
  static async getOrganizationAssignmentSummary(userId: string, roleId: string): Promise<{
    mode: 'all' | 'multiple' | 'single' | 'none';
    organizationIds: string[];
    organizationCount: number;
    totalOrganizations: number;
  }> {
    try {
      // Get user's assignments
      const userAssignments = await this.getUserOrganizationRoles(userId);
      const roleAssignments = userAssignments.filter(a => a.roleId === roleId && a.organizationId);
      
      // Get total organization count
      const allOrgs = await this.getOrganizations();
      const totalOrganizations = allOrgs.length;
      
      const organizationIds = roleAssignments.map(a => a.organizationId!);
      const organizationCount = organizationIds.length;

      let mode: 'all' | 'multiple' | 'single' | 'none' = 'none';
      
      if (organizationCount === 0) {
        mode = 'none';
      } else if (organizationCount === totalOrganizations) {
        mode = 'all';
      } else if (organizationCount === 1) {
        mode = 'single';
      } else {
        mode = 'multiple';
      }

      return {
        mode,
        organizationIds,
        organizationCount,
        totalOrganizations
      };
    } catch (error) {
      console.error('Error in getOrganizationAssignmentSummary:', error);
      throw error;
    }
  }

  /**
   * Assign project to organization
   */
  static async assignProjectToOrganization(
    projectId: string, 
    organizationId: string, 
    relationship: 'issuer' | 'investor' | 'service_provider' | 'regulator' = 'issuer',
    notes?: string
  ): Promise<void> {
    try {
      // Check if assignment already exists
      const { data: existing, error: checkError } = await supabase
        .from('project_organization_assignments')
        .select('id, is_active')
        .eq('project_id', projectId)
        .eq('organization_id', organizationId)
        .eq('relationship_type', relationship)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to check existing assignment: ${checkError.message}`);
      }

      if (existing) {
        if (existing.is_active) {
          // Assignment already exists and is active - silently skip
          console.log(`Assignment already exists for project ${projectId} and organization ${organizationId} with relationship ${relationship}`);
          return;
        } else {
          // Reactivate existing assignment
          const { error: updateError } = await supabase
            .from('project_organization_assignments')
            .update({
              is_active: true,
              notes: notes || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            throw new Error(`Failed to reactivate assignment: ${updateError.message}`);
          }
          return;
        }
      }

      // Create new assignment
      const { error } = await supabase
        .from('project_organization_assignments')
        .insert({
          project_id: projectId,
          organization_id: organizationId,
          relationship_type: relationship,
          notes: notes || null,
          assigned_at: new Date().toISOString(),
          is_active: true
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          // This shouldn't happen now with the check above, but handle gracefully
          console.log(`Assignment already exists for project ${projectId} and organization ${organizationId} with relationship ${relationship}`);
          return;
        }
        throw new Error(`Failed to assign project to organization: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in assignProjectToOrganization:', error);
      throw error;
    }
  }

  /**
   * Get project organization assignments
   */
  static async getProjectOrganizationAssignments(projectId?: string, organizationId?: string): Promise<ProjectOrganizationAssignmentData[]> {
    try {
      let query = supabase
        .from('project_organization_assignments')
        .select(`
          id,
          project_id,
          organization_id,
          relationship_type,
          notes,
          is_active,
          assigned_at,
          created_at,
          projects!inner(name, description, status),
          organizations!inner(name, legal_name, business_type, status)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch project organization assignments: ${error.message}`);
      }

      return (data || []).map(item => ({
        id: item.id,
        projectId: item.project_id,
        organizationId: item.organization_id,
        relationship: item.relationship_type as 'issuer' | 'investor' | 'service_provider' | 'regulator',
        notes: item.notes,
        isActive: item.is_active,
        assignedAt: item.assigned_at,
        createdAt: item.created_at,
        projectName: item.projects?.name,
        projectDescription: item.projects?.description,
        projectStatus: item.projects?.status,
        organizationName: item.organizations?.name,
        organizationLegalName: item.organizations?.legal_name,
        organizationBusinessType: item.organizations?.business_type,
        organizationStatus: item.organizations?.status
      }));
    } catch (error) {
      console.error('Error in getProjectOrganizationAssignments:', error);
      throw error;
    }
  }

  /**
   * Remove project organization assignment (hard delete)
   */
  static async removeProjectOrganizationAssignment(assignmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_organization_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        throw new Error(`Failed to remove project organization assignment: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in removeProjectOrganizationAssignment:', error);
      throw error;
    }
  }

  /**
   * Deactivate project organization assignment (soft delete)
   */
  static async deactivateProjectOrganizationAssignment(assignmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_organization_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) {
        throw new Error(`Failed to deactivate project organization assignment: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deactivateProjectOrganizationAssignment:', error);
      throw error;
    }
  }

  /**
   * Get inactive project organization assignments
   */
  static async getInactiveProjectOrganizationAssignments(projectId?: string, organizationId?: string): Promise<ProjectOrganizationAssignmentData[]> {
    try {
      let query = supabase
        .from('project_organization_assignments')
        .select(`
          id,
          project_id,
          organization_id,
          relationship_type,
          notes,
          is_active,
          assigned_at,
          created_at,
          updated_at,
          projects!inner(name, description, status),
          organizations!inner(name, legal_name, business_type, status)
        `)
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch inactive project organization assignments: ${error.message}`);
      }

      return (data || []).map(item => ({
        id: item.id,
        projectId: item.project_id,
        organizationId: item.organization_id,
        relationship: item.relationship_type as 'issuer' | 'investor' | 'service_provider' | 'regulator',
        notes: item.notes,
        isActive: item.is_active,
        assignedAt: item.assigned_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        projectName: item.projects?.name,
        projectDescription: item.projects?.description,
        projectStatus: item.projects?.status,
        organizationName: item.organizations?.name,
        organizationLegalName: item.organizations?.legal_name,
        organizationBusinessType: item.organizations?.business_type,
        organizationStatus: item.organizations?.status
      }));
    } catch (error) {
      console.error('Error in getInactiveProjectOrganizationAssignments:', error);
      throw error;
    }
  }

  /**
   * Clear all inactive project organization assignments (permanent delete)
   */
  static async clearInactiveProjectOrganizationAssignments(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('project_organization_assignments')
        .delete()
        .eq('is_active', false)
        .select('id');

      if (error) {
        throw new Error(`Failed to clear inactive project organization assignments: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in clearInactiveProjectOrganizationAssignments:', error);
      throw error;
    }
  }

  /**
   * Restore inactive project organization assignment
   */
  static async restoreProjectOrganizationAssignment(assignmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_organization_assignments')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) {
        throw new Error(`Failed to restore project organization assignment: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in restoreProjectOrganizationAssignment:', error);
      throw error;
    }
  }

  /**
   * Update project organization assignment
   */
  static async updateProjectOrganizationAssignment(
    assignmentId: string,
    updates: {
      relationshipType?: 'issuer' | 'investor' | 'service_provider' | 'regulator';
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.relationshipType !== undefined) {
        updateData.relationship_type = updates.relationshipType;
      }
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive;
      }

      const { error } = await supabase
        .from('project_organization_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) {
        throw new Error(`Failed to update project organization assignment: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateProjectOrganizationAssignment:', error);
      throw error;
    }
  }

  /**
   * Get projects for organization
   */
  static async getProjectsForOrganization(organizationId: string): Promise<{ projectId: string; projectName: string; relationship: string; assignedAt: string }[]> {
    try {
      const assignments = await this.getProjectOrganizationAssignments(undefined, organizationId);
      
      return assignments.map(assignment => ({
        projectId: assignment.projectId,
        projectName: assignment.projectName || 'Unknown Project',
        relationship: assignment.relationship,
        assignedAt: assignment.assignedAt || assignment.createdAt
      }));
    } catch (error) {
      console.error('Error in getProjectsForOrganization:', error);
      throw error;
    }
  }

  /**
   * Get organizations for project
   */
  static async getOrganizationsForProject(projectId: string): Promise<{ organizationId: string; organizationName: string; relationship: string; assignedAt: string }[]> {
    try {
      const assignments = await this.getProjectOrganizationAssignments(projectId);
      
      return assignments.map(assignment => ({
        organizationId: assignment.organizationId,
        organizationName: assignment.organizationName || 'Unknown Organization',
        relationship: assignment.relationship,
        assignedAt: assignment.assignedAt || assignment.createdAt
      }));
    } catch (error) {
      console.error('Error in getOrganizationsForProject:', error);
      throw error;
    }
  }

  /**
   * Bulk assign project to multiple organizations
   */
  static async bulkAssignProjectToOrganizations(
    projectId: string,
    assignments: Array<{
      organizationId: string;
      relationship: 'issuer' | 'investor' | 'service_provider' | 'regulator';
      notes?: string;
    }>
  ): Promise<void> {
    try {
      // Process assignments one by one to handle duplicates gracefully
      for (const assignment of assignments) {
        await this.assignProjectToOrganization(
          projectId,
          assignment.organizationId,
          assignment.relationship,
          assignment.notes
        );
      }
    } catch (error) {
      console.error('Error in bulkAssignProjectToOrganizations:', error);
      throw error;
    }
  }

  /**
   * Get organization business types for filtering
   */
  static async getOrganizationBusinessTypes(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('business_type')
        .not('business_type', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch business types: ${error.message}`);
      }

      const validBusinessTypes = (data || [])
        .map((item: { business_type: string | null }) => item.business_type)
        .filter((type): type is string => Boolean(type));
      
      const businessTypes: string[] = Array.from(new Set(validBusinessTypes));
      return businessTypes;
    } catch (error) {
      console.error('Error in getOrganizationBusinessTypes:', error);
      return [];
    }
  }

  /**
   * Search organizations with debounced query
   */
  static async searchOrganizations(query: string, limit: number = 10): Promise<Organization[]> {
    try {
      if (!query.trim()) {
        return this.getOrganizations({ limit });
      }

      return this.getOrganizations({ 
        query: query.trim(), 
        limit 
      });
    } catch (error) {
      console.error('Error in searchOrganizations:', error);
      throw error;
    }
  }
}

export default OrganizationAssignmentService;
