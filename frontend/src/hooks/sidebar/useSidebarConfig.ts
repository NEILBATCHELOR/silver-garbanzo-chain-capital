import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUserContext } from '@/hooks/auth/useUserContext';
import { sidebarDatabaseService } from '@/services/sidebar/sidebarDatabaseService';
import type { 
  SidebarConfiguration, 
  UserContext 
} from '@/types/sidebar';

interface UseSidebarConfigOptions {
  includeHidden?: boolean;
  contextualFiltering?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  useDatabase?: boolean;
}

interface UseSidebarConfigReturn {
  sidebarConfig: SidebarConfiguration | null;
  isLoading: boolean;
  error: string | null;
  refreshConfig: () => void;
  hasAccess: (itemId: string) => boolean;
  userContext: UserContext;
  configurationSource: 'database' | 'hardcoded';
}

export function useSidebarConfig(options: UseSidebarConfigOptions = {}): UseSidebarConfigReturn {
  const {
    includeHidden = false,
    contextualFiltering = true,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    useDatabase = true
  } = options;

  const userContextData = useUserContext();
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configurationSource, setConfigurationSource] = useState<'database' | 'hardcoded'>('hardcoded');
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const isLoading = userContextData.isLoading || isLoadingConfig;

  // Load sidebar configuration using the database service
  const loadConfiguration = useCallback(async () => {
    if (userContextData.isLoading || !userContextData.userId) {
      return;
    }

    setIsLoadingConfig(true);
    setError(null);

    try {
      console.log('Loading sidebar configuration for user:', {
        userId: userContextData.userId,
        profileType: userContextData.profileType,
        roles: userContextData.roles.map(r => r.name),
        permissions: userContextData.permissions.length,
        rolePriority: userContextData.highestRolePriority
      });

      // Use the database service which handles both database and fallback configurations
      const config = await sidebarDatabaseService.getSidebarConfigurationForUser(userContextData);

      setSidebarConfig(config);
      
      // Determine source based on whether configuration came from database
      const source = config.sections.some(section => 
        section.id.includes('section-') // Database sections have timestamp-based IDs
      ) ? 'database' : 'hardcoded';
      
      setConfigurationSource(source);
      
      // Log configuration details for debugging
      console.log(`Sidebar configuration loaded from: ${source}`, {
        sectionsCount: config.sections.length,
        sections: config.sections.map(s => ({
          title: s.title,
          itemsCount: s.items.length,
          items: s.items.map(i => i.label)
        })),
        lastUpdated: config.lastUpdated
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sidebar configuration';
      setError(errorMessage);
      console.error('Error loading sidebar configuration:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [
    userContextData.isLoading,
    userContextData.userId,
    userContextData.roles,
    userContextData.permissions,
    userContextData.profileType,
    userContextData.organizationRoles,
    userContextData.highestRolePriority,
    userContextData.currentProjectId
  ]);

  // Load configuration when dependencies change
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Auto-refresh configuration
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      refreshConfig();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Listen for sidebar configuration updates (from admin changes)
  useEffect(() => {
    const handleConfigurationUpdate = () => {
      console.log('Sidebar configuration updated from admin, refreshing...');
      loadConfiguration();
    };

    window.addEventListener('sidebarConfigurationUpdated', handleConfigurationUpdate);
    
    return () => {
      window.removeEventListener('sidebarConfigurationUpdated', handleConfigurationUpdate);
    };
  }, [loadConfiguration]);

  // Refresh configuration (memoized to prevent unnecessary re-creations)
  const refreshConfig = useCallback(() => {
    console.log('Refreshing sidebar configuration...');
    sidebarDatabaseService.clearCache();
    userContextData.refreshUserContext();
    loadConfiguration();
  }, [userContextData.refreshUserContext, loadConfiguration]);

  // Check if user has access to specific item (memoized for performance)
  const hasAccess = useCallback((itemId: string): boolean => {
    if (!sidebarConfig || isLoading) {
      return false;
    }

    for (const section of sidebarConfig.sections) {
      const item = section.items.find(item => item.id === itemId);
      if (item) {
        // Simple visibility check based on item being present in filtered configuration
        return true;
      }
    }

    return false;
  }, [sidebarConfig, isLoading]);

  return {
    sidebarConfig,
    isLoading,
    error: error || userContextData.error,
    refreshConfig,
    hasAccess,
    userContext: userContextData,
    configurationSource
  };
}