/**
 * Organization Project Filter Service
 * Service for filtering projects based on user's organization access
 */

import { supabase } from '@/infrastructure/database/client';
import { OrganizationContextData } from './OrganizationContext';

export class OrganizationProjectFilterService {
  
  /**
   * Get projects accessible to user through their organization assignments
   */
  static async getProjectsForUserOrganizations(userId: string): Promise<any[]> {
    try {
      // Get user's organization assignments first
      const { data: userOrgs, error: userOrgError } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', userId);

      if (userOrgError) {
        console.error('Error fetching user organizations:', userOrgError);
        return [];
      }

      if (!userOrgs || userOrgs.length === 0) {
        // User has no organization assignments, return all projects (legacy behavior)
        return await this.getAllProjects();
      }

      const organizationIds = userOrgs.map(org => org.organization_id);

      // Get projects assigned to user's organizations
      const { data: projectAssignments, error: projectError } = await supabase
        .from('project_organization_assignments')
        .select(`
          project_id,
          projects!inner (
            id,
            name,
            description,
            is_primary,
            status,
            created_at
          )
        `)
        .in('organization_id', organizationIds)
        .eq('is_active', true);

      if (projectError) {
        console.error('Error fetching organization projects:', projectError);
        return [];
      }

      // Extract unique projects
      const projects = projectAssignments
        ?.map(assignment => (assignment as any).projects)
        .filter((project, index, self) => 
          index === self.findIndex(p => p.id === project.id)
        ) || [];

      return projects;

    } catch (error) {
      console.error('Error in getProjectsForUserOrganizations:', error);
      return [];
    }
  }

  /**
   * Get projects for a specific organization
   */
  static async getProjectsForOrganization(organizationId: string): Promise<any[]> {
    try {
      const { data: projectAssignments, error } = await supabase
        .from('project_organization_assignments')
        .select(`
          project_id,
          projects!inner (
            id,
            name,
            description,
            is_primary,
            status,
            created_at
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organization projects:', error);
        return [];
      }

      return projectAssignments?.map(assignment => (assignment as any).projects) || [];

    } catch (error) {
      console.error('Error in getProjectsForOrganization:', error);
      return [];
    }
  }

  /**
   * Check if user has access to a specific project through organization assignments
   */
  static async userHasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      // Get user's organizations
      const { data: userOrgs, error: userOrgError } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', userId);

      if (userOrgError || !userOrgs || userOrgs.length === 0) {
        // Fallback: if no organization assignments, allow access (legacy behavior)
        return true;
      }

      const organizationIds = userOrgs.map(org => org.organization_id);

      // Check if project is assigned to any of user's organizations
      const { data: projectAssignments, error: projectError } = await supabase
        .from('project_organization_assignments')
        .select('id')
        .eq('project_id', projectId)
        .in('organization_id', organizationIds)
        .eq('is_active', true)
        .limit(1);

      if (projectError) {
        console.error('Error checking project access:', projectError);
        return false;
      }

      return projectAssignments && projectAssignments.length > 0;

    } catch (error) {
      console.error('Error in userHasProjectAccess:', error);
      return false;
    }
  }

  /**
   * Get all projects (fallback method)
   */
  static async getAllProjects(): Promise<any[]> {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, description, is_primary, status, created_at')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all projects:', error);
        return [];
      }

      return projects || [];

    } catch (error) {
      console.error('Error in getAllProjects:', error);
      return [];
    }
  }

  /**
   * Get user's accessible organizations - only organizations with active projects
   */
  static async getUserOrganizations(userId: string): Promise<OrganizationContextData[]> {
    try {
      // First get user's organization assignments
      const { data: allUserOrgRoles, error: userOrgError } = await supabase
        .from('user_organization_roles')
        .select(`
          organization_id,
          organizations!inner (
            id,
            name,
            legal_name,
            status
          )
        `)
        .eq('user_id', userId);

      if (userOrgError) {
        console.error('Error fetching user organizations:', userOrgError);
        return [];
      }

      // Get organizations that have active projects
      const orgIds = allUserOrgRoles?.map(role => (role as any).organizations.id) || [];
      
      if (orgIds.length === 0) {
        return [];
      }

      const { data: orgsWithProjects, error: projectsError } = await supabase
        .from('project_organization_assignments')
        .select(`
          organization_id,
          organizations!inner (
            id,
            name,
            legal_name,
            status
          )
        `)
        .in('organization_id', orgIds)
        .eq('is_active', true);

      if (projectsError) {
        console.error('Error fetching organizations with projects:', projectsError);
        // Fallback to all user organizations if project query fails
        return allUserOrgRoles
          ?.map(role => ({
            id: (role as any).organizations.id,
            name: (role as any).organizations.name,
            legalName: (role as any).organizations.legal_name,
            status: (role as any).organizations.status,
          }))
          .filter((org, index, self) => 
            index === self.findIndex(o => o.id === org.id)
          ) || [];
      }

      // Extract unique organizations that have projects
      const organizations = orgsWithProjects
        ?.map(assignment => ({
          id: (assignment as any).organizations.id,
          name: (assignment as any).organizations.name,
          legalName: (assignment as any).organizations.legal_name,
          status: (assignment as any).organizations.status,
        }))
        .filter((org, index, self) => 
          index === self.findIndex(o => o.id === org.id)
        ) || [];

      return organizations;

    } catch (error) {
      console.error('Error in getUserOrganizations:', error);
      return [];
    }
  }
}
