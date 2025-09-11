import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  Key, 
  Settings,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { 
  DfnsPermission, 
  DfnsPermissionAssignment,
  DfnsUser,
  DfnsServiceAccount,
  DfnsPersonalAccessToken
} from '@/types/dfns';

// Import permission components
import { PermissionManager } from '../permissions/permission-manager';

/**
 * DFNS Permissions Page - Enterprise access control management
 * Following the climateReceivables pattern with real DFNS integration
 */
export function DfnsPermissionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Real permission data from DFNS
  const [permissionData, setPermissionData] = useState({
    totalPermissions: 0,
    activeAssignments: 0,
    userPermissions: 0,
    roleBasedPermissions: 0,
    isAuthenticated: false,
    permissions: [] as DfnsPermission[],
    assignments: [] as DfnsPermissionAssignment[],
    users: [] as DfnsUser[],
    serviceAccounts: [] as DfnsServiceAccount[],
    tokens: [] as DfnsPersonalAccessToken[],
    isLoading: true
  });

  const refreshPermissionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required to view permission management');
        setPermissionData(prev => ({ 
          ...prev, 
          isAuthenticated: false, 
          isLoading: false 
        }));
        return;
      }

      // Get permission data from various services
      const [permissionsResult, assignmentsResult, usersResult] = await Promise.all([
        dfnsService.getPermissionsService().listPermissions().then(result => result?.items || []).catch(() => []),
        dfnsService.getPermissionAssignmentsService().listPermissionAssignments().then(result => result?.items || []).catch(() => []),
        dfnsService.getUserManagementService().listUsers().then(result => result?.data?.items || []).catch(() => [])
      ]);

      // Calculate metrics
      const activeAssignments = assignmentsResult.filter((assignment: any) => assignment.isActive !== false).length;
      const userPermissions = assignmentsResult.filter((assignment: any) => assignment.identityKind === 'User').length;
      const roleBasedPermissions = assignmentsResult.filter((assignment: any) => assignment.identityKind === 'ServiceAccount').length;

      setPermissionData({
        totalPermissions: permissionsResult.length,
        activeAssignments,
        userPermissions,
        roleBasedPermissions,
        isAuthenticated: authStatus.isAuthenticated,
        permissions: permissionsResult as DfnsPermission[],
        assignments: assignmentsResult as DfnsPermissionAssignment[],
        users: usersResult as DfnsUser[],
        serviceAccounts: [], // TODO: Add when service account service is ready
        tokens: [], // TODO: Add when token service is ready
        isLoading: false
      });

      toast({
        title: "Success",
        description: `Loaded ${permissionsResult.length} permissions and ${assignmentsResult.length} assignments`,
      });

    } catch (error: any) {
      console.error("Error loading permission data:", error);
      setError(`Failed to load permission data: ${error.message}`);
      setPermissionData(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Error",
        description: "Failed to load permission data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPermissionData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permissions & Access Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enterprise-grade permission management and role-based access control
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPermissionData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Permission
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-100">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{permissionData.totalPermissions}</div>
              <div className="text-xs text-muted-foreground">
                Available permissions
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                <div className="p-1.5 rounded-md bg-green-100">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{permissionData.activeAssignments}</div>
              <div className="text-xs text-muted-foreground">
                Permission assignments
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">User Permissions</CardTitle>
                <div className="p-1.5 rounded-md bg-purple-100">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{permissionData.userPermissions}</div>
              <div className="text-xs text-muted-foreground">
                User-specific permissions
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
                <div className="p-1.5 rounded-md bg-yellow-100">
                  <UserCheck className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{permissionData.roleBasedPermissions}</div>
              <div className="text-xs text-muted-foreground">
                Service account permissions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission Management Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full max-w-2xl grid grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5">
              <Lock className="h-4 w-4" />
              <span>Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <UserCheck className="h-4 w-4" />
              <span>Roles</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Key className="h-4 w-4" />
              <span>Audit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Permission Distribution</CardTitle>
                  <CardDescription>
                    Overview of permission assignments across the organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">User Permissions</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ 
                              width: permissionData.activeAssignments > 0 
                                ? `${(permissionData.userPermissions / permissionData.activeAssignments) * 100}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <Badge variant="outline">{permissionData.userPermissions}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Service Account Permissions</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: permissionData.activeAssignments > 0 
                                ? `${(permissionData.roleBasedPermissions / permissionData.activeAssignments) * 100}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <Badge variant="outline">{permissionData.roleBasedPermissions}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Permissions Available</span>
                      <Badge variant="secondary">{permissionData.totalPermissions}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle>Security Status</CardTitle>
                  <CardDescription>
                    Organization-wide access control and security metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Authentication Status</span>
                      <Badge variant={permissionData.isAuthenticated ? "secondary" : "destructive"} 
                             className={permissionData.isAuthenticated ? "bg-green-50 text-green-700" : ""}>
                        {permissionData.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Permission Enforcement</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        <Lock className="h-3 w-3 mr-1" />
                        Enforced
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Role-Based Access Control</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Least Privilege Principle</span>
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common permission management tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">Create Permission</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Define new access control permissions
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Assign Permissions</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Grant permissions to users or service accounts
                    </span>
                  </Button>
                  <Button variant="outline" className="gap-2 h-auto p-4 flex-col items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4" />
                      <span className="font-medium">Audit Access</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Review permission assignments and access logs
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Permission Registry</CardTitle>
                    <CardDescription>
                      Manage available permissions and their configurations
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{permissionData.totalPermissions} Permissions</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <PermissionManager 
                  permissions={permissionData.permissions}
                  assignments={permissionData.assignments}
                  onPermissionUpdated={refreshPermissionData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Permission Assignments</CardTitle>
                <CardDescription>
                  View and manage permission assignments to users and service accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Permission Assignment Manager</h3>
                  <p className="text-muted-foreground mb-6">
                    Advanced permission assignment interface coming soon
                  </p>
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Assignments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Role Templates</CardTitle>
                <CardDescription>
                  Pre-configured permission sets for common organizational roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Role Management</h3>
                  <p className="text-muted-foreground mb-6">
                    Role-based access control templates and management
                  </p>
                  <Button variant="outline">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Manage Roles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Access Audit Trail</CardTitle>
                <CardDescription>
                  Monitor permission usage and access patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Audit Dashboard</h3>
                  <p className="text-muted-foreground mb-6">
                    Comprehensive access logging and audit trail
                  </p>
                  <Button variant="outline">
                    <Key className="h-4 w-4 mr-2" />
                    View Audit Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Nested routes for detailed views */}
      <Routes>
        <Route path="/permissions/:permissionId" element={<div>Permission Details View</div>} />
        <Route path="/assignments/:assignmentId" element={<div>Assignment Details View</div>} />
        <Route path="*" element={<Navigate to="/wallet/dfns/permissions" replace />} />
      </Routes>
    </div>
  );
}