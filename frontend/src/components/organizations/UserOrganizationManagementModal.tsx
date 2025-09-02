/**
 * User Organization Management Modal
 * Enhanced modal for managing user roles and organization assignments
 */

import React, { useState, useEffect } from 'react';
import { User, Building, Save, X, Users } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

// Organization Components
import { OrganizationAssignment } from '@/components/organizations';

// Types
import type { User as UserType } from '@/types/domain/user/user';
import type { Role } from '@/utils/auth/roleUtils';

interface UserOrganizationManagementModalProps {
  user: UserType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

const UserOrganizationManagementModal: React.FC<UserOrganizationManagementModalProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdated
}) => {
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState('assignments');
  const [organizationSummary, setOrganizationSummary] = useState<{
    mode: 'all' | 'multiple' | 'single' | 'none';
    organizationIds: string[];
    organizationCount: number;
  } | null>(null);

  const handleAssignmentChange = (summary: {
    mode: 'all' | 'multiple' | 'single' | 'none';
    organizationIds: string[];
    organizationCount: number;
  }) => {
    setOrganizationSummary(summary);
  };

  const handleClose = () => {
    onOpenChange(false);
    onUserUpdated?.();
  };

  const getAssignmentSummaryText = () => {
    if (!organizationSummary) return 'Loading...';
    
    switch (organizationSummary.mode) {
      case 'none':
        return 'No organization assignments';
      case 'all':
        return 'Assigned to all organizations';
      case 'single':
        return '1 organization assigned';
      case 'multiple':
        return `${organizationSummary.organizationCount} organizations assigned`;
      default:
        return 'Unknown assignment';
    }
  };

  const getAssignmentBadgeVariant = () => {
    if (!organizationSummary) return 'secondary';
    
    switch (organizationSummary.mode) {
      case 'none':
        return 'outline';
      case 'all':
        return 'default';
      case 'single':
        return 'secondary';
      case 'multiple':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage User Organizations - {user.profile?.name || user.email}
          </DialogTitle>
          <DialogDescription>
            Assign organizations to this user for their current role: <strong>{user.role?.name || 'No Role'}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assignments">Organization Assignments</TabsTrigger>
              <TabsTrigger value="summary">Assignment Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="space-y-4 mt-6">
              {user.role ? (
                <OrganizationAssignment
                  userId={user.id}
                  roleId={user.role.id}
                  roleName={user.role.name}
                  userName={user.profile?.name || user.email}
                  onAssignmentChange={handleAssignmentChange}
                  compact={true}
                />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Role Assigned</h3>
                      <p>This user needs a role before organizations can be assigned.</p>
                      <p className="text-sm mt-2">
                        Please assign a role to this user in the User Management section first.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Assignment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* User Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">User</h4>
                      <div className="mt-1">
                        <div className="font-medium">{user.profile?.name || 'No Name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Role</h4>
                      <div className="mt-1">
                        <Badge variant="outline">
                          {user.role?.name || 'No Role'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Organization Assignment Summary */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Organization Assignments
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getAssignmentBadgeVariant()}>
                        {getAssignmentSummaryText()}
                      </Badge>
                    </div>
                    {organizationSummary?.mode === 'multiple' && (
                      <div className="text-sm text-muted-foreground mt-2">
                        User has access to {organizationSummary.organizationCount} specific organizations
                      </div>
                    )}
                    {organizationSummary?.mode === 'all' && (
                      <div className="text-sm text-muted-foreground mt-2">
                        User has access to all organizations in the system
                      </div>
                    )}
                    {organizationSummary?.mode === 'none' && (
                      <div className="text-sm text-muted-foreground mt-2">
                        User does not have access to any specific organizations
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Access Information */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Access Implications
                    </h4>
                    <div className="text-sm space-y-1">
                      {organizationSummary?.mode === 'all' && (
                        <div className="text-green-700">
                          ✓ Can access all organization data and documents
                        </div>
                      )}
                      {organizationSummary?.mode === 'multiple' && (
                        <div className="text-blue-700">
                          ✓ Can access data for {organizationSummary.organizationCount} assigned organizations
                        </div>
                      )}
                      {organizationSummary?.mode === 'single' && (
                        <div className="text-blue-700">
                          ✓ Can access data for 1 assigned organization
                        </div>
                      )}
                      {organizationSummary?.mode === 'none' && (
                        <div className="text-amber-700">
                          ⚠ No organization-specific access (global role permissions only)
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserOrganizationManagementModal;
