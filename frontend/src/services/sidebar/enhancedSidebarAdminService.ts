// =====================================================
// ENHANCED SIDEBAR ADMIN SERVICE
// Supporting both legacy text arrays and new UUID/enum references
// Date: August 28, 2025
// =====================================================

import { supabase } from '@/infrastructure/database/client';
import type { Database } from '@/types/core/database';
import type {
  AdminSidebarConfiguration,
  SidebarConfigurationFilter,
  SidebarConfigurationCreateRequest,
  SidebarConfigurationUpdateRequest,
  SidebarConfigurationResponse,
  SidebarConfigurationsListResponse,
  SidebarAdminMetadata,
  PermissionOption,
  RoleOption,
  ProfileTypeOption,
  SidebarConfigurationValidation,
  ProfileTypeEnum
} from '@/types/sidebar';
import { SIDEBAR_PROFILE_TYPES } from '@/types/sidebar';

interface EnhancedSidebarConfigurationRow {
  id: string;
  name: string;
  description: string | null;
  target_role_ids: string[] | null;
  target_profile_type_enums: string[] | null;
  min_role_priority: number | null;
  organization_id: string | null;
  configuration_data: any;
  is_active: boolean | null;
  is_default: boolean | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export class EnhancedSidebarAdminService {
  private static instance: EnhancedSidebarAdminService;
  private supabase = supabase;
  private roleCache = new Map<string, { id: string; name: string; priority: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): EnhancedSidebarAdminService {
    if (!EnhancedSidebarAdminService.instance) {
      EnhancedSidebarAdminService.instance = new EnhancedSidebarAdminService();
    }
    return EnhancedSidebarAdminService.instance;
  }

  // =====================================================
  // CONFIGURATION CRUD OPERATIONS WITH DUAL SCHEMA SUPPORT
  // =====================================================

  /**
   * Get all sidebar configurations with enhanced filtering
   */
  public async getSidebarConfigurations(
    filter?: SidebarConfigurationFilter,
    page = 1,
    pageSize = 20
  ): Promise<SidebarConfigurationsListResponse> {
    try {
      // Query the actual database columns
      let query = this.supabase
        .from('sidebar_configurations')
        .select(`
          id, name, description,
          target_role_ids, target_profile_type_enums,
          min_role_priority, organization_id,
          configuration_data, is_active, is_default,
          created_by, updated_by, created_at, updated_at
        `);

      // Apply filters with dual schema support
      if (filter?.organizationId) {
        query = query.eq('organization_id', filter.organizationId);
      }
      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }
      if (filter?.isDefault !== undefined) {
        query = query.eq('is_default', filter.isDefault);
      }
      if (filter?.minRolePriority) {
        query = query.gte('min_role_priority', filter.minRolePriority);
      }

      // Role filtering with dual schema support
      if (filter?.roleIds && filter.roleIds.length > 0) {
        // Filter by role IDs directly
        query = query.overlaps('target_role_ids', filter.roleIds);
      }

      // Profile type filtering with dual schema support
      if (filter?.profileTypes && filter.profileTypes.length > 0) {
        // Check if we have the new enum columns
        const hasEnumColumns = await this.checkForEnumColumns();
        // Use the correct column name that exists in database
        query = query.overlaps('target_profile_type_enums', filter.profileTypes);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by updated_at desc
      query = query.order('updated_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Enhanced sidebar configurations query error:', error);
        throw new Error(`Failed to fetch sidebar configurations: ${error.message}`);
      }

      if (!data) {
        console.warn('No sidebar configurations found');
        return {
          configurations: [],
          total: 0,
          page,
          pageSize
        };
      }

      const configurations = await Promise.all(
        data.map((row) => this.mapDatabaseToConfiguration(row as EnhancedSidebarConfigurationRow))
      );

      return {
        configurations,
        total: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Error fetching sidebar configurations:', error);
      throw error;
    }
  }

  /**
   * Create a new sidebar configuration with dual schema support
   */
  public async createSidebarConfiguration(
    request: SidebarConfigurationCreateRequest
  ): Promise<AdminSidebarConfiguration> {
    try {
      // Validate the configuration
      const validation = await this.validateConfiguration(request);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Validate profile types match enum values
      const validProfileTypes = this.validateProfileTypes(request.targetProfileTypeEnums.map(pt => pt.toString()));

      // If this is set as default, ensure no other config is default for the same target
      if (request.isDefault) {
        await this.clearDefaultConfigurations(request.targetRoleIds, request.targetProfileTypeEnums.map(pt => pt.toString()), request.organizationId);
      }

      const { data: userData } = await this.supabase.auth.getUser();
      const userId = userData.user?.id;

      // Create insert object with new schema support
      const insertData: any = {
        name: request.name,
        description: request.description,
        target_role_ids: request.targetRoleIds,
        target_profile_type_enums: request.targetProfileTypeEnums,
        min_role_priority: request.minRolePriority,
        organization_id: request.organizationId,
        configuration_data: request.configurationData,
        is_default: request.isDefault || false,
        created_by: userId,
        updated_by: userId
      };

      const { data, error } = await this.supabase
        .from('sidebar_configurations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create sidebar configuration: ${error.message}`);
      }

      return await this.mapDatabaseToConfiguration(data as EnhancedSidebarConfigurationRow);
    } catch (error) {
      console.error('Error creating sidebar configuration:', error);
      throw error;
    }
  }

  // =====================================================
  // HELPER METHODS FOR DUAL SCHEMA SUPPORT
  // =====================================================

  /**
   * Check if enhanced columns exist in the database
   */
  private async checkForEnhancedColumns(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sidebar_configurations')
        .select('target_role_ids, target_profile_type_enums')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Check if enum columns exist
   */
  private async checkForEnumColumns(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sidebar_configurations')
        .select('target_profile_type_enums')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Convert role names to role IDs
   */
  private async getRoleIdsByNames(roleNames: string[]): Promise<string[]> {
    try {
      // Check cache first
      const cachedIds = roleNames
        .map(name => this.roleCache.get(name)?.id)
        .filter((id): id is string => id !== undefined);

      if (cachedIds.length === roleNames.length) {
        return cachedIds;
      }

      // Fetch from database
      const { data, error } = await this.supabase
        .from('roles')
        .select('id, name, priority')
        .in('name', roleNames);

      if (error) {
        console.error('Error fetching role IDs:', error);
        return [];
      }

      // Update cache
      data.forEach(role => {
        this.roleCache.set(role.name, role);
      });

      return data.map(role => role.id);
    } catch (error) {
      console.error('Error converting role names to IDs:', error);
      return [];
    }
  }

  /**
   * Validate profile types against enum values
   */
  private validateProfileTypes(profileTypes: string[]): string[] {
    const validTypes = SIDEBAR_PROFILE_TYPES.map(pt => pt.value);
    return profileTypes.filter(pt => {
      // Handle legacy 'admin' mapping to 'super admin'
      if (pt === 'admin') {
        return true; // Will be converted during migration
      }
      return validTypes.includes(pt as ProfileTypeEnum);
    });
  }

  /**
   * Map database row to AdminSidebarConfiguration using new schema
   */
  private async mapDatabaseToConfiguration(data: EnhancedSidebarConfigurationRow): Promise<AdminSidebarConfiguration> {
    // Use new schema fields
    const targetRoleIds = data.target_role_ids || [];
    
    // Safely cast profile type enums with validation using the constant
    const validProfileTypeValues = SIDEBAR_PROFILE_TYPES.map(pt => pt.value);
    const targetProfileTypeEnums = (data.target_profile_type_enums || [])
      .map(pt => pt as string)
      .filter((pt): pt is ProfileTypeEnum => {
        return validProfileTypeValues.includes(pt as ProfileTypeEnum);
      });

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      targetRoleIds,
      targetProfileTypeEnums,
      minRolePriority: data.min_role_priority || undefined,
      organizationId: data.organization_id || undefined,
      configurationData: data.configuration_data,
      isActive: data.is_active ?? true,
      isDefault: data.is_default ?? false,
      createdBy: data.created_by || undefined,
      updatedBy: data.updated_by || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    };
  }

  /**
   * Convert role IDs back to role names
   */
  private async getRoleNamesByIds(roleIds: string[]): Promise<string[]> {
    try {
      // Check cache first
      const cachedNames = roleIds
        .map(id => Array.from(this.roleCache.values()).find(role => role.id === id)?.name)
        .filter((name): name is string => name !== undefined);

      if (cachedNames.length === roleIds.length) {
        return cachedNames;
      }

      // Fetch from database
      const { data, error } = await this.supabase
        .from('roles')
        .select('id, name, priority')
        .in('id', roleIds);

      if (error) {
        console.error('Error fetching role names:', error);
        return [];
      }

      // Update cache
      data.forEach(role => {
        this.roleCache.set(role.name, role);
      });

      return data.map(role => role.name);
    } catch (error) {
      console.error('Error converting role IDs to names:', error);
      return [];
    }
  }

  /**
   * Clear default configurations for the same target
   */
  private async clearDefaultConfigurations(
    targetRoleIds: string[],
    targetProfileTypes: string[],
    organizationId?: string
  ): Promise<void> {
    try {
      let query = this.supabase
        .from('sidebar_configurations')
        .update({ is_default: false })
        .eq('is_default', true);

      // Use new schema columns
      if (targetRoleIds.length > 0) {
        query = query.overlaps('target_role_ids', targetRoleIds);
      }
      query = query.overlaps('target_profile_type_enums', targetProfileTypes);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing default configurations:', error);
      }
    } catch (error) {
      console.error('Error clearing default configurations:', error);
    }
  }

  /**
   * Enhanced validation with schema support
   */
  public async validateConfiguration(
    config: SidebarConfigurationCreateRequest | SidebarConfigurationUpdateRequest
  ): Promise<SidebarConfigurationValidation> {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string; suggestion?: string }> = [];

    // Basic validation
    if ('name' in config && (!config.name || config.name.trim().length === 0)) {
      errors.push({
        field: 'name',
        message: 'Configuration name is required',
        code: 'REQUIRED'
      });
    }

    if ('targetRoleIds' in config && (!config.targetRoleIds || config.targetRoleIds.length === 0)) {
      errors.push({
        field: 'targetRoleIds',
        message: 'At least one target role is required',
        code: 'REQUIRED'
      });
    }

    if ('targetProfileTypeEnums' in config && (!config.targetProfileTypeEnums || config.targetProfileTypeEnums.length === 0)) {
      errors.push({
        field: 'targetProfileTypeEnums',
        message: 'At least one target profile type is required',
        code: 'REQUIRED'
      });
    }

    // Enhanced validation for role IDs
    if ('targetRoleIds' in config && config.targetRoleIds) {
      const validRoles = await this.validateRoleIds(config.targetRoleIds);
      if (validRoles.length !== config.targetRoleIds.length) {
        const invalidRoles = config.targetRoleIds.filter(roleId => !validRoles.includes(roleId));
        warnings.push({
          field: 'targetRoleIds',
          message: `Some role IDs may not exist: ${invalidRoles.join(', ')}`,
          suggestion: 'Verify role IDs match existing roles in the database'
        });
      }
    }

    // Enhanced validation for profile types
    if ('targetProfileTypeEnums' in config && config.targetProfileTypeEnums) {
      const validProfileTypes = this.validateProfileTypes(config.targetProfileTypeEnums.map(pt => pt.toString()));
      if (validProfileTypes.length !== config.targetProfileTypeEnums.length) {
        const invalidTypes = config.targetProfileTypeEnums.filter(pt => !validProfileTypes.includes(pt.toString()));
        warnings.push({
          field: 'targetProfileTypeEnums',
          message: `Some profile types may not be valid: ${invalidTypes.join(', ')}`,
          suggestion: 'Use only: investor, issuer, service provider, super admin'
        });
      }
    }

    // Validate configuration data structure
    if ('configurationData' in config && config.configurationData) {
      const dataValidation = this.validateConfigurationData(config.configurationData);
      errors.push(...dataValidation.errors);
      warnings.push(...dataValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate role IDs exist in database
   */
  private async validateRoleIds(roleIds: string[]): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .select('id')
        .in('id', roleIds);

      if (error) {
        console.error('Error validating role IDs:', error);
        return [];
      }

      return data.map(role => role.id);
    } catch (error) {
      console.error('Error validating role IDs:', error);
      return [];
    }
  }

  /**
   * Validate configuration data structure
   */
  private validateConfigurationData(data: any): {
    errors: Array<{ field: string; message: string; code: string }>;
    warnings: Array<{ field: string; message: string; suggestion?: string }>;
  } {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string; suggestion?: string }> = [];

    if (!data.sections || !Array.isArray(data.sections)) {
      errors.push({
        field: 'configurationData.sections',
        message: 'Sections array is required',
        code: 'INVALID_STRUCTURE'
      });
      return { errors, warnings };
    }

    // Validate sections
    (data.sections as any[]).forEach((section: any, index: number) => {
      if (!section.id || !section.title) {
        errors.push({
          field: `configurationData.sections[${index}]`,
          message: 'Section must have id and title',
          code: 'REQUIRED'
        });
      }

      if (section.items && Array.isArray(section.items)) {
        (section.items as any[]).forEach((item: any, itemIndex: number) => {
          if (!item.id || !item.label || !item.href) {
            errors.push({
              field: `configurationData.sections[${index}].items[${itemIndex}]`,
              message: 'Item must have id, label, and href',
              code: 'REQUIRED'
            });
          }
        });
      }
    });

    return { errors, warnings };
  }

