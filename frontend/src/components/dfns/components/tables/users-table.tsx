import React, { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users,
  Shield,
  Mail,
  Calendar,
  MoreHorizontal,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { DfnsUserResponse } from '@/types/dfns';

interface UsersTableProps {
  className?: string;
  maxItems?: number;
  onUserSelected?: (user: DfnsUserResponse) => void;
}

/**
 * DFNS Users Table Component
 * Comprehensive table view of organization users with real DFNS integration
 */
export function UsersTable({ className, maxItems, onUserSelected }: UsersTableProps) {
  const [users, setUsers] = useState<DfnsUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Table columns definition
  const columns: ColumnDef<DfnsUserResponse>[] = [
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ row }) => {
        const username = row.getValue('username') as string;
        const name = row.original.name;
        return (
          <div>
            <div className="font-medium">{username}</div>
            {name && <div className="text-sm text-muted-foreground">{name}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: 'kind',
      header: 'Type',
      cell: ({ row }) => {
        const kind = row.getValue('kind') as string;
        return (
          <Badge variant="outline">
            {kind}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean;
        const isRegistered = row.original.isRegistered;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            {!isRegistered && (
              <Badge variant="outline">Pending Registration</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'permissionAssignments',
      header: 'Permissions',
      cell: ({ row }) => {
        const assignments = row.getValue('permissionAssignments') as any[];
        return (
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{assignments?.length || 0} permissions</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ row }) => {
        const lastLogin = row.getValue('lastLoginAt') as string;
        return (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {lastLogin ? new Date(lastLogin).toLocaleDateString() : 'Never'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onUserSelected?.(user)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                Edit Permissions
              </DropdownMenuItem>
              <DropdownMenuItem>
                {user.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Load users from DFNS
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const authStatus = await authService.getAuthenticationStatus();

        if (!authStatus.isAuthenticated) {
          setError('Authentication required to view users');
          return;
        }

        const userService = dfnsService.getUserManagementService();
        const usersResult = await userService.getAllUsers();
        
        // Handle the result properly - extract the actual data array
        let usersData: DfnsUserResponse[] = [];
        if (usersResult && typeof usersResult === 'object') {
          // Check if it's a wrapped response with data property
          if ('data' in usersResult && Array.isArray(usersResult.data)) {
            usersData = usersResult.data;
          } else if ('items' in usersResult && Array.isArray(usersResult.items)) {
            usersData = usersResult.items;
          } else if (Array.isArray(usersResult)) {
            usersData = usersResult;
          }
        }
        
        const finalUsers = maxItems ? usersData.slice(0, maxItems) : usersData;
        setUsers(finalUsers);

      } catch (err: any) {
        console.error('Error loading users:', err);
        setError(err.message || 'Failed to load users');
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [maxItems, toast]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users ({users.length})
        </CardTitle>
        <CardDescription>
          {maxItems ? `Latest ${maxItems} users` : 'All organization users'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={users}
          searchKey="username"
        />
      </CardContent>
    </Card>
  );
}
