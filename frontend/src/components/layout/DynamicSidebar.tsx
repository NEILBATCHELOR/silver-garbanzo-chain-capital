import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/infrastructure/database/client";
import { sessionManager } from "@/infrastructure/sessionManager";
import { Loader2, LogOut, AlertCircle, Database, FileText, RefreshCw, Home, User, ChevronRight } from "lucide-react";
import { useSidebarConfig } from "@/hooks/sidebar";
import type { SidebarItem as SidebarItemType, SidebarSection } from "@/types/sidebar";
import { substituteUrlParameters, type UrlParameters } from "@/utils/sidebar";

interface SidebarItemProps {
  item: SidebarItemType;
  urlParameters: UrlParameters;
  itemRef?: React.RefObject<HTMLAnchorElement>;
}

interface UserDisplayProps {
  userInfo: { name: string; email: string } | null;
  isLoading: boolean;
}

interface UserInfo {
  name: string;
  email: string;
}

// LocalStorage key for persisting collapsed state
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsedSections';

// Fallback sidebar configuration when database config fails
const FALLBACK_SIDEBAR: SidebarSection[] = [
  {
    id: 'core',
    title: 'Core',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home
      },
      {
        id: 'profile',
        label: 'My Profile',
        href: '/profile',
        icon: User
      }
    ]
  }
];

const SidebarItem = ({ item, urlParameters, itemRef }: SidebarItemProps) => {
  const location = useLocation();
  
  // Apply URL parameter substitution to the item's href
  const processedHref = useMemo(() => {
    return substituteUrlParameters(item.href, urlParameters, 'fallback-route');
  }, [item.href, urlParameters]);
  
  // Don't render the item if URL substitution failed
  if (!processedHref) {
    return null;
  }
  
  // Check if the current path matches the processed item href
  const isActive = () => {
    const currentPath = location.pathname;
    const itemPath = processedHref;
    
    // Exact match
    if (currentPath === itemPath) return true;
    
    // For non-root paths, check if current path starts with item path
    if (itemPath !== "/" && currentPath.startsWith(itemPath + "/")) return true;
    
    // Handle dynamic project URLs
    const projectIdPattern = /\/projects\/[a-zA-Z0-9-]+/g;
    if (item.href.includes('{projectId}')) {
      const normalizedItemPath = itemPath.replace(projectIdPattern, '/projects/[PROJECT_ID]');
      const normalizedCurrentPath = currentPath.replace(projectIdPattern, '/projects/[PROJECT_ID]');
      return normalizedCurrentPath.startsWith(normalizedItemPath);
    }
    
    return false;
  };

  const active = isActive();

  return (
    <Link
      ref={itemRef}
      to={processedHref}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary/10",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground",
      )}
    >
      <item.icon className="h-4 w-4" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
};

const UserDisplay = ({ userInfo, isLoading }: UserDisplayProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-semibold text-primary">?</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Guest User</p>
          <p className="text-xs text-muted-foreground">Not signed in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-lg font-semibold text-primary">
          {userInfo.name?.charAt(0) || '?'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{userInfo.name}</p>
        <p className="truncate text-xs text-muted-foreground">{userInfo.email}</p>
        
        {/* Moved admin notice here - subtle and contextual */}
        <div className="flex items-center gap-1 mt-1">
        </div>
      </div>
    </div>
  );
};

