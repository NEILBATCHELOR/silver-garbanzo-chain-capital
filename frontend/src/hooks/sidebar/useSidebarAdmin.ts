// =====================================================
// SIDEBAR ADMIN CONFIGURATION HOOKS
// React hooks for managing sidebar configurations
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import { sidebarAdminService } from '@/services/sidebar';
import { sidebarConfigService } from '@/services/sidebar';
import type {
  AdminSidebarConfiguration,
  SidebarConfigurationFilter,
  SidebarConfigurationCreateRequest,
  SidebarConfigurationUpdateRequest,
  SidebarConfigurationsListResponse,
  SidebarAdminMetadata,
  SidebarConfigurationValidation
} from '@/types/sidebar';

// =====================================================
// CONFIGURATION LIST HOOK
// =====================================================

export interface UseSidebarConfigurationsOptions {
  filter?: SidebarConfigurationFilter;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSidebarConfigurationsResult {
  configurations: AdminSidebarConfiguration[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Actions
  loadPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilter: (filter: SidebarConfigurationFilter) => void;
}

export function useSidebarConfigurations(
  options: UseSidebarConfigurationsOptions = {}
): UseSidebarConfigurationsResult {
  const { 
    filter, 
    pageSize = 20, 
    autoRefresh = false, 
    refreshInterval = 30000 
  } = options;

  const [configurations, setConfigurations] = useState<AdminSidebarConfiguration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<SidebarConfigurationFilter | undefined>(filter);

  const loadConfigurations = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await sidebarAdminService.getSidebarConfigurations(
        currentFilter,
        pageNum,
        pageSize
      );

      setConfigurations(response.configurations);
      setTotal(response.total);
      setPage(pageNum);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sidebar configurations';
      setError(errorMessage);
      console.error('Error loading sidebar configurations:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilter, pageSize]);

  const loadPage = useCallback(async (pageNum: number) => {
    await loadConfigurations(pageNum);
  }, [loadConfigurations]);

  const nextPage = useCallback(async () => {
    const maxPage = Math.ceil(total / pageSize);
    if (page < maxPage) {
      await loadConfigurations(page + 1);
    }
  }, [loadConfigurations, page, total, pageSize]);

  const previousPage = useCallback(async () => {
    if (page > 1) {
      await loadConfigurations(page - 1);
    }
  }, [loadConfigurations, page]);

  const refresh = useCallback(async () => {
    await loadConfigurations(page);
  }, [loadConfigurations, page]);

  const setFilter = useCallback((newFilter: SidebarConfigurationFilter) => {
    setCurrentFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Initial load
  useEffect(() => {
    loadConfigurations(1);
  }, [loadConfigurations]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  const hasNextPage = page < Math.ceil(total / pageSize);
  const hasPreviousPage = page > 1;

  return {
    configurations,
    total,
    page,
    pageSize,
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    loadPage,
    nextPage,
    previousPage,
    refresh,
    setFilter
  };
}

// =====================================================
// SINGLE CONFIGURATION HOOK
// =====================================================

export interface UseSidebarConfigurationResult {
  configuration: AdminSidebarConfiguration | null;
  metadata: SidebarAdminMetadata | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  reload: () => Promise<void>;
  create: (request: SidebarConfigurationCreateRequest) => Promise<AdminSidebarConfiguration>;
  update: (request: SidebarConfigurationUpdateRequest) => Promise<AdminSidebarConfiguration>;
  delete: () => Promise<void>;
  validate: (config: SidebarConfigurationCreateRequest | SidebarConfigurationUpdateRequest) => Promise<SidebarConfigurationValidation>;
}

export function useSidebarConfiguration(id?: string): UseSidebarConfigurationResult {
  const [configuration, setConfiguration] = useState<AdminSidebarConfiguration | null>(null);
  const [metadata, setMetadata] = useState<SidebarAdminMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfiguration = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await sidebarAdminService.getSidebarConfiguration(id);
      
      setConfiguration(response.configuration);
      setMetadata({
        permissions: response.permissions,
        roles: response.roles,
        profileTypes: response.profileTypes,
        availableIcons: response.availableIcons
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sidebar configuration';
      setError(errorMessage);
      console.error('Error loading sidebar configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMetadata = useCallback(async () => {
    try {
      const metadataResponse = await sidebarAdminService.getAdminMetadata();
      setMetadata(metadataResponse);
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  }, []);

  const reload = useCallback(async () => {
    await loadConfiguration();
  }, [loadConfiguration]);

  const create = useCallback(async (request: SidebarConfigurationCreateRequest) => {
    try {
      setLoading(true);
      setError(null);

      const newConfiguration = await sidebarAdminService.createSidebarConfiguration(request);
      
      // Invalidate sidebar configuration cache to update all active sidebars
      sidebarConfigService.invalidateConfigurationCache();
      
      setConfiguration(newConfiguration);
      return newConfiguration;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sidebar configuration';
      setError(errorMessage);
      console.error('Error creating sidebar configuration:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (request: SidebarConfigurationUpdateRequest) => {
    if (!id) throw new Error('Configuration ID is required for updates');

    try {
      setLoading(true);
      setError(null);

      const updatedConfiguration = await sidebarAdminService.updateSidebarConfiguration(id, request);
      
      // Invalidate sidebar configuration cache to update all active sidebars
      sidebarConfigService.invalidateConfigurationCache();
      
      setConfiguration(updatedConfiguration);
      return updatedConfiguration;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sidebar configuration';
      setError(errorMessage);
      console.error('Error updating sidebar configuration:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const deleteConfiguration = useCallback(async () => {
    if (!id) throw new Error('Configuration ID is required for deletion');

    try {
      setLoading(true);
      setError(null);

      await sidebarAdminService.deleteSidebarConfiguration(id);
      
      // Invalidate sidebar configuration cache to update all active sidebars
      sidebarConfigService.invalidateConfigurationCache();
      
      setConfiguration(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sidebar configuration';
      setError(errorMessage);
      console.error('Error deleting sidebar configuration:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const validate = useCallback(async (config: SidebarConfigurationCreateRequest | SidebarConfigurationUpdateRequest) => {
    try {
      return await sidebarAdminService.validateConfiguration(config);
    } catch (err) {
      console.error('Error validating configuration:', err);
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }, []);

  // Load configuration on mount if ID is provided
  useEffect(() => {
    if (id) {
      loadConfiguration();
    } else {
      // Load metadata for new configurations
      loadMetadata();
    }
  }, [id, loadConfiguration, loadMetadata]);

  return {
    configuration,
    metadata,
    loading,
    error,
    reload,
    create,
    update,
    delete: deleteConfiguration,
    validate
  };
}

// =====================================================
// ADMIN METADATA HOOK
// =====================================================

export interface UseSidebarAdminMetadataResult {
  metadata: SidebarAdminMetadata | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useSidebarAdminMetadata(): UseSidebarAdminMetadataResult {
  const [metadata, setMetadata] = useState<SidebarAdminMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const metadataResponse = await sidebarAdminService.getAdminMetadata();
      setMetadata(metadataResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load admin metadata';
      setError(errorMessage);
      console.error('Error loading admin metadata:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  return {
    metadata,
    loading,
    error,
    reload
  };
}

// =====================================================
// CONFIGURATION VALIDATION HOOK
// =====================================================

export interface UseConfigurationValidationOptions {
  validateOnChange?: boolean;
  debounceMs?: number;
}

export interface UseConfigurationValidationResult {
  validation: SidebarConfigurationValidation | null;
  validating: boolean;
  validate: (config: SidebarConfigurationCreateRequest | SidebarConfigurationUpdateRequest) => Promise<SidebarConfigurationValidation>;
  clearValidation: () => void;
}

export function useConfigurationValidation(
  options: UseConfigurationValidationOptions = {}
): UseConfigurationValidationResult {
  const { validateOnChange = false, debounceMs = 500 } = options;
  
  const [validation, setValidation] = useState<SidebarConfigurationValidation | null>(null);
  const [validating, setValidating] = useState(false);

  const validate = useCallback(async (config: SidebarConfigurationCreateRequest | SidebarConfigurationUpdateRequest) => {
    try {
      setValidating(true);
      const result = await sidebarAdminService.validateConfiguration(config);
      setValidation(result);
      return result;
    } catch (err) {
      const errorResult: SidebarConfigurationValidation = {
        isValid: false,
        errors: [{ field: 'general', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
      setValidation(errorResult);
      return errorResult;
    } finally {
      setValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidation(null);
  }, []);

  return {
    validation,
    validating,
    validate,
    clearValidation
  };
}
