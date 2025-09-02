// =====================================================
// SIDEBAR DATABASE SERVICE
// Service for loading sidebar configurations from database
// Created: August 28, 2025 - Database integration fix
// =====================================================

import { supabase } from '@/infrastructure/database/client';
import type { 
  AdminSidebarConfiguration,
  UserContext,
  SidebarConfiguration,
  SidebarSection,
  SidebarItem,
  ProfileTypeEnum
} from '@/types/sidebar';
import { sidebarConfigService } from './sidebarConfigService';
import { resolveIcon } from '@/utils/icons';

export class SidebarDatabaseService {
  private static instance: SidebarDatabaseService;
  private cache = new Map<string, AdminSidebarConfiguration[]>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): SidebarDatabaseService {
    if (!SidebarDatabaseService.instance) {
      SidebarDatabaseService.instance = new SidebarDatabaseService();
    }
    return SidebarDatabaseService.instance;
  }

  /**
   * Get sidebar configuration for a specific user context
   * Priority: Database configurations → Fallback to hardcoded mappings
   */
  public async getSidebarConfigurationForUser(userContext: UserContext): Promise<SidebarConfiguration> {
    try {
      // Try to get database configuration first
      const dbConfig = await this.getApplicableConfiguration(userContext);
      
      if (dbConfig) {
        console.log(`Loading database sidebar configuration: ${dbConfig.name}`);
        return this.convertAdminConfigToSidebarConfig(dbConfig, userContext);
      }

      // Fallback to hardcoded configuration
      console.log('No database configuration found, using hardcoded mappings');
      return sidebarConfigService.getFilteredSidebarConfig(userContext);
      
    } catch (error) {
      console.error('Error loading sidebar configuration from database:', error);
      // Always fallback to hardcoded config on error
      return sidebarConfigService.getFilteredSidebarConfig(userContext);
    }
  }

  /**
   * Get the most applicable configuration for a user
   */
  private async getApplicableConfiguration(userContext: UserContext): Promise<AdminSidebarConfiguration | null> {
    const cacheKey = this.generateUserCacheKey(userContext);
    
    // Check cache first
    const cached = this.getCachedConfigurations(cacheKey);
    if (cached) {
      return this.findBestMatch(cached, userContext);
    }

    try {
      // Query database for applicable configurations
      const { data: configurations, error } = await supabase
        .from('sidebar_configurations')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false }) // Default configs first
        .order('updated_at', { ascending: false }); // Most recent first

      if (error) {
        console.error('Error fetching sidebar configurations:', error);
        return null;
      }

      if (!configurations || configurations.length === 0) {
        return null;
      }

      // Parse the configurations and find the best match
      const parsedConfigurations = configurations.map(config => ({
        ...config,
        targetRoleIds: config.target_role_ids || [],
        targetProfileTypeEnums: Array.isArray(config.target_profile_type_enums) 
          ? config.target_profile_type_enums 
          : Object.keys(config.target_profile_type_enums || {}) as ProfileTypeEnum[],
        minRolePriority: config.min_role_priority,
        configurationData: config.configuration_data,
        isActive: config.is_active,
        isDefault: config.is_default,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
        createdBy: config.created_by,
        updatedBy: config.updated_by,
        organizationId: config.organization_id
      })) as AdminSidebarConfiguration[];

      // Cache the results
      this.setCachedConfigurations(cacheKey, parsedConfigurations);

      return this.findBestMatch(parsedConfigurations, userContext);

    } catch (error) {
      console.error('Database query error:', error);
      return null;
    }
  }

  /**
   * Find the best matching configuration for user context
   */
  private findBestMatch(configurations: AdminSidebarConfiguration[], userContext: UserContext): AdminSidebarConfiguration | null {
    // Filter configurations that match user context
    const matchingConfigs = configurations.filter(config => {
      // Check role match
      if (config.targetRoleIds.length > 0) {
        const hasMatchingRole = userContext.roles.some(userRole => 
          config.targetRoleIds.includes(userRole.id)
        );
        if (!hasMatchingRole) return false;
      }

      // Check profile type match
      if (config.targetProfileTypeEnums.length > 0) {
        if (!userContext.profileType || !config.targetProfileTypeEnums.includes(userContext.profileType as ProfileTypeEnum)) {
          return false;
        }
      }

      // Check minimum role priority
      if (config.minRolePriority && userContext.highestRolePriority < config.minRolePriority) {
        return false;
      }

      return true;
    });

    if (matchingConfigs.length === 0) {
      return null;
    }

    // Priority order: Default first, then most recent
    return matchingConfigs.find(config => config.isDefault) || matchingConfigs[0];
  }

  /**
   * Convert admin configuration to sidebar configuration format
   */
  private convertAdminConfigToSidebarConfig(
    adminConfig: AdminSidebarConfiguration, 
    userContext: UserContext
  ): SidebarConfiguration {
    console.log('Converting admin config to sidebar config:', {
      configName: adminConfig.name,
      sectionsCount: adminConfig.configurationData.sections.length
    });

    const sections: SidebarSection[] = adminConfig.configurationData.sections
      .filter(section => section.isActive)
      .map((adminSection, originalIndex) => {
        // Log section processing
        console.log('Processing section:', {
          title: adminSection.title,
          displayOrder: adminSection.displayOrder,
          originalIndex,
          itemsCount: adminSection.items.length
        });

        // Filter items based on user permissions
        const filteredItems: SidebarItem[] = adminSection.items
          .filter(item => item.isActive && item.isVisible)
          .filter(item => this.checkItemPermissions(item, userContext))
          .map(adminItem => ({
            id: adminItem.id,
            label: adminItem.label,
            href: this.processHref(adminItem.href, userContext),
            icon: this.getIconComponent(adminItem.icon),
            permissions: adminItem.requiredPermissions || [],
            minRolePriority: adminItem.minRolePriority,
            profileTypes: [],
            roles: [],
            isVisible: adminItem.isVisible
          }))
          .sort((a, b) => {
            // Sort items by displayOrder (lower number = higher priority)
            const aItem = adminSection.items.find(item => item.id === a.id);
            const bItem = adminSection.items.find(item => item.id === b.id);
            const aOrder = aItem?.displayOrder ?? 999;
            const bOrder = bItem?.displayOrder ?? 999;
            
            // If orders are equal, maintain original array order for stability
            if (aOrder === bOrder) {
              const aIndex = adminSection.items.findIndex(item => item.id === a.id);
              const bIndex = adminSection.items.findIndex(item => item.id === b.id);
              return aIndex - bIndex;
            }
            
            return aOrder - bOrder;
          });

        console.log('Items after filtering and sorting:', filteredItems.map(item => ({
          label: item.label,
          originalOrder: adminSection.items.find(i => i.id === item.id)?.displayOrder
        })));

        return {
          id: adminSection.id,
          title: adminSection.title,
          items: filteredItems,
          permissions: adminSection.requiredPermissions || [],
          minRolePriority: adminSection.minRolePriority,
          profileTypes: [],
          roles: []
        };
      })
      // Only include sections with visible items
      .filter(section => section.items.length > 0)
      // Enhanced section sorting with better fallback logic
      .sort((a, b) => {
        const aSection = adminConfig.configurationData.sections.find(s => s.id === a.id);
        const bSection = adminConfig.configurationData.sections.find(s => s.id === b.id);
        
        const aOrder = aSection?.displayOrder ?? 999;
        const bOrder = bSection?.displayOrder ?? 999;
        
        // If displayOrder values are equal, use predefined section priority
        if (aOrder === bOrder) {
          const sectionPriority = this.getSectionPriority(a.title, b.title);
          if (sectionPriority !== 0) {
            return sectionPriority;
          }
          
          // Final fallback: maintain original array order
          const aIndex = adminConfig.configurationData.sections.findIndex(s => s.id === a.id);
          const bIndex = adminConfig.configurationData.sections.findIndex(s => s.id === b.id);
          return aIndex - bIndex;
        }
        
        return aOrder - bOrder;
      });

    console.log('Final sections order:', sections.map(section => ({
      title: section.title,
      displayOrder: adminConfig.configurationData.sections.find(s => s.id === section.id)?.displayOrder,
      itemsCount: section.items.length
    })));

    return {
      sections,
      profileType: userContext.profileType,
      lastUpdated: adminConfig.updatedAt
    };
  }

  /**
   * Get predefined section priority for consistent ordering
   */
  private getSectionPriority(titleA: string, titleB: string): number {
    const sectionOrder = [
      'OVERVIEW',
      'ONBOARDING', 
      'ISSUANCE',
      'FACTORING',
      'CLIMATE RECEIVABLES',
      'COMPLIANCE',
      'WALLET MANAGEMENT',
      'ADMINISTRATION'
    ];
    
    const aIndex = sectionOrder.indexOf(titleA);
    const bIndex = sectionOrder.indexOf(titleB);
    
    // If both sections are in the predefined order, sort by index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in the predefined order, prioritize it
    if (aIndex !== -1 && bIndex === -1) return -1;
    if (aIndex === -1 && bIndex !== -1) return 1;
    
    // If neither is in the predefined order, maintain alphabetical order
    return titleA.localeCompare(titleB);
  }

  /**
   * Check if user has permissions for an item
   * Uses same direct permission checking as fallback service for consistency
   */
  private checkItemPermissions(item: any, userContext: UserContext): boolean {
    // If no permissions required, item is visible
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      console.log(`Item ${item.label}: No permissions required, allowing access`);
      return true;
    }

    // Check role priority first
    if (item.minRolePriority && userContext.highestRolePriority < item.minRolePriority) {
      console.log(`Item ${item.label}: Insufficient role priority (${userContext.highestRolePriority} < ${item.minRolePriority})`);
      return false;
    }

    // Use direct permission checking (same as fallback service)
    // ANY permission matching (OR logic)
    const hasRequiredPermission = item.requiredPermissions.some((permission: string) =>
      userContext.permissions.includes(permission)
    );

    if (hasRequiredPermission) {
      const matchedPermissions = item.requiredPermissions.filter((permission: string) =>
        userContext.permissions.includes(permission)
      );
      console.log(`Item ${item.label}: Access granted`, {
        requiredPermissions: item.requiredPermissions,
        matchedPermissions,
        userRolePriority: userContext.highestRolePriority,
        minRequired: item.minRolePriority || 'none'
      });
      return true;
    }

    const missingPermissions = item.requiredPermissions.filter((permission: string) =>
      !userContext.permissions.includes(permission)
    );
    
    console.log(`Item ${item.label}: Access denied`, {
      requiredPermissions: item.requiredPermissions,
      missingPermissions,
      userPermissions: userContext.permissions.length,
      userRolePriority: userContext.highestRolePriority
    });
    
    return false;
  }



  /**
   * Process href to replace placeholders
   */
  private processHref(href: string, userContext: UserContext): string {
    let processedHref = href;

    // Replace project ID placeholder
    if (userContext.currentProjectId) {
      processedHref = processedHref.replace('{projectId}', userContext.currentProjectId);
    }

    return processedHref;
  }

  /**
   * Get icon component from string name using dynamic resolution
   */
  private getIconComponent(iconName: string): any {
    return resolveIcon(iconName);
  }

  /**
   * Cache management
   */
  private generateUserCacheKey(userContext: UserContext): string {
    return `user:${userContext.userId}:${userContext.profileType}:${userContext.roles.map(r => r.id).sort().join(',')}`;
  }

  private getCachedConfigurations(key: string): AdminSidebarConfiguration[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Simple cache expiration - in a real app you'd store timestamps
    return cached;
  }

  private setCachedConfigurations(key: string, configs: AdminSidebarConfiguration[]): void {
    this.cache.set(key, configs);
    // Clean up cache after duration
    setTimeout(() => this.cache.delete(key), this.CACHE_DURATION);
  }

  /**
   * Clear cache when configurations are updated
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache and notify clients when admin updates configurations
   */
  public notifyConfigurationUpdate(): void {
    this.clearCache();
    sidebarConfigService.invalidateConfigurationCache();
  }
}

export const sidebarDatabaseService = SidebarDatabaseService.getInstance();
