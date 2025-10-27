import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/infrastructure/database/client';
import { useAuth } from '@/infrastructure/auth/AuthProvider';

export interface OrganizationContextData {
  id: string;
  name: string;
  legalName: string | null;
  status: string | null;
}

interface OrganizationContextValue {
  // Current organization state
  selectedOrganization: OrganizationContextData | null;
  setSelectedOrganization: (org: OrganizationContextData | null) => void;
  
  // User's accessible organizations
  userOrganizations: OrganizationContextData[];
  isLoading: boolean;
  
  // UI control
  shouldShowSelector: boolean; // true if user has >1 organization
  
  // Helper methods
  refreshUserOrganizations: () => Promise<void>;
  getFilteredProjects: (allProjects: any[]) => any[];
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth(); // Get user from AuthContext
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationContextData | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationContextData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ref to prevent concurrent loads
  const loadingRef = useRef(false);

  // Load user's accessible organizations - memoized to prevent infinite loops
  const refreshUserOrganizations = useCallback(async () => {
    // Guard: Prevent concurrent executions
    if (loadingRef.current) {
      console.log('🏢 OrganizationProvider: Load already in progress, skipping...');
      return;
    }
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      console.log('🏢 OrganizationProvider: Starting to load user organizations...');
      
      // Wait for auth to complete
      if (authLoading) {
        console.log('🏢 OrganizationProvider: Auth still loading, waiting...');
        setIsLoading(false);
        return;
      }
      
      // Get user from AuthContext (no auth state change triggered)
      if (!user) {
        console.log('🏢 OrganizationProvider: No authenticated user found');
        setUserOrganizations([]);
        setSelectedOrganization(null);
        setIsLoading(false);
        return;
      }

      console.log('🏢 OrganizationProvider: User authenticated, ID:', user.id);

      // Get user's organization assignments
      const { data: allUserOrgRoles, error: userOrgError } = await supabase
        .from('user_organization_roles')
        .select(`
          organization_id,
          organizations!inner (
            id,
            name,
            legal_name,
            status
          )
        `)
        .eq('user_id', user.id);

      if (userOrgError) {
        console.error('🏢 OrganizationProvider: Error fetching user organizations:', userOrgError);
        setUserOrganizations([]);
        return;
      }

      console.log('🏢 OrganizationProvider: Raw user org roles data:', allUserOrgRoles);

      // Get organizations that have active projects
      const orgIds = allUserOrgRoles?.map(role => (role as any).organizations.id) || [];
      
      if (orgIds.length === 0) {
        console.log('🏢 OrganizationProvider: No organization IDs found');
        setUserOrganizations([]);
        setSelectedOrganization(null);
        return;
      }

      const { data: orgsWithProjects, error: projectsError } = await supabase
        .from('project_organization_assignments')
        .select(`
          organization_id,
          organizations!inner (
            id,
            name,
            legal_name,
            status
          )
        `)
        .in('organization_id', orgIds)
        .eq('is_active', true);

      if (projectsError) {
        console.error('🏢 OrganizationProvider: Error fetching organizations with projects:', projectsError);
        // Fallback to all user organizations if project query fails
        const organizations = allUserOrgRoles
          ?.map(role => ({
            id: (role as any).organizations.id,
            name: (role as any).organizations.name,
            legalName: (role as any).organizations.legal_name,
            status: (role as any).organizations.status,
          }))
          .filter((org, index, self) => 
            index === self.findIndex(o => o.id === org.id)
          ) || [];
        setUserOrganizations(organizations);
        if (organizations.length > 0) {
          setSelectedOrganization(organizations[0]);
        }
        return;
      }

      // Get project counts for each organization to prioritize default selection
      const orgProjectCounts = new Map<string, number>();
      orgsWithProjects?.forEach(assignment => {
        const orgId = (assignment as any).organizations.id;
        orgProjectCounts.set(orgId, (orgProjectCounts.get(orgId) || 0) + 1);
      });

      // Extract unique organizations that have projects, sorted by project count
      const organizations = orgsWithProjects
        ?.map(assignment => ({
          id: (assignment as any).organizations.id,
          name: (assignment as any).organizations.name,
          legalName: (assignment as any).organizations.legal_name,
          status: (assignment as any).organizations.status,
          projectCount: orgProjectCounts.get((assignment as any).organizations.id) || 0,
        }))
        .filter((org, index, self) => 
          index === self.findIndex(o => o.id === org.id)
        )
        .sort((a, b) => b.projectCount - a.projectCount) // Sort by project count, descending
        || [];

      console.log('🏢 OrganizationProvider: Organizations with projects (sorted by project count):', organizations);
      setUserOrganizations(organizations.map(org => ({
        id: org.id,
        name: org.name,
        legalName: org.legalName,
        status: org.status,
      })));

      // Auto-select organization with most projects
      if (organizations.length > 0) {
        const defaultOrg = organizations[0]; // Already sorted by project count
        console.log(`🏢 OrganizationProvider: Auto-selecting organization with most projects: ${defaultOrg.name} (${defaultOrg.projectCount} projects)`);
        setSelectedOrganization({
          id: defaultOrg.id,
          name: defaultOrg.name,
          legalName: defaultOrg.legalName,
          status: defaultOrg.status,
        });
      } else {
        // No orgs with projects: clear selection
        console.log('🏢 OrganizationProvider: No organizations with projects found');
        setSelectedOrganization(null);
      }

    } catch (error) {
      console.error('🏢 OrganizationProvider: Error in refreshUserOrganizations:', error);
      setUserOrganizations([]);
      setSelectedOrganization(null);
    } finally {
      console.log('🏢 OrganizationProvider: Loading complete, isLoading set to false');
      setIsLoading(false);
      loadingRef.current = false; // Reset loading guard
    }
  }, [user, authLoading]); // Memoize with user and authLoading dependencies

  // Filter projects based on selected organization
  const getFilteredProjects = (allProjects: any[]): any[] => {
    if (!selectedOrganization || !allProjects.length) {
      return allProjects;
    }

    // This will be enhanced when we integrate with project queries
    // For now, return all projects (will be filtered at database level)
    return allProjects;
  };

  useEffect(() => {
    console.log('🏢 OrganizationProvider: useEffect triggered, calling refreshUserOrganizations');
    refreshUserOrganizations();
  }, [refreshUserOrganizations]); // Use memoized function as dependency

  const shouldShowSelector = userOrganizations.length > 1;
  console.log('🏢 OrganizationProvider: shouldShowSelector =', shouldShowSelector, ', userOrganizations.length =', userOrganizations.length);

  const value: OrganizationContextValue = {
    selectedOrganization,
    setSelectedOrganization,
    userOrganizations,
    isLoading,
    shouldShowSelector,
    refreshUserOrganizations,
    getFilteredProjects,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
