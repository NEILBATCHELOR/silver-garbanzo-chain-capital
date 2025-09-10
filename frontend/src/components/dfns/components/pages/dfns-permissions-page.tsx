import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/utils";
import { 
  Key, 
  Shield, 
  Users, 
  UserPlus,
  FileText,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Import permissions components - these are the actual DFNS permission components
import { 
  PermissionManager,
  PermissionAssignment,
  RoleTemplates 
} from '../permissions';

const DfnsPermissionsPage: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Sub-navigation for permissions section
  const permissionsNavItems = [
    {
      icon: <Key className="h-4 w-4" />,
      label: "Permissions",
      href: `/wallet/dfns/permissions`,
      description: "Manage individual permissions and operations"
    },
    {
      icon: <UserPlus className="h-4 w-4" />,
      label: "Assignments",
      href: `/wallet/dfns/permissions/assignments`,
      description: "Assign permissions to users and service accounts"
    },
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Role Templates",
      href: `/wallet/dfns/permissions/roles`,
      description: "Enterprise role templates for common access patterns"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permissions & Access Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage granular permissions and role-based access control
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              70+ Operations
            </Badge>
            <Button size="sm" className="gap-2">
              <Lock className="h-4 w-4" />
              Create Permission
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex space-x-6 overflow-x-auto">
          {permissionsNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/wallet/dfns/permissions' && pathname === '/wallet/dfns/permissions');
              
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-gray-100",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<PermissionsView />} />
          <Route path="/assignments" element={<AssignmentsView />} />
          <Route path="/roles" element={<RoleTemplatesView />} />
          <Route path="*" element={<Navigate to="/wallet/dfns/permissions" replace />} />
        </Routes>
      </div>
    </div>
  );
};

// Individual view components
const PermissionsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Permission Management</h2>
      <p className="text-muted-foreground">
        Create and manage individual permissions with granular operation control.
      </p>
    </div>
    
    <PermissionManager />
  </div>
);

const AssignmentsView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Permission Assignments</h2>
      <p className="text-muted-foreground">
        Assign permissions to users, service accounts, and personal access tokens.
      </p>
    </div>
    
    <PermissionAssignment />
  </div>
);

const RoleTemplatesView: React.FC = () => (
  <div className="p-6">
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Enterprise Role Templates</h2>
      <p className="text-muted-foreground">
        Pre-defined role templates for common enterprise access patterns and responsibilities.
      </p>
    </div>
    
    <RoleTemplates />
  </div>
);

export default DfnsPermissionsPage;