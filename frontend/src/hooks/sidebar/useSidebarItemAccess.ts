import { useMemo } from 'react';
import { useUserContext } from '@/hooks/auth/useUserContext';
import { sidebarConfigService } from '@/services/sidebar';
import type { SidebarItem, SidebarItemAccess } from '@/types/sidebar';

interface UseSidebarItemAccessOptions {
  item: SidebarItem;
  enableCaching?: boolean;
}

interface UseSidebarItemAccessReturn {
  access: SidebarItemAccess;
  isVisible: boolean;
  reason?: string;
  isLoading: boolean;
  requiredPermissions?: string[];
  missingPermissions?: string[];
}

export function useSidebarItemAccess({ 
  item, 
  enableCaching = true 
}: UseSidebarItemAccessOptions): UseSidebarItemAccessReturn {
  const userContext = useUserContext();

  const access = useMemo((): SidebarItemAccess => {
    if (userContext.isLoading) {
      return { isVisible: false, reason: 'Loading user context...' };
    }

    if (!userContext.userId) {
      return { isVisible: false, reason: 'User not authenticated' };
    }

    return sidebarConfigService.checkItemAccess(item, userContext);
  }, [
    item, 
    userContext,
    enableCaching // This will force re-computation if caching is disabled
  ]);

  return {
    access,
    isVisible: access.isVisible,
    reason: access.reason,
    isLoading: userContext.isLoading,
    requiredPermissions: access.requiredPermissions,
    missingPermissions: access.missingPermissions
  };
}

/**
 * Simplified hook for just checking if an item is visible
 */
export function useSidebarItemVisible(item: SidebarItem): boolean {
  const { isVisible, isLoading } = useSidebarItemAccess({ item });
  
  // Default to not visible if loading
  return !isLoading && isVisible;
}

/**
 * Hook for checking multiple items at once
 */
export function useSidebarItemsAccess(items: SidebarItem[]): Record<string, SidebarItemAccess> {
  const userContext = useUserContext();

  return useMemo(() => {
    if (userContext.isLoading || !userContext.userId) {
      const defaultAccess: SidebarItemAccess = { 
        isVisible: false, 
        reason: userContext.isLoading ? 'Loading...' : 'Not authenticated' 
      };
      
      return items.reduce((acc, item) => {
        acc[item.id] = defaultAccess;
        return acc;
      }, {} as Record<string, SidebarItemAccess>);
    }

    return items.reduce((acc, item) => {
      acc[item.id] = sidebarConfigService.checkItemAccess(item, userContext);
      return acc;
    }, {} as Record<string, SidebarItemAccess>);
  }, [items, userContext]);
}