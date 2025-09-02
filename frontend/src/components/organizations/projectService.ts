/**
 * Project Service
 * Service for fetching project data for organization assignments
 */

import { supabase } from '@/infrastructure/database/client';

export interface ProjectData {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  projectType?: string | null;
  organizationId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export class ProjectService {
  /**
   * Get all projects available for assignment
   */
  static async getProjects(options: {
    limit?: number;
    organizationId?: string;
    status?: string;
    search?: string;
  } = {}): Promise<ProjectData[]> {
    try {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          project_type,
          organization_id,
          created_at,
          updated_at
        `)
        .order('name', { ascending: true });

      // Apply filters
      if (options.organizationId) {
        query = query.eq('organization_id', options.organizationId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch projects:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      return (data || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        projectType: project.project_type,
        organizationId: project.organization_id,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));
    } catch (error) {
      console.error('Error in getProjects:', error);
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string): Promise<ProjectData | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          project_type,
          organization_id,
          created_at,
          updated_at
        `)
        .eq('id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Project not found
        }
        throw new Error(`Failed to fetch project: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        status: data.status,
        projectType: data.project_type,
        organizationId: data.organization_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in getProjectById:', error);
      throw error;
    }
  }

  /**
   * Search projects by name or description
   */
  static async searchProjects(query: string, limit: number = 10): Promise<ProjectData[]> {
    try {
      if (!query.trim()) {
        return this.getProjects({ limit });
      }

      return this.getProjects({ search: query.trim(), limit });
    } catch (error) {
      console.error('Error in searchProjects:', error);
      throw error;
    }
  }
}

export default ProjectService;
