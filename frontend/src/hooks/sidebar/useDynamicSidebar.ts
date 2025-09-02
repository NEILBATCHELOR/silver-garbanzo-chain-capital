// =====================================================
// DYNAMIC SIDEBAR HOOKS
// Hooks for using dynamic sidebar configuration without hardcoded mappings
// Removes requiresProject (P flag) concept
// Date: August 28, 2025
// =====================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { dynamicSidebarService } from '@/services/sidebar/dynamicSidebarService';
import { dynamicSidebarAdminService } from '@/services/sidebar/dynamicSidebarAdminService';
import type { 
  SidebarConfiguration, 
  UserContext, 
  SidebarFilterCriteria,
  SidebarItemAccess
} from '@/types/sidebar';
import type {
  AdminSidebarConfiguration,
  SidebarConfigurationFilter,
  SidebarConfigurationCreateRequest,
  SidebarConfigurationUpdateRequest,
  SidebarConfigurationsListResponse,
  SidebarAdminMetadata
} from '@/types/sidebar/adminTypes';

// =====================================================
// DYNAMIC SIDEBAR CONFIGURATION HOOK
// =====================================================

export interface UseDynamicSidebarConfig {
  configuration: SidebarConfiguration | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for getting dynamic sidebar configuration based on user context
 * Reads from database configurations instead of hardcoded mappings
 */
export const useDynamicSidebarConfig = (
  userContext: UserContext,
  criteria?: Partial<SidebarFilterCriteria>
): UseDynamicSidebarConfig => {
  const [configuration, setConfiguration] = useState<SidebarConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfiguration = useCallback(async () => {
    if (!userContext.userId || userContext.isLoading) {
      setConfiguration(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const config = await dynamicSidebarService.getSidebarConfiguration(userContext, criteria);
      setConfiguration(config);
    } catch (err) {
      console.error('Error fetching dynamic sidebar configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Set empty configuration as fallback
      setConfiguration({
        sections: [],
        profileType: userContext.profileType || undefined,
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, [userContext, criteria]);

  const refresh = useCallback(async () => {
    await fetchConfiguration();
  }, [fetchConfiguration]);

  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration]);

  // Listen for sidebar configuration updates
  useEffect(() => {
    const handleConfigurationUpdate = () => {
      fetchConfiguration();
    };

    window.addEventListener('sidebarConfigurationUpdated', handleConfigurationUpdate);
    return () => {
      window.removeEventListener('sidebarConfigurationUpdated', handleConfigurationUpdate);
    };
  }, [fetchConfiguration]);

  return {
    configuration,
    isLoading,
    error,
    refresh
  };
};

// =====================================================
// DYNAMIC SIDEBAR ITEM ACCESS HOOK
// =====================================================

export interface UseDynamicSidebarItemAccess {
  checkAccess: (itemId: string, sectionId?: string) => SidebarItemAccess;
  isItemVisible: (itemId: string, sectionId?: string) => boolean;
}

/**
 * Hook for checking individual sidebar item access dynamically
 */
export const useDynamicSidebarItemAccess = (
  userContext: UserContext,
  configuration: SidebarConfiguration | null
): UseDynamicSidebarItemAccess => {
  const checkAccess = useCallback((itemId: string, sectionId?: string): SidebarItemAccess => {
    if (!configuration || !userContext.userId) {
      return { isVisible: false, reason: 'No configuration or user context' };
    }

    // Find the item in the configuration
    let targetItem = null;
    for (const section of configuration.sections) {
      if (sectionId && section.id !== sectionId) {
        continue;
      }
      targetItem = section.items.find(item => item.id === itemId);
      if (targetItem) {
        break;
      }
    }

    if (!targetItem) {
      return { isVisible: false, reason: 'Item not found in configuration' };
    }

    // Use the service to check access (without requiresProject)
    return dynamicSidebarService.checkItemAccess(targetItem as any, userContext);
  }, [userContext, configuration]);

  const isItemVisible = useCallback((itemId: string, sectionId?: string): boolean => {
    return checkAccess(itemId, sectionId).isVisible;
  }, [checkAccess]);

  return {
    checkAccess,
    isItemVisible
  };
};

// =====================================================
// ADMIN HOOKS FOR CONFIGURATION MANAGEMENT
// =====================================================

export interface UseDynamicSidebarAdmin {
  configurations: AdminSidebarConfiguration[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  create: (request: SidebarConfigurationCreateRequest) => Promise<AdminSidebarConfiguration>;
  update: (id: string, request: SidebarConfigurationUpdateRequest) => Promise<AdminSidebarConfiguration>;
  delete: (id: string) => Promise<boolean>;
  duplicate: (id: string, newName: string) => Promise<AdminSidebarConfiguration>;
  refresh: () => Promise<void>;
  setFilter: (filter: SidebarConfigurationFilter) => void;
  setPage: (page: number) => void;
}

/**
 * Hook for admin management of dynamic sidebar configurations
 */
export const useDynamicSidebarAdmin = (
  initialFilter?: SidebarConfigurationFilter,
  initialPageSize = 20
): UseDynamicSidebarAdmin => {
  const [configurations, setConfigurations] = useState<AdminSidebarConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [filter, setFilter] = useState<SidebarConfigurationFilter>(initialFilter || {});

  const fetchConfigurations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await dynamicSidebarAdminService.getSidebarConfigurations(
        filter,
        page,
        pageSize
      );

      setConfigurations(response.configurations);
      setTotal(response.total);
    } catch (err) {
      console.error('Error fetching sidebar configurations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [filter, page, pageSize]);

  const create = useCallback(async (request: SidebarConfigurationCreateRequest): Promise<AdminSidebarConfiguration> => {
    const newConfig = await dynamicSidebarAdminService.createSidebarConfiguration(request);
    await fetchConfigurations(); // Refresh list
    dynamicSidebarService.invalidateConfigurationCache(); // Clear cache
    return newConfig;
  }, [fetchConfigurations]);

  const update = useCallback(async (
    id: string, 
    request: SidebarConfigurationUpdateRequest
  ): Promise<AdminSidebarConfiguration> => {
    const updatedConfig = await dynamicSidebarAdminService.updateSidebarConfiguration(id, request);
    await fetchConfigurations(); // Refresh list
    dynamicSidebarService.invalidateConfigurationCache(); // Clear cache
    return updatedConfig;
  }, [fetchConfigurations]);

  const deleteFn = useCallback(async (id: string): Promise<boolean> => {
    const result = await dynamicSidebarAdminService.deleteSidebarConfiguration(id);
    if (result) {
      await fetchConfigurations(); // Refresh list
      dynamicSidebarService.invalidateConfigurationCache(); // Clear cache
    }
    return result;
  }, [fetchConfigurations]);

  const duplicate = useCallback(async (id: string, newName: string): Promise<AdminSidebarConfiguration> => {
    const newConfig = await dynamicSidebarAdminService.duplicateSidebarConfiguration(id, newName);
    await fetchConfigurations(); // Refresh list
    return newConfig;
  }, [fetchConfigurations]);

  const refresh = useCallback(async () => {
    await fetchConfigurations();
  }, [fetchConfigurations]);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  return {
    configurations,
    isLoading,
    error,
    total,
    page,
    pageSize,
    create,
    update,
    delete: deleteFn,
    duplicate,
    refresh,
    setFilter,
    setPage
  };
};

// =====================================================
// ADMIN METADATA HOOK
// =====================================================

export interface UseDynamicSidebarAdminMetadata {
  metadata: SidebarAdminMetadata | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for getting admin metadata (roles, permissions, etc.)
 */
export const useDynamicSidebarAdminMetadata = (): UseDynamicSidebarAdminMetadata => {
  const [metadata, setMetadata] = useState<SidebarAdminMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const meta = await dynamicSidebarAdminService.getAdminMetadata();
      setMetadata(meta);
    } catch (err) {
      console.error('Error fetching admin metadata:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    isLoading,
    error,
    refresh
  };
};

// =====================================================
// SINGLE CONFIGURATION HOOK
// =====================================================

export interface UseDynamicSidebarSingleConfig {
  configuration: AdminSidebarConfiguration | null;
  isLoading: boolean;
  error: string | null;
  update: (request: SidebarConfigurationUpdateRequest) => Promise<AdminSidebarConfiguration>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing a single sidebar configuration
 */
export const useDynamicSidebarSingleConfig = (
  configurationId: string
): UseDynamicSidebarSingleConfig => {
  const [configuration, setConfiguration] = useState<AdminSidebarConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfiguration = useCallback(async () => {
    if (!configurationId) {
      setConfiguration(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const config = await dynamicSidebarAdminService.getSidebarConfiguration(configurationId);
      setConfiguration(config);
    } catch (err) {
      console.error('Error fetching sidebar configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [configurationId]);

  const update = useCallback(async (
    request: SidebarConfigurationUpdateRequest
  ): Promise<AdminSidebarConfiguration> => {
    const updatedConfig = await dynamicSidebarAdminService.updateSidebarConfiguration(
      configurationId, 
      request
    );
    setConfiguration(updatedConfig);
    dynamicSidebarService.invalidateConfigurationCache(); // Clear cache
    return updatedConfig;
  }, [configurationId]);

  const refresh = useCallback(async () => {
    await fetchConfiguration();
  }, [fetchConfiguration]);

  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration]);

  return {
    configuration,
    isLoading,
    error,
    update,
    refresh
  };
};
