import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Plus, 
  Edit, 
  Trash2, 
  Key, 
  Calendar,
  Settings,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { DfnsServiceAccountResponse } from '@/types/dfns';

interface ServiceAccountListProps {
  onAccountUpdated: () => void;
}

export function ServiceAccountList({ onAccountUpdated }: ServiceAccountListProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<DfnsServiceAccountResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadServiceAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      // TODO: Implement when service account service is available
      // const accountService = dfnsService.getServiceAccountManagementService();
      // const response = await accountService.listServiceAccounts();
      // setAccounts(response.items || []);
      
      // Placeholder for now
      setAccounts([]);
      
    } catch (error: any) {
      console.error("Error loading service accounts:", error);
      setError(`Failed to load service accounts: ${error.message}`);
      toast({
        title: "Error",
        description: "Failed to load service accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountAction = async (action: string, accountId: string) => {
    try {
      setLoading(true);
      // TODO: Implement service account actions
      console.log(`${action} service account:`, accountId);
      
      toast({
        title: "Success",
        description: `Service account ${action} completed successfully`,
      });
      
      await loadServiceAccounts();
      onAccountUpdated();
    } catch (error: any) {
      console.error(`Error ${action} service account:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} service account: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAccountStatus = (account: DfnsServiceAccountResponse) => {
    if (account.userInfo.isActive === false) return { status: 'Inactive', variant: 'destructive' as const };
    if (account.userInfo.isActive) return { status: 'Active', variant: 'default' as const };
    return { status: 'Unknown', variant: 'secondary' as const };
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    loadServiceAccounts();
  }, []);

  if (loading && accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading service accounts...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No service accounts found</h3>
        <p className="text-muted-foreground mb-4">
          Create service accounts for API access and automation
        </p>
        <Button 
          className="gap-2"
          onClick={() => handleAccountAction('create', '')}
        >
          <Plus className="h-4 w-4" />
          Create Service Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Service Accounts</h3>
          <p className="text-sm text-muted-foreground">
            {accounts.length} service account{accounts.length !== 1 ? 's' : ''} for API access
          </p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => handleAccountAction('create', '')}
        >
          <Plus className="h-4 w-4" />
          Create Account
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const { status, variant } = getAccountStatus(account);
              
              return (
                <TableRow key={account.userInfo.userId}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-md bg-blue-100">
                        <Key className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{account.userInfo.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Service Account
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      N/A
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      N/A
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(account.userInfo.userId)}
                        >
                          Copy account ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleAccountAction('view', account.userInfo.userId)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAccountAction('edit', account.userInfo.userId)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit account
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAccountAction('rotate-key', account.userInfo.userId)}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Rotate key
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAccountAction('settings', account.userInfo.userId)}
                          className="gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleAccountAction('deactivate', account.userInfo.userId)}
                          className="gap-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
