// =====================================================
// ENHANCED SIDEBAR CONFIG SERVICE
// Handles both hardcoded mappings and database-driven configurations
// Updated: August 28, 2025 - Added icon conversion and admin config support
// =====================================================

import type { 
  SidebarSection, 
  SidebarItem, 
  UserContext, 
  SidebarFilterCriteria,
  SidebarItemAccess,
  SidebarConfiguration
} from '@/types/sidebar';
import type { AdminSidebarConfiguration, AdminSidebarData } from '@/types/sidebar/adminTypes';
import { SIDEBAR_CONFIGURATION } from './sidebarMappings';
import { ADDITIONAL_SIDEBAR_SECTIONS } from './additionalSidebarMappings';
import { getIconByName } from '@/components/ui/icon-picker';
import { Layout } from 'lucide-react'; // Default fallback icon

export class EnhancedSidebarConfigService {
  private static instance: EnhancedSidebarConfigService;
  private cache = new Map<string, SidebarConfiguration>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private adminConfigurations: AdminSidebarConfiguration[] = [];

  public static getInstance(): EnhancedSidebarConfigService {
    if (!EnhancedSidebarConfigService.instance) {
      EnhancedSidebarConfigService.instance = new EnhancedSidebarConfigService();
    }
    return EnhancedSidebarConfigService.instance;
  }

  /**
   * Set admin configurations from database
   */
  public setAdminConfigurations(configurations: AdminSidebarConfiguration[]): void {
    this.adminConfigurations = configurations;
    this.clearCache(); // Clear cache when configurations change
  }

  /**
   * Get sidebar configuration (prioritizing database over hardcoded)
   */
  public getSidebarConfiguration(userContext?: UserContext): {
    sections: SidebarSection[];
    source: 'database' | 'hardcoded';
  } {
    // Try to get configuration from database first
    if (userContext && this.adminConfigurations.length > 0) {
      const dbConfig = this.getConfigurationFromDatabase(userContext);
      if (dbConfig) {
        return {
          sections: this.convertAdminDataToSidebarSections(dbConfig.configurationData),
          source: 'database'
        };
      }
    }

    // Fall back to hardcoded configuration
    return {
      sections: [...SIDEBAR_CONFIGURATION, ...ADDITIONAL_SIDEBAR_SECTIONS],
      source: 'hardcoded'
    };
  }

  /**
   * Get admin configuration from database based on user context
   */
  private getConfigurationFromDatabase(userContext: UserContext): AdminSidebarConfiguration | null {
    // Find the best matching configuration
    const matchingConfigs = this.adminConfigurations.filter(config => {
      // Must be active
      if (!config.isActive) return false;

      // Check profile type
      if (userContext.profileType && config.targetProfileTypeEnums.length > 0) {
        if (!config.targetProfileTypeEnums.includes(userContext.profileType as any)) {
          return false;
        }
      }

      // Check roles
      if (config.targetRoleIds.length > 0) {
        const hasMatchingRole = userContext.roles.some(role => 
          config.targetRoleIds.includes(role.id)
        );
        if (!hasMatchingRole) return false;
      }

      // Check minimum role priority
      if (config.minRolePriority && userContext.highestRolePriority < config.minRolePriority) {
        return false;
      }

      return true;
    });

    // Prioritize default configurations
    const defaultConfig = matchingConfigs.find(config => config.isDefault);
    if (defaultConfig) return defaultConfig;

    // Return the first matching configuration
    return matchingConfigs[0] || null;
  }

  /**
   * Convert admin data to sidebar sections with proper icon handling
   */
  private convertAdminDataToSidebarSections(adminData: AdminSidebarData): SidebarSection[] {
    return adminData.sections.map(adminSection => ({
      id: adminSection.id,
      title: adminSection.title,
      permissions: adminSection.requiredPermissions,
      roles: [], // Convert role IDs to role names if needed
      profileTypes: adminSection.profileTypes,
      minRolePriority: adminSection.minRolePriority,
      items: adminSection.items.map(adminItem => ({
        id: adminItem.id,
        label: adminItem.label,
        href: adminItem.href,
        icon: this.getIconComponent(adminItem.icon),
        permissions: adminItem.requiredPermissions,
        roles: [], // Convert role IDs to role names if needed
        profileTypes: adminItem.profileTypes,
        minRolePriority: adminItem.minRolePriority,
        isVisible: adminItem.isVisible
      })),
      isCollapsible: true,
      defaultExpanded: true
    }));
  }

