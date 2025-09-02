import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/infrastructure/auth/AuthProvider';
import { supabase } from '@/infrastructure/database/client';
import { useParams } from 'react-router-dom';
import type { UserContext, UserRole, OrganizationRole } from '@/types/sidebar';

interface UseUserContextReturn extends UserContext {
  refreshUserContext: () => Promise<void>;
  isRefreshing: boolean;
  error: string | null;
}

export function useUserContext(): UseUserContextReturn {
  const { user, isAuthenticated } = useAuth();
  const { projectId } = useParams();
  
  const [userContext, setUserContext] = useState<UserContext>({
    userId: '',
    roles: [],
    profileType: null,
    permissions: [],
    organizationRoles: [],
    highestRolePriority: 0,
    currentProjectId: undefined,
    isLoading: true
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserContext = useCallback(async (): Promise<void> => {
    if (!user?.id || !isAuthenticated) {
      setUserContext(prev => ({
        ...prev,
        isLoading: false,
        userId: '',
        roles: [],
        permissions: [],
        profileType: null,
        organizationRoles: [],
        highestRolePriority: 0
      }));
      return;
    }

    try {
      setError(null);
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('profile_type')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch user roles with role details
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner (
            id,
            name,
            description,
            priority
          )
        `)
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      // Fetch organization roles if applicable
      const { data: orgRolesData } = await supabase
        .from('user_organization_roles')
        .select(`
          organization_id,
          role_id,
          roles!inner (
            id,
            name,
            description,
            priority
          )
        `)
        .eq('user_id', user.id);

      // Transform user roles data
      const userRoles: UserRole[] = (userRolesData || []).map(item => ({
        id: item.roles.id,
        name: item.roles.name,
        description: item.roles.description,
        priority: item.roles.priority
      }));

      // Transform organization roles data
      const organizationRoles: OrganizationRole[] = (orgRolesData || []).map(item => ({
        organizationId: item.organization_id,
        roleId: item.roles.id,
        roleName: item.roles.name,
        rolePriority: item.roles.priority
      }));

      // Get all role IDs for permission lookup
      const allRoleIds = [
        ...userRoles.map(role => role.id),
        ...organizationRoles.map(orgRole => orgRole.roleId)
      ];

      // Fetch permissions for all roles
      let permissions: string[] = [];
      if (allRoleIds.length > 0) {
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('role_permissions')
          .select('permission_name')
          .in('role_id', allRoleIds);

        if (permissionsError) {
          console.error('Error fetching permissions:', permissionsError);
          throw permissionsError;
        }

        // Type-safe mapping of permission_name (which is text/string in database)
        permissions = Array.from(new Set(
          (permissionsData as Array<{ permission_name: string }> || []).map(p => p.permission_name)
        ));
      }

      // Calculate highest role priority (higher number = higher priority)
      const allPriorities = [
        ...userRoles.map(role => role.priority),
        ...organizationRoles.map(orgRole => orgRole.rolePriority)
      ];
      const highestRolePriority = Math.max(...allPriorities, 0);

      // Update user context with current project ID from params
      setUserContext({
        userId: user.id,
        roles: userRoles,
        profileType: profileData?.profile_type || null,
        permissions,
        organizationRoles,
        highestRolePriority,
        currentProjectId: projectId,
        isLoading: false
      });

    } catch (error) {
      console.error('Error fetching user context:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch user context');
      setUserContext(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, isAuthenticated]); // Removed projectId from dependencies

  const refreshUserContext = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchUserContext();
    setIsRefreshing(false);
  }, [fetchUserContext]);

  // Fetch user context when auth state changes
  useEffect(() => {
    fetchUserContext();
  }, [fetchUserContext]);
  
  // Update project context separately to avoid full refetch
  useEffect(() => {
    setUserContext(prev => ({
      ...prev,
      currentProjectId: projectId
    }));
  }, [projectId]);

  return {
    ...userContext,
    refreshUserContext,
    isRefreshing,
    error
  };
}