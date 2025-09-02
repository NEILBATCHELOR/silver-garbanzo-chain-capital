import type { 
  SidebarSection, 
  SidebarItem, 
  UserContext, 
  SidebarFilterCriteria,
  SidebarItemAccess,
  SidebarConfiguration
} from '@/types/sidebar';
import { SIDEBAR_CONFIGURATION } from './sidebarMappings';
import { ADDITIONAL_SIDEBAR_SECTIONS } from './additionalSidebarMappings';

export class SidebarConfigService {
  private static instance: SidebarConfigService;
  private cache = new Map<string, SidebarConfiguration>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): SidebarConfigService {
    if (!SidebarConfigService.instance) {
      SidebarConfigService.instance = new SidebarConfigService();
    }
    return SidebarConfigService.instance;
  }

  /**
   * Get complete sidebar configuration
   */
  public getSidebarConfiguration(): SidebarSection[] {
    return [...SIDEBAR_CONFIGURATION, ...ADDITIONAL_SIDEBAR_SECTIONS];
  }

  /**
   * Get filtered sidebar configuration based on user context
   */
  public getFilteredSidebarConfig(
    userContext: UserContext,
    criteria?: Partial<SidebarFilterCriteria>
  ): SidebarConfiguration {
    const cacheKey = this.generateCacheKey(userContext, criteria);
    const cached = this.getCachedConfig(cacheKey);
    
    if (cached) {
      return cached;
    }

    const allSections = this.getSidebarConfiguration();
    const filterCriteria: SidebarFilterCriteria = {
      userContext,
      includeHidden: false,
      contextualFiltering: true,
      ...criteria
    };

    const filteredSections = this.filterSectionsByAccess(allSections, filterCriteria);
    
    const config: SidebarConfiguration = {
      sections: filteredSections,
      profileType: userContext.profileType || undefined,
      lastUpdated: new Date().toISOString()
    };

    this.setCachedConfig(cacheKey, config);
    return config;
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
   * Check if user has access to an item (without requiresProject concept)
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
      criteria?.contextualFiltering ? 'contextual' : 'static'
    ];
    return keyParts.filter(Boolean).join('|');
  }

  /**
   * Get cached configuration
   */
  private getCachedConfig(key: string): SidebarConfiguration | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const lastUpdated = new Date(cached.lastUpdated!).getTime();
    const now = Date.now();
    
    if (now - lastUpdated > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Cache configuration
   */
  private setCachedConfig(key: string, config: SidebarConfiguration): void {
    this.cache.set(key, config);
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
export const sidebarConfigService = SidebarConfigService.getInstance();