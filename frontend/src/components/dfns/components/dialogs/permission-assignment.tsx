import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Shield,
  Users,
  Bot,
  Key,
  Search,
  Check,
  ChevronsUpDown,
  Loader2,
  AlertCircle,
  Plus,
  UserCheck,
  Settings
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsCreatePermissionAssignmentRequest,
  DfnsGetPermissionResponse,
  DfnsUserResponse,
  DfnsServiceAccountResponse,
  DfnsPersonalAccessTokenResponse,
  DfnsIdentityKind
} from "../../../../types/dfns";

interface IdentityOption {
  id: string;
  name: string;
  kind: DfnsIdentityKind;
  status: string;
  email?: string;
  publicKeyFingerprint?: string;
}

interface PermissionAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPermissionId?: string;
  initialIdentityId?: string;
  onAssignmentComplete?: () => void;
}

/**
 * Permission Assignment Dialog
 * Handles assigning permissions to users, service accounts, and personal access tokens
 */
export function PermissionAssignmentDialog({ 
  open, 
  onOpenChange,
  initialPermissionId,
  initialIdentityId,
  onAssignmentComplete
}: PermissionAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [selectedPermission, setSelectedPermission] = useState<string>(initialPermissionId || '');
  const [selectedIdentity, setSelectedIdentity] = useState<string>(initialIdentityId || '');
  const [selectedIdentityKind, setSelectedIdentityKind] = useState<DfnsIdentityKind>('User');
  
  // Data state
  const [permissions, setPermissions] = useState<DfnsGetPermissionResponse[]>([]);
  const [identities, setIdentities] = useState<IdentityOption[]>([]);
  const [filteredIdentities, setFilteredIdentities] = useState<IdentityOption[]>([]);
  
  // UI state
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [searchIdentity, setSearchIdentity] = useState('');

  // DFNS service
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

  // Load data when dialog opens
  useEffect(() => {
    if (open && dfnsService) {
      loadPermissions();
      loadIdentities();
    }
  }, [open, dfnsService]);

  // Filter identities by kind and search
  useEffect(() => {
    const filtered = identities
      .filter(identity => identity.kind === selectedIdentityKind)
      .filter(identity => 
        identity.name.toLowerCase().includes(searchIdentity.toLowerCase()) ||
        identity.email?.toLowerCase().includes(searchIdentity.toLowerCase()) ||
        identity.id.toLowerCase().includes(searchIdentity.toLowerCase())
      );
    
    setFilteredIdentities(filtered);
  }, [identities, selectedIdentityKind, searchIdentity]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setSelectedPermission(initialPermissionId || '');
      setSelectedIdentity(initialIdentityId || '');
      setSelectedIdentityKind('User');
      setSearchIdentity('');
    }
  }, [open, initialPermissionId, initialIdentityId]);

  const loadPermissions = async () => {
    if (!dfnsService) return;

    try {
      const permissionService = dfnsService.getPermissionService();
      const allPermissions = await permissionService.getAllPermissions();
      
      // Filter only active permissions
      const activePermissions = allPermissions.filter(p => p.isActive);
      setPermissions(activePermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setError('Failed to load permissions');
    }
  };

  const loadIdentities = async () => {
    if (!dfnsService) return;

    try {
      const userService = dfnsService.getUserService();
      const serviceAccountService = dfnsService.getServiceAccountService();
      const personalAccessTokenService = dfnsService.getPersonalAccessTokenService();

      const identityOptions: IdentityOption[] = [];

      // Load users
      try {
        const users = await userService.getAllUsers();
        for (const user of users) {
          identityOptions.push({
            id: user.userId,
            name: user.username,
            kind: 'User',
            status: user.isActive ? 'Active' : 'Inactive',
            email: user.username // Assuming username is email
          });
        }
      } catch (error) {
        console.warn('Failed to load users:', error);
      }

      // Load service accounts
      try {
        const serviceAccounts = await serviceAccountService.getAllServiceAccounts();
        for (const sa of serviceAccounts) {
          identityOptions.push({
            id: sa.userId,
            name: sa.name,
            kind: 'ServiceAccount',
            status: sa.isActive ? 'Active' : 'Inactive',
            publicKeyFingerprint: sa.publicKey ? 'Present' : 'None'
          });
        }
      } catch (error) {
        console.warn('Failed to load service accounts:', error);
      }

      // Load personal access tokens
      try {
        const tokens = await personalAccessTokenService.getAllPersonalAccessTokens();
        for (const token of tokens) {
          identityOptions.push({
            id: token.tokenId,
            name: token.name,
            kind: 'PersonalAccessToken',
            status: token.isActive ? 'Active' : 'Inactive'
          });
        }
      } catch (error) {
        console.warn('Failed to load personal access tokens:', error);
      }

      setIdentities(identityOptions);
    } catch (error) {
      console.error('Failed to load identities:', error);
      setError('Failed to load identities');
    }
  };

  const handleAssignPermission = async () => {
    if (!dfnsService || !selectedPermission || !selectedIdentity) {
      setError('Please select both permission and identity');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const permissionService = dfnsService.getPermissionService();
      
      const request: DfnsCreatePermissionAssignmentRequest = {
        permissionId: selectedPermission,
        identityId: selectedIdentity,
        identityKind: selectedIdentityKind
      };

      const assignment = await permissionService.assignPermission(request, {
        syncToDatabase: true,
        validateIdentity: true
      });

      console.log('Permission assigned:', assignment);
      setSuccess(true);

      if (onAssignmentComplete) {
        onAssignmentComplete();
      }

      // Close dialog after brief delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (error) {
      console.error('Failed to assign permission:', error);
      setError(`Failed to assign permission: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getIdentityIcon = (kind: DfnsIdentityKind) => {
    switch (kind) {
      case 'User': return <Users className="h-4 w-4" />;
      case 'ServiceAccount': return <Bot className="h-4 w-4" />;
      case 'PersonalAccessToken': return <Key className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    return status === 'Active' ? 'default' : 'secondary';
  };

  const selectedPermissionData = permissions.find(p => p.id === selectedPermission);
  const selectedIdentityData = identities.find(i => i.id === selectedIdentity);

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span>Permission Assigned Successfully</span>
            </DialogTitle>
            <DialogDescription>
              The permission has been assigned to the selected identity
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Permission:</span>
                <span className="font-medium">{selectedPermissionData?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Assigned to:</span>
                <div className="flex items-center space-x-1">
                  {selectedIdentityData && getIdentityIcon(selectedIdentityData.kind)}
                  <span className="font-medium">{selectedIdentityData?.name}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Identity Type:</span>
                <Badge variant="secondary">{selectedIdentityKind}</Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Assign Permission</span>
          </DialogTitle>
          <DialogDescription>
            Grant permissions to users, service accounts, or personal access tokens
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Permission Selection */}
          <div className="space-y-2">
            <Label>Permission *</Label>
            <Popover open={permissionOpen} onOpenChange={setPermissionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={permissionOpen}
                  className="justify-between w-full"
                >
                  {selectedPermission ? (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>{selectedPermissionData?.name}</span>
                    </div>
                  ) : (
                    "Select permission..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search permissions..." />
                  <CommandEmpty>No permissions found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {permissions.map((permission) => (
                      <CommandItem
                        key={permission.id}
                        onSelect={() => {
                          setSelectedPermission(permission.id);
                          setPermissionOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPermission === permission.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">{permission.name}</span>
                            <Badge variant={permission.effect === 'Allow' ? 'default' : 'destructive'}>
                              {permission.effect}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {permission.operations.length} operations
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedPermissionData && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{selectedPermissionData.name}</span>
                  <Badge variant={selectedPermissionData.effect === 'Allow' ? 'default' : 'destructive'}>
                    {selectedPermissionData.effect}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedPermissionData.description}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedPermissionData.operations.length} operations: {selectedPermissionData.operations.slice(0, 3).join(', ')}
                  {selectedPermissionData.operations.length > 3 && ` +${selectedPermissionData.operations.length - 3} more`}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Identity Type Selection */}
          <div className="space-y-2">
            <Label>Identity Type *</Label>
            <Select 
              value={selectedIdentityKind} 
              onValueChange={(value: DfnsIdentityKind) => {
                setSelectedIdentityKind(value);
                setSelectedIdentity(''); // Reset identity selection
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>User</span>
                  </div>
                </SelectItem>
                <SelectItem value="ServiceAccount">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <span>Service Account</span>
                  </div>
                </SelectItem>
                <SelectItem value="PersonalAccessToken">
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span>Personal Access Token</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Identity Selection */}
          <div className="space-y-2">
            <Label>Select {selectedIdentityKind.replace(/([A-Z])/g, ' $1').trim()} *</Label>
            <Popover open={identityOpen} onOpenChange={setIdentityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={identityOpen}
                  className="justify-between w-full"
                >
                  {selectedIdentity ? (
                    <div className="flex items-center space-x-2">
                      {selectedIdentityData && getIdentityIcon(selectedIdentityData.kind)}
                      <span>{selectedIdentityData?.name}</span>
                      <Badge variant={getStatusBadgeVariant(selectedIdentityData?.status || '')}>
                        {selectedIdentityData?.status}
                      </Badge>
                    </div>
                  ) : (
                    `Select ${selectedIdentityKind.toLowerCase()}...`
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder={`Search ${selectedIdentityKind.toLowerCase()}s...`}
                    value={searchIdentity}
                    onValueChange={setSearchIdentity}
                  />
                  <CommandEmpty>No {selectedIdentityKind.toLowerCase()}s found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredIdentities.map((identity) => (
                      <CommandItem
                        key={identity.id}
                        onSelect={() => {
                          setSelectedIdentity(identity.id);
                          setIdentityOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedIdentity === identity.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getIdentityIcon(identity.kind)}
                            <span className="font-medium">{identity.name}</span>
                            <Badge variant={getStatusBadgeVariant(identity.status)}>
                              {identity.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {identity.email && `${identity.email} • `}
                            ID: {identity.id}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Assignment Summary */}
          {selectedPermission && selectedIdentity && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-3">Assignment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Permission:</span>
                  <span className="font-medium">{selectedPermissionData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Effect:</span>
                  <Badge variant={selectedPermissionData?.effect === 'Allow' ? 'default' : 'destructive'}>
                    {selectedPermissionData?.effect}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Operations:</span>
                  <span className="font-medium">{selectedPermissionData?.operations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Assign to:</span>
                  <div className="flex items-center space-x-1">
                    {selectedIdentityData && getIdentityIcon(selectedIdentityData.kind)}
                    <span className="font-medium">{selectedIdentityData?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignPermission} 
            disabled={loading || !selectedPermission || !selectedIdentity}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Assign Permission
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Trigger component for easy use
export function PermissionAssignmentTrigger({ 
  children, 
  initialPermissionId, 
  initialIdentityId,
  onAssignmentComplete 
}: {
  children?: React.ReactNode;
  initialPermissionId?: string;
  initialIdentityId?: string;
  onAssignmentComplete?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Assign Permission
          </Button>
        )}
      </DialogTrigger>
      <PermissionAssignmentDialog
        open={open}
        onOpenChange={setOpen}
        initialPermissionId={initialPermissionId}
        initialIdentityId={initialIdentityId}
        onAssignmentComplete={onAssignmentComplete}
      />
    </>
  );
}
