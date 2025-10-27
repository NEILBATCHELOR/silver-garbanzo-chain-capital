import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/infrastructure/database/client";
import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { Database } from "@/types/core/database";
import UnauthorizedPage from "./UnauthorizedPage";

type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
  showUnauthorized?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  redirectTo = "/auth/login",
  showUnauthorized = true
}) => {
  const { user, loading: authLoading } = useAuth(); // Use AuthContext instead of direct Supabase calls
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!authLoading) {
      checkAuthorization();
    }
  }, [user, authLoading, requiredRoles, requiredPermissions]);

  const checkAuthorization = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated (from AuthContext - no additional auth state changes)
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // If no specific roles/permissions required, allow access
      if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Check user roles and permissions
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          role:roles(name)
        `)
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Get user permissions separately
      const { data: userPermissions, error: permissionsError } = await supabase
        .from('user_roles')
        .select(`
          role:roles!inner(
            role_permissions(permission_name)
          )
        `)
        .eq('user_id', user.id);

      if (permissionsError) {
        console.error('Error fetching user permissions:', permissionsError);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Extract user's roles and permissions
      const userRoleNames = userRoles?.map(ur => ur.role.name).filter(Boolean) || [];
      const userPermissionNames = userPermissions?.flatMap(up => 
        up.role.role_permissions?.map(rp => rp.permission_name) || []
      ) || [];

      // Check if user has required roles
      const hasRequiredRole = requiredRoles.length === 0 || 
        requiredRoles.some(role => userRoleNames.includes(role));

      // Check if user has required permissions
      const hasRequiredPermission = requiredPermissions.length === 0 ||
        requiredPermissions.some(permission => userPermissionNames.includes(permission));

      setIsAuthorized(hasRequiredRole && hasRequiredPermission);
      
    } catch (error) {
      console.error('Authorization check failed:', error);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state (includes both auth loading and authorization check)
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // User is not authenticated or has invalid session - redirect to login
  if (isAuthorized === false) {
    // If no specific roles/permissions required but still not authorized,
    // it means no valid session exists - redirect to login
    if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    
    // User is authenticated but lacks required permissions
    if (showUnauthorized) {
      return (
        <UnauthorizedPage 
          message="You don't have the required permissions to access this page"
          returnPath="/"
        />
      );
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authorized
  return <>{children}</>;
};

// GuestGuard component for redirecting authenticated users
interface GuestGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({
  children,
  redirectTo = "/projects"
}) => {
  const { user, loading: authLoading } = useAuth(); // Use AuthContext
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoading) {
      // User from AuthContext determines guest status
      setIsGuest(!user);
    }
  }, [user, authLoading]);

  // Show loading state
  if (authLoading || isGuest === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // User is authenticated - redirect
  if (isGuest === false) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is guest - show content
  return <>{children}</>;
};

export default ProtectedRoute;
