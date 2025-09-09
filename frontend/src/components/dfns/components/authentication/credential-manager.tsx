import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Shield, 
  Plus, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle,
  Archive,
  Loader2,
  AlertCircle,
  Key,
  Smartphone,
  Computer
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { DfnsCredential as DfnsCredentialAPI } from "../../../../types/dfns/auth";

/**
 * Credential Manager Component
 * Manages WebAuthn credentials and other authentication factors
 */
export function CredentialManager() {
  const [credentials, setCredentials] = useState<DfnsCredentialAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCredentialName, setNewCredentialName] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | null;
    credential: DfnsCredentialAPI | null;
  }>({ open: false, action: null, credential: null });

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

  // Fetch credentials from DFNS
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!dfnsService) return;

      try {
        setLoading(true);
        setError(null);

        const credentialService = dfnsService.getCredentialService();
        const credentialsResponse = await credentialService.listCredentials({
          syncToDatabase: true
        });
        
        setCredentials(credentialsResponse.items);
      } catch (error) {
        console.error('Failed to fetch credentials:', error);
        setError('Failed to load credentials');
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [dfnsService]);

  const handleCreateCredential = async () => {
    if (!dfnsService || !newCredentialName.trim()) return;

    try {
      setActionLoading('create');
      
      // Check if WebAuthn is supported
      if (!window.navigator.credentials || !window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      const credentialService = dfnsService.getCredentialService();
      const newCredential = await credentialService.createWebAuthnCredential(
        newCredentialName.trim(),
        {
          autoActivate: true,
          syncToDatabase: true
        }
      );

      // Refresh credentials list
      const credentialsResponse = await credentialService.listCredentials();
      setCredentials(credentialsResponse.items);
      setCreateDialogOpen(false);
      setNewCredentialName("");
    } catch (error) {
      console.error('Failed to create credential:', error);
      setError(`Failed to create credential: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCredentialAction = async (action: 'activate' | 'deactivate', credential: DfnsCredentialAPI) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`${action}-${credential.credentialUuid}`);
      const credentialService = dfnsService.getCredentialService();

      let updatedCredential;
      
      switch (action) {
        case 'activate':
          await credentialService.activateCredential(
            credential.credentialUuid,
            { syncToDatabase: true }
          );
          break;
        case 'deactivate':
          await credentialService.deactivateCredential(
            credential.credentialUuid,
            { syncToDatabase: true }
          );
          break;
        default:
          return;
      }

      // Refresh credentials list after action
      const credentialsResponse = await credentialService.listCredentials();
      setCredentials(credentialsResponse.items);
      setConfirmDialog({ open: false, action: null, credential: null });
    } catch (error) {
      console.error(`Failed to ${action} credential:`, error);
      setError(`Failed to ${action} credential: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirmDialog = (action: 'activate' | 'deactivate', credential: DfnsCredentialAPI) => {
    setConfirmDialog({ open: true, action, credential });
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? 'default' : 'secondary';
  };

  const getKindIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'fido2':
        return <Shield className="h-4 w-4" />;
      case 'key':
        return <Key className="h-4 w-4" />;
      case 'passwordprotectedkey':
        return <Computer className="h-4 w-4" />;
      case 'recoverykey':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getKindBadgeVariant = (kind: string): "default" | "secondary" | "outline" => {
    switch (kind.toLowerCase()) {
      case 'fido2': return 'default';
      case 'key': return 'secondary';
      default: return 'outline';
    }
  };

  const canPerformAction = (action: 'activate' | 'deactivate', credential: DfnsCredentialAPI): boolean => {
    switch (action) {
      case 'activate':
        return !credential.isActive;
      case 'deactivate':
        return credential.isActive;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Credential Manager</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading credentials...</span>
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
            <Shield className="h-5 w-5" />
            <span>Credential Manager</span>
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
                <Shield className="h-5 w-5" />
                <span>Credential Manager</span>
              </CardTitle>
              <CardDescription>
                Manage WebAuthn credentials and authentication factors ({credentials.length} credentials)
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credential</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No credentials found. Add a WebAuthn credential to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  credentials.map((credential) => (
                    <TableRow key={credential.credentialUuid}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getKindIcon(credential.kind)}
                          <div>
                            <div className="font-medium">{credential.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {credential.credentialUuid}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getKindBadgeVariant(credential.kind)}>
                          {credential.kind}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(credential.isActive)}>
                          {credential.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(credential.dateCreated).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">Not available</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              disabled={!!actionLoading}
                            >
                              {actionLoading?.includes(credential.credentialUuid) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canPerformAction('activate', credential) && (
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog('activate', credential)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {canPerformAction('deactivate', credential) && (
                              <DropdownMenuItem
                                onClick={() => openConfirmDialog('deactivate', credential)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
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

      {/* Create Credential Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New WebAuthn Credential</DialogTitle>
            <DialogDescription>
              Add a new security key or biometric authentication method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credential-name">Credential Name</Label>
              <Input
                id="credential-name"
                placeholder="e.g., YubiKey 5, Touch ID, etc."
                value={newCredentialName}
                onChange={(e) => setNewCredentialName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateDialogOpen(false);
                setNewCredentialName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCredential}
              disabled={!newCredentialName.trim() || !!actionLoading}
            >
              {actionLoading === 'create' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog({ open, action: null, credential: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmDialog.action && confirmDialog.action.charAt(0).toUpperCase() + confirmDialog.action.slice(1)} Credential
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmDialog.action} credential "{confirmDialog.credential?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, credential: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmDialog.action && confirmDialog.credential) {
                  handleCredentialAction(confirmDialog.action, confirmDialog.credential);
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
