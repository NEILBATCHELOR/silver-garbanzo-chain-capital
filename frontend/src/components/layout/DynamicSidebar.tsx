import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/infrastructure/database/client";
import { sessionManager } from "@/infrastructure/sessionManager";
import { Loader2, LogOut, AlertCircle, Database, FileText, RefreshCw } from "lucide-react";
import { useSidebarConfig } from "@/hooks/sidebar";
import type { SidebarItem as SidebarItemType, SidebarSection } from "@/types/sidebar";
import { substituteUrlParameters, type UrlParameters } from "@/utils/sidebar";

interface SidebarItemProps {
  item: SidebarItemType;
  urlParameters: UrlParameters;
}

interface UserDisplayProps {
  userInfo: { name: string; email: string } | null;
  isLoading: boolean;
}

interface UserInfo {
  name: string;
  email: string;
}

const SidebarItem = ({ item, urlParameters }: SidebarItemProps) => {
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

  return (
    <Link
      to={processedHref}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary/10",
        isActive()
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
  
  // Get URL parameters for substitution
  const urlParams = useParams();
  
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
      console.log('Sidebar configuration updated from admin, refreshing...');
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
          setIsLoadingUserInfo(false);
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user info:', error);
          setIsLoadingUserInfo(false);
          return;
        }

        if (userData) {
          setUserInfo({
            name: userData.name,
            email: userData.email
          });
        }
      } catch (error) {
        console.error('Error in fetchUserInfo:', error);
      } finally {
        setIsLoadingUserInfo(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
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
      console.error('Error during logout:', error);
      // Force redirect even if there's an error
      window.location.href = '/';
    }
  }, []);

  // Determine if we should show the admin configured indicator
  const showAdminConfigured = !isSidebarLoading && configurationSource === 'database';

  // Show error state
  if (sidebarError && !isSidebarLoading) {
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

        {/* Navigation - Added top padding for spacing */}
        <ScrollArea className="flex-1 px-4">
          {isSidebarLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Loading navigation...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-4"> {/* Added pt-4 for top spacing */}
              {processedSidebarConfig?.sections.map((section) => (
                <div key={section.id}>
                  <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <SidebarItem 
                        key={item.id} 
                        item={item} 
                        urlParameters={urlParameters}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Show message if no sections are available */}
              {(!processedSidebarConfig?.sections || processedSidebarConfig.sections.length === 0) && (
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
