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
  Key, 
  Search, 
  Plus, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Archive,
  Loader2,
  AlertCircle,
  Settings,
  Clock,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsPersonalAccessToken } from "../../../../types/dfns";

/**
 * Personal Access Token List Component
 * Displays and manages personal access tokens for API access
 */
export function PersonalTokenList() {
  const [tokens, setTokens] = useState<DfnsPersonalAccessToken[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<DfnsPersonalAccessToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | 'archive' | null;
    token: DfnsPersonalAccessToken | null;
  }>({ open: false, action: null, token: null });

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

  // Fetch personal access tokens from DFNS
  useEffect(() => {
    const fetchTokens = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const tokenService = dfnsService.getPersonalAccessTokenService();
        const allTokens = await tokenService.listPersonalAccessTokens({
          syncToDatabase: true
        });
        
        setTokens(allTokens);
        setFilteredTokens(allTokens);
      } catch (error) {
        console.error('Failed to fetch personal access tokens:', error);
        setError('Failed to load personal access tokens');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [dfnsService]);

  // Filter tokens based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTokens(tokens);
    } else {
      const filtered = tokens.filter(token => 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (token.isActive ? 'active' : 'inactive').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (token.externalId && token.externalId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTokens(filtered);
    }
  }, [searchTerm, tokens]);

  const handleTokenAction = async (action: 'activate' | 'deactivate' | 'archive', token: DfnsPersonalAccessToken) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${token.tokenId}`);
      const tokenService = dfnsService.getPersonalAccessTokenService();

      let updatedToken: DfnsPersonalAccessToken;
      
      switch (action) {
        case 'activate':
          updatedToken = await tokenService.activatePersonalAccessToken(token.tokenId);
          break;
        case 'deactivate':
          updatedToken = await tokenService.deactivatePersonalAccessToken(token.tokenId);
          break;
        case 'archive':
          updatedToken = await tokenService.archivePersonalAccessToken(token.tokenId);
          break;
        default:
          return;
      }

      // Update the tokens list
      setTokens(prev => prev.map(t => t.tokenId === token.tokenId ? updatedToken : t));
      setConfirmDialog({ open: false, action: null, token: null });
    } catch (error) {
      console.error(`Failed to ${action} token:`, error);
      setError(`Failed to ${action} token: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmDialog = (action: 'activate' | 'deactivate' | 'archive', token: DfnsPersonalAccessToken) => {
    setConfirmDialog({ open: true, action, token });
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? 'default' : 'secondary';
  };

  const canPerformAction = (action: 'activate' | 'deactivate' | 'archive', token: DfnsPersonalAccessToken): boolean => {
    switch (action) {
      case 'activate':
        return !token.isActive;
      case 'deactivate':
        return token.isActive;
      case 'archive':
        return true; // Can always archive
      default:
        return false;
    }
  };

  const getExpiryStatus = (token: DfnsPersonalAccessToken) => {
    // Personal access tokens don't have expiry info in the current API response
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Personal Access Tokens</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading tokens...</span>
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
            <Key className="h-5 w-5" />
            <span>Personal Access Tokens</span>
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
                <Key className="h-5 w-5" />
                <span>Personal Access Tokens</span>
              </CardTitle>
              <CardDescription>
                Manage personal access tokens for API authentication ({filteredTokens.length} tokens)
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens by name or status..."
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
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No tokens found matching your search.' : 'No personal access tokens found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTokens.map((token) => {
                    const expiryStatus = getExpiryStatus(token);
                    return (
                      <TableRow key={token.tokenId}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{token.name}</div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {token.tokenId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(token.isActive)}>
                            {token.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expiryStatus ? (
                            <div className="flex items-center space-x-2">
                              <Badge variant={expiryStatus.badge as any}>
                                {expiryStatus.text}
                              </Badge>
                              {expiryStatus.status === 'expiring' && (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                              {expiryStatus.status === 'expired' && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              No expiry
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {token.externalId ? (
                            <div className="text-sm">{token.externalId}</div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(token.dateCreated).toLocaleDateString()}
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
                                {actionLoading?.includes(token.tokenId) ? (
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
                              {canPerformAction('activate', token) && (
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog('activate', token)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {canPerformAction('deactivate', token) && (
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog('deactivate', token)}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                              {canPerformAction('archive', token) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openConfirmDialog('archive', token)}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ open, action: null, token: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmDialog.action && confirmDialog.action.charAt(0).toUpperCase() + confirmDialog.action.slice(1)} Token
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action} token "{confirmDialog.token?.name}"?
              {confirmDialog.action === 'archive' && (
                <span className="block mt-2 text-destructive">
                  This action cannot be undone and will invalidate the token permanently.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, token: null })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === 'archive' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmDialog.action && confirmDialog.token) {
                  handleTokenAction(confirmDialog.action, confirmDialog.token);
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