const DynamicSidebar = React.memo(() => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Refs for active item scrolling
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  
  // Get URL parameters for substitution
  const urlParams = useParams();
  const location = useLocation();
  
  // Convert URL params to our UrlParameters interface
  const urlParameters: UrlParameters = useMemo(() => ({
    projectId: urlParams.projectId,
    organizationId: urlParams.organizationId,
    tokenId: urlParams.tokenId,
    investorId: urlParams.investorId,
    userId: urlParams.userId,
    templateId: urlParams.templateId,
    requestId: urlParams.requestId,
    walletId: urlParams.walletId,
    ...urlParams // Include any other parameters
  }), [urlParams]);
  
  // Memoize sidebar config options to prevent unnecessary recalculations
  const sidebarConfigOptions = useMemo(() => ({
    contextualFiltering: true,
    autoRefresh: false,
    useDatabase: true // Enable database integration
  }), []);
  
  const { 
    sidebarConfig, 
    isLoading: isSidebarLoading, 
    error: sidebarError,
    refreshConfig,
    userContext,
    configurationSource
  } = useSidebarConfig(sidebarConfigOptions);

  // Load collapsed sections from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCollapsedSections(new Set(parsed));
      } else {
        // Default: all sections collapsed
        if (sidebarConfig?.sections) {
          setCollapsedSections(new Set(sidebarConfig.sections.map(s => s.id)));
        }
      }
    } catch (error) {
      console.error('[❌ Sidebar] Error loading collapsed state:', error);
    }
  }, [sidebarConfig]);

  // Save collapsed sections to localStorage
  const saveCollapsedState = useCallback((newCollapsedSet: Set<string>) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(Array.from(newCollapsedSet)));
    } catch (error) {
      console.error('[❌ Sidebar] Error saving collapsed state:', error);
    }
  }, []);

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      saveCollapsedState(newSet);
      return newSet;
    });
  }, [saveCollapsedState]);

  // Find which section contains the active route
  const findActiveSectionId = useCallback((sections: SidebarSection[]): string | null => {
    const currentPath = location.pathname;
    
    for (const section of sections) {
      for (const item of section.items) {
        const processedHref = substituteUrlParameters(item.href, urlParameters, 'fallback-route');
        if (!processedHref) continue;
        
        // Check for exact match
        if (currentPath === processedHref) {
          return section.id;
        }
        
        // Check for prefix match
        if (processedHref !== "/" && currentPath.startsWith(processedHref + "/")) {
          return section.id;
        }
        
        // Handle dynamic URLs
        const projectIdPattern = /\/projects\/[a-zA-Z0-9-]+/g;
        if (item.href.includes('{projectId}')) {
          const normalizedItemPath = processedHref.replace(projectIdPattern, '/projects/[PROJECT_ID]');
          const normalizedCurrentPath = currentPath.replace(projectIdPattern, '/projects/[PROJECT_ID]');
          if (normalizedCurrentPath.startsWith(normalizedItemPath)) {
            return section.id;
          }
        }
      }
    }
    
    return null;
  }, [location.pathname, urlParameters]);

  // Auto-expand section containing active route
  useEffect(() => {
    if (isSidebarLoading || !sidebarConfig?.sections) return;
    
    const activeSectionId = findActiveSectionId(sidebarConfig.sections);
    
    if (activeSectionId && collapsedSections.has(activeSectionId)) {
      // Auto-expand the section containing the active item
      setCollapsedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(activeSectionId);
        saveCollapsedState(newSet);
        return newSet;
      });
    }
  }, [location.pathname, sidebarConfig, isSidebarLoading, findActiveSectionId, saveCollapsedState, collapsedSections]);

  // Auto-scroll to active item - runs after section expansion
  useEffect(() => {
    if (isSidebarLoading || !sidebarConfig?.sections) return;
    
    const activeSectionId = findActiveSectionId(sidebarConfig.sections);
    
    // Only scroll if the section is expanded (not collapsed)
    if (activeSectionId && !collapsedSections.has(activeSectionId)) {
      // Wait for DOM to fully settle after expansion
      const scrollTimer = setTimeout(() => {
        if (activeItemRef.current && scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            const itemTop = activeItemRef.current.offsetTop;
            const itemHeight = activeItemRef.current.offsetHeight;
            const containerHeight = scrollContainer.clientHeight;
            const scrollTop = scrollContainer.scrollTop;
            
            // Check if item is outside visible area
            const isAboveView = itemTop < scrollTop;
            const isBelowView = (itemTop + itemHeight) > (scrollTop + containerHeight);
            
            if (isAboveView || isBelowView) {
              // Scroll to center the item in view
              const scrollPosition = itemTop - (containerHeight / 2) + (itemHeight / 2);
              scrollContainer.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
              });
            }
          }
        }
      }, 300); // Increased delay to ensure DOM has settled
      
      return () => clearTimeout(scrollTimer);
    }
  }, [location.pathname, collapsedSections, sidebarConfig, isSidebarLoading, findActiveSectionId]);

  // Diagnostic logging for sidebar state
  useEffect(() => {
    const debugSidebarState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('[🔍 Sidebar Debug] Full State:', {
        authentication: {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        },
        routing: {
          pathname: window.location.pathname,
          urlParams: urlParameters,
        },
        sidebarState: {
          isLoading: isSidebarLoading,
          hasError: !!sidebarError,
          error: sidebarError,
          configSource: configurationSource,
          hasSidebarConfig: !!sidebarConfig,
          sectionsCount: sidebarConfig?.sections.length || 0,
          totalItems: sidebarConfig?.sections.reduce((sum, s) => sum + s.items.length, 0) || 0,
          collapsedCount: collapsedSections.size,
        },
        userContext: {
          profileType: userContext.profileType,
          rolesCount: userContext.roles.length,
          roles: userContext.roles.map(r => r.name),
          highestPriority: userContext.highestRolePriority,
        },
        userDisplay: {
          hasUserInfo: !!userInfo,
          isLoadingUserInfo: isLoadingUserInfo,
        }
      });
      
      // Additional debug info if no sidebar items (only in development)
      if (import.meta.env.DEV && !isSidebarLoading && 
          (!sidebarConfig?.sections || sidebarConfig.sections.length === 0)) {
        console.log('[ℹ️  Sidebar Debug] No navigation items available', {
          userContext: {
            userId: userContext.userId,
            profileType: userContext.profileType,
            roles: userContext.roles.map(r => r.name),
            highestPriority: userContext.highestRolePriority
          },
          possibleReasons: [
            'User has no roles assigned',
            'Sidebar config not found in database',
            'All items filtered out by permissions',
            'URL parameters preventing item display'
          ],
          solution: 'Check user roles in database or use fallback navigation'
        });
      }
    };
    
    debugSidebarState();
  }, [isSidebarLoading, sidebarConfig, sidebarError, configurationSource, userContext, userInfo, isLoadingUserInfo, urlParameters, collapsedSections]);

  // Process sidebar sections with URL parameter substitution
  const processedSidebarConfig = useMemo(() => {
    if (!sidebarConfig) return null;
    
    const processedSections: SidebarSection[] = sidebarConfig.sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        // Note: href will be processed in SidebarItem component
      })).filter(item => {
        // Pre-filter items that would have invalid URLs after substitution
        const processedHref = substituteUrlParameters(item.href, urlParameters, 'fallback-route');
        return processedHref !== null;
      })
    })).filter(section => section.items.length > 0); // Remove empty sections
    
    return {
      ...sidebarConfig,
      sections: processedSections
    };
  }, [sidebarConfig, urlParameters]);

  // Listen for sidebar configuration updates (from admin changes)
  useEffect(() => {
    const handleConfigurationUpdate = () => {
      console.log('[🔄 Sidebar] Configuration updated from admin, refreshing...');
      refreshConfig();
    };

    // Listen for configuration update events
    window.addEventListener('sidebarConfigurationUpdated', handleConfigurationUpdate);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('sidebarConfigurationUpdated', handleConfigurationUpdate);
    };
  }, [refreshConfig]);

  // Fetch user display information
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('[👤 Sidebar] No active session, showing guest user');
          setIsLoadingUserInfo(false);
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('[❌ Sidebar] Error fetching user info:', error);
          setIsLoadingUserInfo(false);
          return;
        }

        if (userData) {
          console.log('[✅ Sidebar] User info loaded:', userData.name);
          setUserInfo({
            name: userData.name,
            email: userData.email
          });
          
          // GUARD: Check if user has any roles assigned
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_organization_roles')
            .select('role_id')
            .eq('user_id', session.user.id)
            .limit(1);

          if (!rolesError && userRoles && userRoles.length === 0) {
            console.warn('[🚨 Sidebar] User has NO roles assigned!', {
              userId: session.user.id,
              email: session.user.email,
              action: 'Contact administrator to assign appropriate role'
            });
          }
        }
      } catch (error) {
        console.error('[❌ Sidebar] Error in fetchUserInfo:', error);
      } finally {
        setIsLoadingUserInfo(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      console.log('[🚪 Sidebar] Logging out...');
      // Clear local storage
      localStorage.clear();
      // Clear session storage
      sessionStorage.clear();
      // Clear Supabase session
      await supabase.auth.signOut();
      // Clear session in database
      await sessionManager.clearAllSessions();
      // Redirect to welcome screen
      window.location.href = '/';
    } catch (error) {
      console.error('[❌ Sidebar] Error during logout:', error);
      // Force redirect even if there's an error
      window.location.href = '/';
    }
  }, []);

  // Determine sections to display - use fallback if error and no config
  const displaySections = useMemo(() => {
    if (processedSidebarConfig?.sections && processedSidebarConfig.sections.length > 0) {
      return processedSidebarConfig.sections;
    }
    
    // Use fallback if there's an error or no sections after loading
    if (!isSidebarLoading && (sidebarError || !sidebarConfig?.sections?.length)) {
      console.log('[🔄 Sidebar] Using fallback navigation');
      return FALLBACK_SIDEBAR;
    }
    
    return [];
  }, [processedSidebarConfig, isSidebarLoading, sidebarError, sidebarConfig]);

  // Determine if we should show the admin configured indicator
  const showAdminConfigured = !isSidebarLoading && configurationSource === 'database';

  // Check if item is active
  const isItemActive = useCallback((item: SidebarItemType): boolean => {
    const currentPath = location.pathname;
    const processedHref = substituteUrlParameters(item.href, urlParameters, 'fallback-route');
    
    if (!processedHref) return false;
    
    // Exact match
    if (currentPath === processedHref) return true;
    
    // Prefix match
    if (processedHref !== "/" && currentPath.startsWith(processedHref + "/")) return true;
    
    // Dynamic URLs
    const projectIdPattern = /\/projects\/[a-zA-Z0-9-]+/g;
    if (item.href.includes('{projectId}')) {
      const normalizedItemPath = processedHref.replace(projectIdPattern, '/projects/[PROJECT_ID]');
      const normalizedCurrentPath = currentPath.replace(projectIdPattern, '/projects/[PROJECT_ID]');
      return normalizedCurrentPath.startsWith(normalizedItemPath);
    }
    
    return false;
  }, [location.pathname, urlParameters]);

  // Show error state
  if (sidebarError && !isSidebarLoading) {
    console.error('[❌ Sidebar] Rendering error state:', sidebarError);
    
    return (
      <div className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
        <div className="flex h-full flex-col">
          <div className="p-6">
            <h2 className="text-xl font-bold">Chain Capital</h2>
            <p className="text-xs text-muted-foreground">Tokenization Platform</p>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Failed to load navigation
              </p>
              <p className="text-xs text-red-600 mb-4">
                {sidebarError}
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshConfig}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="p-6">
          <h2 className="text-xl font-bold">Chain Capital</h2>
          <p className="text-xs text-muted-foreground">Tokenization Platform</p>
        </div>

        {/* Navigation */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          {isSidebarLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Loading navigation...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              {displaySections.map((section) => {
                const isCollapsed = collapsedSections.has(section.id);
                const hasActiveItem = section.items.some(item => isItemActive(item));
                
                return (
                  <div key={section.id}>
                    {/* Collapsible Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={cn(
                        "w-full flex items-center justify-between mb-2 px-3 text-xs font-semibold transition-colors rounded-lg py-1.5",
                        "hover:bg-primary/5",
                        hasActiveItem ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <span>{section.title}</span>
                      <ChevronRight 
                        className={cn(
                          "h-3 w-3 transition-transform duration-200",
                          !isCollapsed && "rotate-90"
                        )} 
                      />
                    </button>
                    
                    {/* Section Items - Conditionally rendered */}
                    {!isCollapsed && (
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const isActive = isItemActive(item);
                          return (
                            <SidebarItem 
                              key={item.id} 
                              item={item} 
                              urlParameters={urlParameters}
                              itemRef={isActive ? activeItemRef : undefined}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show message if no sections are available after loading */}
              {!isSidebarLoading && displaySections.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    No navigation items available
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    {urlParameters.projectId && (
                      <p>Project: {urlParameters.projectId}</p>
                    )}
                    {userContext.profileType && (
                      <p>Profile: {userContext.profileType}</p>
                    )}
                    {userContext.roles.length > 0 && (
                      <p>Roles: {userContext.roles.map(r => r.name).join(', ')}</p>
                    )}
                    <p>Priority: {userContext.highestRolePriority}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshConfig}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* User Info */}
        <div className="border-t p-4">
          <UserDisplay 
            userInfo={userInfo} 
            isLoading={isLoadingUserInfo}
          />
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
});

DynamicSidebar.displayName = 'DynamicSidebar';

export default DynamicSidebar;
