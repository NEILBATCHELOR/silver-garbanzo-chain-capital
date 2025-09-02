// =====================================================
// DYNAMIC SIDEBAR ADMIN SERVICE
// Fully dynamic admin service without hardcoded defaults
// Removes requiresProject (P flag) concept completely
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
  ProfileTypeEnum,
  AdminSidebarData,
  AdminSidebarSection,
  AdminSidebarItem
} from '@/types/sidebar';
import { SIDEBAR_PROFILE_TYPES } from '@/types/sidebar';

interface SidebarConfigurationRow {
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

export class DynamicSidebarAdminService {
  private static instance: DynamicSidebarAdminService;
  private supabase = supabase;
  private roleCache = new Map<string, { id: string; name: string; priority: number }>();
  private permissionCache = new Map<string, PermissionOption>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  public static getInstance(): DynamicSidebarAdminService {
    if (!DynamicSidebarAdminService.instance) {
      DynamicSidebarAdminService.instance = new DynamicSidebarAdminService();
    }
    return DynamicSidebarAdminService.instance;
  }

  // =====================================================
  // CONFIGURATION CRUD OPERATIONS
  // =====================================================

  /**
   * Get all sidebar configurations with filtering
   */
  public async getSidebarConfigurations(
    filter?: SidebarConfigurationFilter,
    page = 1,
    pageSize = 20
  ): Promise<SidebarConfigurationsListResponse> {
    try {
      let query = this.supabase
        .from('sidebar_configurations')
        .select(`
          id, name, description,
          target_role_ids, target_profile_type_enums,
          min_role_priority, organization_id,
          configuration_data, is_active, is_default,
          created_by, updated_by, created_at, updated_at
        `, { count: 'exact' });

      // Apply filters
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

      // Role filtering
      if (filter?.roleIds && filter.roleIds.length > 0) {
        query = query.overlaps('target_role_ids', filter.roleIds);
      }

      // Profile type filtering
      if (filter?.profileTypes && filter.profileTypes.length > 0) {
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
        console.error('Sidebar configurations query error:', error);
        throw new Error(`Failed to fetch sidebar configurations: ${error.message}`);
      }

      if (!data) {
        return {
          configurations: [],
          total: 0,
          page,
          pageSize
        };
      }

      const configurations = await Promise.all(
        data.map((row) => this.mapDatabaseToConfiguration(row as SidebarConfigurationRow))
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
   * Get a single sidebar configuration by ID
   */
  public async getSidebarConfiguration(id: string): Promise<AdminSidebarConfiguration | null> {
    try {
      const { data, error } = await this.supabase
        .from('sidebar_configurations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch sidebar configuration: ${error.message}`);
      }

      return await this.mapDatabaseToConfiguration(data as SidebarConfigurationRow);
    } catch (error) {
      console.error('Error fetching sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Create a new sidebar configuration
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

      // Clean configuration data to remove any requiresProject fields
      const cleanedConfigurationData = this.cleanConfigurationData(request.configurationData);

      // If this is set as default, ensure no other config is default for the same target
      if (request.isDefault) {
        await this.clearDefaultConfigurations(
          request.targetRoleIds, 
          request.targetProfileTypeEnums.map(pt => pt.toString()), 
          request.organizationId
        );
      }

      const { data: userData } = await this.supabase.auth.getUser();
      const userId = userData.user?.id;

      const insertData: any = {
        name: request.name,
        description: request.description,
        target_role_ids: request.targetRoleIds,
        target_profile_type_enums: request.targetProfileTypeEnums,
        min_role_priority: request.minRolePriority,
        organization_id: request.organizationId,
        configuration_data: cleanedConfigurationData,
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

      return await this.mapDatabaseToConfiguration(data as SidebarConfigurationRow);
    } catch (error) {
      console.error('Error creating sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Update a sidebar configuration
   */
  public async updateSidebarConfiguration(
    id: string,
    request: SidebarConfigurationUpdateRequest
  ): Promise<AdminSidebarConfiguration> {
    try {
      // Validate the configuration
      const validation = await this.validateConfiguration(request);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const { data: userData } = await this.supabase.auth.getUser();
      const userId = userData.user?.id;

      const updateData: any = {
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      if (request.name) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.targetRoleIds) updateData.target_role_ids = request.targetRoleIds;
      if (request.targetProfileTypeEnums) updateData.target_profile_type_enums = request.targetProfileTypeEnums;
      if (request.minRolePriority !== undefined) updateData.min_role_priority = request.minRolePriority;
      if (request.isActive !== undefined) updateData.is_active = request.isActive;
      
      if (request.configurationData) {
        updateData.configuration_data = this.cleanConfigurationData(request.configurationData);
      }

      // Handle default flag
      if (request.isDefault !== undefined) {
        if (request.isDefault) {
          // Get current configuration to clear defaults for same targets
          const currentConfig = await this.getSidebarConfiguration(id);
          if (currentConfig) {
            await this.clearDefaultConfigurations(
              request.targetRoleIds || currentConfig.targetRoleIds,
              (request.targetProfileTypeEnums || currentConfig.targetProfileTypeEnums).map(pt => pt.toString()),
              currentConfig.organizationId
            );
          }
        }
        updateData.is_default = request.isDefault;
      }

      const { data, error } = await this.supabase
        .from('sidebar_configurations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update sidebar configuration: ${error.message}`);
      }

      return await this.mapDatabaseToConfiguration(data as SidebarConfigurationRow);
    } catch (error) {
      console.error('Error updating sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Delete a sidebar configuration
   */
  public async deleteSidebarConfiguration(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('sidebar_configurations')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete sidebar configuration: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting sidebar configuration:', error);
      throw error;
    }
  }

  /**
   * Duplicate a sidebar configuration
   */
  public async duplicateSidebarConfiguration(
    id: string, 
    newName: string
  ): Promise<AdminSidebarConfiguration> {
    try {
      const originalConfig = await this.getSidebarConfiguration(id);
      if (!originalConfig) {
        throw new Error('Original configuration not found');
      }

      const createRequest: SidebarConfigurationCreateRequest = {
        name: newName,
        description: `Copy of ${originalConfig.name}`,
        targetRoleIds: originalConfig.targetRoleIds,
        targetProfileTypeEnums: originalConfig.targetProfileTypeEnums,
        minRolePriority: originalConfig.minRolePriority,
        organizationId: originalConfig.organizationId,
        configurationData: originalConfig.configurationData,
        isDefault: false // Never duplicate as default
      };

      return await this.createSidebarConfiguration(createRequest);
    } catch (error) {
      console.error('Error duplicating sidebar configuration:', error);
      throw error;
    }
  }

  // =====================================================
  // METADATA OPERATIONS
  // =====================================================

  /**
   * Get metadata for admin interface
   */
  public async getAdminMetadata(): Promise<SidebarAdminMetadata> {
    try {
      // Check cache first
      if (this.isMetadataCacheValid()) {
        return {
          permissions: Array.from(this.permissionCache.values()),
          roles: Array.from(this.roleCache.values()),
          profileTypes: SIDEBAR_PROFILE_TYPES,
          availableIcons: this.getAvailableIcons()
        };
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await this.supabase
        .from('roles')
        .select('id, name, priority, description')
        .order('priority', { ascending: false });

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      } else {
        // Update role cache
        this.roleCache.clear();
        rolesData?.forEach(role => {
          this.roleCache.set(role.name, role);
        });
      }

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await this.supabase
        .rpc('get_all_permissions'); // Custom RPC to get all permissions

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
        // Fallback to empty permissions
        this.permissionCache.clear();
      } else {
        // Update permission cache
        this.permissionCache.clear();
        permissionsData?.forEach((permission: any) => {
          this.permissionCache.set(permission.name, {
            name: permission.name,
            description: permission.description || permission.name,
            category: permission.category
          });
        });
      }

      this.lastCacheUpdate = Date.now();

      return {
        permissions: Array.from(this.permissionCache.values()),
        roles: Array.from(this.roleCache.values()),
        profileTypes: SIDEBAR_PROFILE_TYPES,
        availableIcons: this.getAvailableIcons()
      };
    } catch (error) {
      console.error('Error fetching admin metadata:', error);
      return {
        permissions: [],
        roles: [],
        profileTypes: SIDEBAR_PROFILE_TYPES,
        availableIcons: this.getAvailableIcons()
      };
    }
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  /**
   * Validate configuration without requiresProject concept
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

    // Validate role IDs
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

    // Validate profile types
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
      const dataValidation = this.validateConfigurationDataStructure(config.configurationData);
      errors.push(...dataValidation.errors);
      warnings.push(...dataValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Clean configuration data by removing requiresProject fields
   */
  private cleanConfigurationData(configData: AdminSidebarData): AdminSidebarData {
    const cleaned = { ...configData };
    
    if (cleaned.sections) {
      cleaned.sections = cleaned.sections.map(section => ({
        ...section,
        items: section.items.map(item => {
          const cleanedItem = { ...item };
          // Remove requiresProject field if it exists
          if ('requiresProject' in cleanedItem) {
            delete (cleanedItem as any).requiresProject;
          }
          return cleanedItem;
        })
      }));
    }

    return cleaned;
  }

  /**
   * Map database row to AdminSidebarConfiguration
   */
  private async mapDatabaseToConfiguration(data: SidebarConfigurationRow): Promise<AdminSidebarConfiguration> {
    const targetRoleIds = data.target_role_ids || [];
    
    const validProfileTypeValues = SIDEBAR_PROFILE_TYPES.map(pt => pt.value);
    const targetProfileTypeEnums = (data.target_profile_type_enums || [])
      .map(pt => pt as string)
      .filter((pt): pt is ProfileTypeEnum => {
        return validProfileTypeValues.includes(pt as ProfileTypeEnum);
      });

    // Clean the configuration data to remove any requiresProject fields
    const cleanedConfigurationData = this.cleanConfigurationData(data.configuration_data);

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      targetRoleIds,
      targetProfileTypeEnums,
      minRolePriority: data.min_role_priority || undefined,
      organizationId: data.organization_id || undefined,
      configurationData: cleanedConfigurationData,
      isActive: data.is_active ?? true,
      isDefault: data.is_default ?? false,
      createdBy: data.created_by || undefined,
      updatedBy: data.updated_by || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    };
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
   * Validate profile types against enum values
   */
  private validateProfileTypes(profileTypes: string[]): string[] {
    const validTypes = SIDEBAR_PROFILE_TYPES.map(pt => pt.value);
    return profileTypes.filter(pt => {
      return validTypes.includes(pt as ProfileTypeEnum);
    });
  }

  /**
   * Validate configuration data structure
   */
  private validateConfigurationDataStructure(data: any): {
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

          // Warn if requiresProject field is found (should be removed)
          if ('requiresProject' in item) {
            warnings.push({
              field: `configurationData.sections[${index}].items[${itemIndex}]`,
              message: 'requiresProject field is deprecated and will be removed',
              suggestion: 'Remove requiresProject field - project context is handled automatically'
            });
          }
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Check if metadata cache is valid
   */
  private isMetadataCacheValid(): boolean {
    return (Date.now() - this.lastCacheUpdate) < this.CACHE_DURATION 
           && this.roleCache.size > 0;
  }

  /**
   * Get available icons for admin interface
   */
  private getAvailableIcons(): string[] {
    return [
      'BarChart3', 'Users', 'Layers', 'Home', 'PieChart', 'ShieldCheck',
      'UserRoundCog', 'Scale', 'WalletCards', 'FileStackIcon', 'UserRoundPlus',
      'Landmark', 'Activity', 'Wallet', 'KeyRound', 'Coins', 'LayoutDashboard',
      'Fingerprint', 'CreditCard', 'Shield', 'FileText', 'Plus', 'CheckCircle',
      'LogOut', 'FileCog', 'Building', 'Layout', 'CheckSquare', 'ShieldAlert',
      'History', 'Settings', 'BarChart', 'Menu', 'Package', 'ShoppingCart',
      'ArrowLeftRight', 'DollarSign', 'UserCircle', 'Grid2x2Check', 'Combine',
      'Blocks', 'User', 'ChartCandlestick', 'Factory', 'Zap', 'Gauge',
      'Trophy', 'Leaf', 'TrendingUp', 'BarChart2', 'PanelLeftDashed'
    ];
  }
}

// Export singleton instance
export const dynamicSidebarAdminService = DynamicSidebarAdminService.getInstance();
