import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bot, 
  Search, 
  Plus, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Archive,
  Loader2,
  AlertCircle,
  Settings
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsServiceAccountInfo } from "../../../../types/dfns/serviceAccounts";

/**
 * Service Account List Component
 * Displays and manages service accounts (machine users) for API access
 */
export function ServiceAccountList() {
  const [serviceAccounts, setServiceAccounts] = useState<DfnsServiceAccountInfo[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<DfnsServiceAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | 'archive' | null;
    account: DfnsServiceAccountInfo | null;
  }>({ open: false, action: null, account: null });

  // Initialize DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Fetch service accounts from DFNS
  useEffect(() => {
    const fetchServiceAccounts = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const serviceAccountService = dfnsService.getServiceAccountService();
        const allAccounts = await serviceAccountService.getAllServiceAccounts();
        
        setServiceAccounts(allAccounts);
        setFilteredAccounts(allAccounts);
      } catch (error) {
        console.error('Failed to fetch service accounts:', error);
        setError('Failed to load service accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceAccounts();
  }, [dfnsService]);

  // Filter service accounts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(serviceAccounts);
    } else {
      const filtered = serviceAccounts.filter(account => 
        account.userInfo.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.userInfo.isActive ? 'active' : 'inactive').includes(searchTerm.toLowerCase())
      );
      setFilteredAccounts(filtered);
    }
  }, [searchTerm, serviceAccounts]);

  const handleAccountAction = async (action: 'activate' | 'deactivate' | 'archive', account: DfnsServiceAccountInfo) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${account.userInfo.userId}`);
      const serviceAccountService = dfnsService.getServiceAccountService();

      let updatedAccount: DfnsServiceAccountInfo;
      
      switch (action) {
        case 'activate':
          updatedAccount = await serviceAccountService.activateServiceAccount(account.userInfo.userId);
          break;
        case 'deactivate':
          updatedAccount = await serviceAccountService.deactivateServiceAccount(account.userInfo.userId);
          break;
        case 'archive':
          updatedAccount = await serviceAccountService.archiveServiceAccount(account.userInfo.userId);
          break;
        default:
          return;
      }

      // Update the service accounts list
      setServiceAccounts(prev => prev.map(a => a.userInfo.userId === account.userInfo.userId ? updatedAccount : a));
      setConfirmDialog({ open: false, action: null, account: null });
    } catch (error) {
      console.error(`Failed to ${action} service account:`, error);
      setError(`Failed to ${action} service account: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmDialog = (action: 'activate' | 'deactivate' | 'archive', account: DfnsServiceAccountInfo) => {
    setConfirmDialog({ open: true, action, account });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'deactivated': return 'secondary';
      case 'archived': return 'destructive';
      default: return 'outline';
    }
  };

  const canPerformAction = (action: 'activate' | 'deactivate' | 'archive', account: DfnsServiceAccountInfo): boolean => {
    switch (action) {
      case 'activate':
        return !account.userInfo.isActive;
      case 'deactivate':
        return account.userInfo.isActive;
      case 'archive':
        return account.userInfo.isActive !== undefined; // Can always archive unless already archived
      default:
        return false;
    }
  };

  const formatPublicKey = (publicKey?: string): string => {
    if (!publicKey) return 'N/A';
    // Show first 20 and last 20 characters of public key
    if (publicKey.length > 40) {
      return `${publicKey.substring(0, 20)}...${publicKey.substring(publicKey.length - 20)}`;
    }
    return publicKey;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Service Accounts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading service accounts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Service Accounts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Service Accounts</span>
              </CardTitle>
              <CardDescription>
                Manage service accounts for API access and automation ({filteredAccounts.length} accounts)
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search service accounts by name or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Public Key</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No service accounts found matching your search.' : 'No service accounts found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.userInfo.userId}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{account.userInfo.username}</div>
                            <div className="text-sm text-muted-foreground">{account.userInfo.userId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(account.userInfo.isActive ? 'active' : 'inactive')}>
                          {account.userInfo.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono max-w-xs truncate">
                          {formatPublicKey(account.accessTokens[0]?.publicKey)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">—</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {account.accessTokens[0]?.dateCreated ? 
                            new Date(account.accessTokens[0].dateCreated).toLocaleDateString() :
                            'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              disabled={!!actionLoading}
                            >
                              {actionLoading?.includes(account.userInfo.userId) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Settings className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {canPerformAction('activate', account) && (
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog('activate', account)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {canPerformAction('deactivate', account) && (
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog('deactivate', account)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            {canPerformAction('archive', account) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog('archive', account)}
                                  className="text-destructive"
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ open, action: null, account: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmDialog.action && confirmDialog.action.charAt(0).toUpperCase() + confirmDialog.action.slice(1)} Service Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action} service account "{confirmDialog.account?.userInfo.username}"?
              {confirmDialog.action === 'archive' && (
                <span className="block mt-2 text-destructive">
                  This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, account: null })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'archive' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmDialog.action && confirmDialog.account) {
                  handleAccountAction(confirmDialog.action, confirmDialog.account);
                }
              }}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {confirmDialog.action && confirmDialog.action.charAt(0).toUpperCase() + confirmDialog.action.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