  /**
   * Convert string icon name to React component
   */
  private getIconComponent(iconName?: string): React.ComponentType<{ className?: string }> {
    if (!iconName) return Layout;
    
    const iconDefinition = getIconByName(iconName);
    return iconDefinition?.component || Layout;
  }

  /**
   * Get filtered sidebar configuration based on user context
   */
  public getFilteredSidebarConfig(
    userContext: UserContext,
    criteria?: Partial<SidebarFilterCriteria>
  ): { config: SidebarConfiguration; source: 'database' | 'hardcoded' } {
    const cacheKey = this.generateCacheKey(userContext, criteria);
    const cached = this.getCachedConfig(cacheKey);
    
    if (cached) {
      return { 
        config: cached.config, 
        source: cached.source 
      };
    }

    const { sections, source } = this.getSidebarConfiguration(userContext);
    const filterCriteria: SidebarFilterCriteria = {
      userContext,
      includeHidden: false,
      contextualFiltering: true,
      ...criteria
    };

    const filteredSections = this.filterSectionsByAccess(sections, filterCriteria);
    
    const config: SidebarConfiguration = {
      sections: filteredSections,
      profileType: userContext.profileType || undefined,
      lastUpdated: new Date().toISOString()
    };

    // Cache with source information
    this.setCachedConfig(cacheKey, { config, source });
    return { config, source };
  }

  /**
   * Filter sections based on user access
   */
  private filterSectionsByAccess(
    sections: SidebarSection[],
    criteria: SidebarFilterCriteria
  ): SidebarSection[] {
    return sections
      .map(section => {
        // Check section-level access
        if (!this.checkSectionAccess(section, criteria.userContext)) {
          return null;
        }

        // Filter items within the section
        const filteredItems = this.filterItemsByAccess(section.items, criteria);
        
        // Only include section if it has accessible items
        if (filteredItems.length === 0) {
          return null;
        }

        return {
          ...section,
          items: filteredItems
        };
      })
      .filter((section): section is SidebarSection => section !== null);
  }

  /**
   * Filter items based on user access
   */
  private filterItemsByAccess(
    items: SidebarItem[],
    criteria: SidebarFilterCriteria
  ): SidebarItem[] {
    const { userContext, contextualFiltering = true } = criteria;

    return items
      .map(item => {
        const access = this.checkItemAccess(item, userContext);
        
        if (!access.isVisible) {
          return null;
        }

        // Apply contextual filtering (e.g., project-specific items)
        let href = item.href;
        if (contextualFiltering && userContext.currentProjectId) {
          href = href.replace('{projectId}', userContext.currentProjectId);
        }

        return {
          ...item,
          href
        };
      })
      .filter((item): item is SidebarItem => item !== null);
  }