  // =====================================================
  // MIGRATION UTILITY METHODS
  // =====================================================

  /**
   * Check if migration is needed
   */
  public async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    hasEnhancedColumns: boolean;
    configurationsCount: number;
    migratedCount: number;
  }> {
    try {
      const hasEnhancedColumns = await this.checkForEnhancedColumns();
      
      const { count: totalCount } = await this.supabase
        .from('sidebar_configurations')
        .select('*', { count: 'exact', head: true });

      let migratedCount = 0;
      if (hasEnhancedColumns) {
        const { count } = await this.supabase
          .from('sidebar_configurations')
          .select('*', { count: 'exact', head: true })
          .not('target_role_ids', 'is', null);
        
        migratedCount = count || 0;
      }

      return {
        needsMigration: hasEnhancedColumns && migratedCount < (totalCount || 0),
        hasEnhancedColumns,
        configurationsCount: totalCount || 0,
        migratedCount
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        needsMigration: false,
        hasEnhancedColumns: false,
        configurationsCount: 0,
        migratedCount: 0
      };
    }
  }

  /**
   * Get a single sidebar configuration by ID
   */
  public async getSidebarConfiguration(
    id: string
  ): Promise<SidebarConfigurationResponse> {
    try {
      const { data, error } = await this.supabase
        .from('sidebar_configurations')
        .select(`
          id, name, description,
          target_role_ids, target_profile_type_enums,
          min_role_priority, organization_id,
          configuration_data, is_active, is_default,
          created_by, updated_by, created_at, updated_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch sidebar configuration: ${error.message}`);
      }

      if (!data) {
        throw new Error('Sidebar configuration not found');
      }

      const configuration = await this.mapDatabaseToConfiguration(data as EnhancedSidebarConfigurationRow);
      const metadata = await this.getAdminMetadata();

      return {
        configuration,
        permissions: metadata.permissions,
        roles: metadata.roles,
        profileTypes: metadata.profileTypes,
        availableIcons: metadata.availableIcons
      };
    } catch (error) {
      console.error('Error fetching sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Update an existing sidebar configuration
   */
  public async updateSidebarConfiguration(
    id: string,
    request: SidebarConfigurationUpdateRequest
  ): Promise<AdminSidebarConfiguration> {
    try {
      // Validate the configuration if provided
      if (request.configurationData) {
        const validation = await this.validateConfiguration(request as SidebarConfigurationCreateRequest);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // If this is being set as default, clear other defaults for the same target
      if (request.isDefault && request.targetRoleIds && request.targetProfileTypeEnums) {
        await this.clearDefaultConfigurations(
          request.targetRoleIds,
          request.targetProfileTypeEnums.map(pt => pt.toString()),
          request.organizationId
        );
      }

      const { data: userData } = await this.supabase.auth.getUser();
      const userId = userData.user?.id;

      // Create update object
      const updateData: any = {
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      // Add fields that are being updated
      if (request.name !== undefined) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.targetRoleIds !== undefined) updateData.target_role_ids = request.targetRoleIds;
      if (request.targetProfileTypeEnums !== undefined) updateData.target_profile_type_enums = request.targetProfileTypeEnums;
      if (request.minRolePriority !== undefined) updateData.min_role_priority = request.minRolePriority;
      if (request.configurationData !== undefined) updateData.configuration_data = request.configurationData;
      if (request.isActive !== undefined) updateData.is_active = request.isActive;
      if (request.isDefault !== undefined) updateData.is_default = request.isDefault;

      const { data, error } = await this.supabase
        .from('sidebar_configurations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update sidebar configuration: ${error.message}`);
      }

      return await this.mapDatabaseToConfiguration(data as EnhancedSidebarConfigurationRow);
    } catch (error) {
      console.error('Error updating sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Delete a sidebar configuration
   */
  public async deleteSidebarConfiguration(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sidebar_configurations')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete sidebar configuration: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Get admin metadata (roles, permissions, profile types)
   */
  public async getAdminMetadata(): Promise<SidebarAdminMetadata> {
    try {
      // Get all roles
      const { data: roles, error: rolesError } = await this.supabase
        .from('roles')
        .select('id, name, priority, description')
        .order('priority', { ascending: false });

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Get all unique permissions
      const { data: permissions, error: permissionsError } = await this.supabase
        .from('role_permissions')
        .select('permission_name')
        .order('permission_name');

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
      }

      // Transform roles
      const roleOptions: RoleOption[] = (roles || []).map(role => ({
        id: role.id,
        name: role.name,
        priority: role.priority,
        description: role.description || undefined
      }));

      // Transform permissions (remove duplicates)
      const permissionData = permissions || [];
      const validPermissionNames: string[] = [];
      
      for (const perm of permissionData) {
        if (perm.permission_name && typeof perm.permission_name === 'string') {
          validPermissionNames.push(perm.permission_name);
        }
      }
      
      const uniquePermissions = Array.from(new Set(validPermissionNames));
      const permissionOptions: PermissionOption[] = uniquePermissions
        .sort()
        .map(permission => {
          const parts = permission.split('.');
          return {
            name: permission,
            description: `${parts[0]} - ${parts[1] || 'access'}`,
            category: parts[0]
          };
        });

      // Profile types from constants
      const profileTypes = SIDEBAR_PROFILE_TYPES;

      // Available icons (this could be extended to fetch from a database or config)
      const availableIcons = [
        'Home', 'Users', 'Settings', 'Shield', 'Wallet', 'FileText',
        'BarChart', 'Globe', 'Lock', 'Key', 'Database', 'Activity',
        'Briefcase', 'DollarSign', 'TrendingUp', 'AlertTriangle',
        'CheckCircle', 'XCircle', 'Clock', 'Calendar', 'Mail',
        'Phone', 'Map', 'Star', 'Heart', 'Bookmark', 'Tag',
        'Search', 'Filter', 'Download', 'Upload', 'Edit', 'Trash'
      ];

      return {
        permissions: permissionOptions,
        roles: roleOptions,
        profileTypes,
        availableIcons
      };
    } catch (error) {
      console.error('Error fetching admin metadata:', error);
      
      // Return minimal metadata to prevent complete failure
      return {
        permissions: [],
        roles: [],
        profileTypes: SIDEBAR_PROFILE_TYPES,
        availableIcons: ['Home', 'Users', 'Settings']
      };
    }
  }

  // Extend other methods from the original service...
  // [Additional methods can be added here following the same pattern]
}

// Export enhanced singleton instance
export const enhancedSidebarAdminService = EnhancedSidebarAdminService.getInstance();