  /**
   * Check if user has access to a section
   */
  private checkSectionAccess(section: SidebarSection, userContext: UserContext): boolean {
    // Check role priority
    if (section.minRolePriority && userContext.highestRolePriority < section.minRolePriority) {
      return false;
    }

    // Check specific roles
    if (section.roles && section.roles.length > 0) {
      const hasRequiredRole = userContext.roles.some(userRole =>
        section.roles!.includes(userRole.name)
      );
      if (!hasRequiredRole) {
        return false;
      }
    }

    // Check profile types
    if (section.profileTypes && section.profileTypes.length > 0) {
      if (!userContext.profileType || !section.profileTypes.includes(userContext.profileType)) {
        return false;
      }
    }

    // Check permissions (any of the listed permissions)
    if (section.permissions && section.permissions.length > 0) {
      const hasRequiredPermission = section.permissions.some(permission =>
        userContext.permissions.includes(permission)
      );
      if (!hasRequiredPermission) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if user has access to an item
   */
  public checkItemAccess(item: SidebarItem, userContext: UserContext): SidebarItemAccess {
    const reasons: string[] = [];
    
    // Manual visibility override
    if (item.isVisible === false) {
      return { 
        isVisible: false, 
        reason: 'Manually hidden' 
      };
    }

    if (item.isVisible === true) {
      return { 
        isVisible: true, 
        reason: 'Manually visible' 
      };
    }

    // Check if user is authenticated
    if (!userContext.userId) {
      return { 
        isVisible: false, 
        reason: 'User not authenticated' 
      };
    }

    // Check role priority
    if (item.minRolePriority && userContext.highestRolePriority < item.minRolePriority) {
      reasons.push(`Requires minimum role priority ${item.minRolePriority}`);
    }

    // Check specific roles
    if (item.roles && item.roles.length > 0) {
      const hasRequiredRole = userContext.roles.some(userRole =>
        item.roles!.includes(userRole.name)
      );
      if (!hasRequiredRole) {
        reasons.push(`Requires one of roles: ${item.roles.join(', ')}`);
      }
    }

    // Check profile types
    if (item.profileTypes && item.profileTypes.length > 0) {
      if (!userContext.profileType || !item.profileTypes.includes(userContext.profileType)) {
        reasons.push(`Requires profile type: ${item.profileTypes.join(', ')}`);
      }
    }

    // Check permissions (any of the listed permissions)
    if (item.permissions && item.permissions.length > 0) {
      const hasRequiredPermission = item.permissions.some(permission =>
        userContext.permissions.includes(permission)
      );
      
      if (!hasRequiredPermission) {
        const missingPermissions = item.permissions.filter(permission =>
          !userContext.permissions.includes(permission)
        );
        reasons.push(`Missing permissions: ${missingPermissions.join(', ')}`);
        
        return {
          isVisible: false,
          reason: reasons.join('; '),
          requiredPermissions: item.permissions,
          missingPermissions
        };
      }
    }

    if (reasons.length > 0) {
      return { 
        isVisible: false, 
        reason: reasons.join('; ') 
      };
    }

    return { isVisible: true };
  }

  /**
   * Generate cache key for user context
   */
  private generateCacheKey(
    userContext: UserContext, 
    criteria?: Partial<SidebarFilterCriteria>
  ): string {
    const keyParts = [
      userContext.userId,
      userContext.profileType,
      userContext.currentProjectId,
      userContext.roles.map(r => r.id).sort().join(','),
      userContext.permissions.sort().join(','),
      criteria?.includeHidden ? 'hidden' : 'visible',
      criteria?.contextualFiltering ? 'contextual' : 'static',
      `adminConfigs:${this.adminConfigurations.length}` // Invalidate when admin configs change
    ];
    return keyParts.filter(Boolean).join('|');
  }

  /**
   * Get cached configuration with source information
   */
  private getCachedConfig(key: string): { config: SidebarConfiguration; source: 'database' | 'hardcoded' } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const lastUpdated = new Date(cached.lastUpdated!).getTime();
    const now = Date.now();
    
    if (now - lastUpdated > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    // For cached entries, assume database source if admin configs exist
    const source = this.adminConfigurations.length > 0 ? 'database' : 'hardcoded';
    return { config: cached, source };
  }

  /**
   * Cache configuration
   */
  private setCachedConfig(key: string, data: { config: SidebarConfiguration; source: 'database' | 'hardcoded' }): void {
    this.cache.set(key, data.config);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for specific user context
   */
  public invalidateUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => key.startsWith(userId));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all cache when configurations are updated
   * Called when admin saves/updates sidebar configurations
   */
  public invalidateConfigurationCache(): void {
    this.cache.clear();
    // Emit event for live sidebar updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebarConfigurationUpdated'));
    }
  }
}

// Export singleton instance
export const enhancedSidebarConfigService = EnhancedSidebarConfigService.getInstance();
