import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Crown, 
  Search, 
  Plus, 
  Eye,
  Loader2,
  AlertCircle,
  Shield,
  Users,
  Bot,
  Wallet,
  Key,
  Settings,
  BarChart3
} from "lucide-react";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsCreatePermissionRequest,
  DfnsGetPermissionResponse,
  DfnsPermissionOperation
} from "../../../../types/dfns/permissions";

interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  operations: DfnsPermissionOperation[];
  effect: 'Allow' | 'Deny';
  color: string;
}

/**
 * Role Templates Component
 * Provides predefined permission templates for common enterprise roles
 */
export function RoleTemplates() {
  const [templates] = useState<RoleTemplate[]>([
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full administrative access to all DFNS resources and operations',
      category: 'Administrative',
      icon: <Crown className="h-5 w-5" />,
      operations: [
        'Auth:Users:Create', 'Auth:Users:Read', 'Auth:Users:Update', 'Auth:Users:Delete',
        'Auth:Users:Activate', 'Auth:Users:Deactivate', 'Auth:Users:Archive',
        'Auth:ServiceAccounts:Create', 'Auth:ServiceAccounts:Read', 'Auth:ServiceAccounts:Update', 
        'Auth:ServiceAccounts:Delete', 'Auth:ServiceAccounts:Activate', 'Auth:ServiceAccounts:Deactivate',
        'Auth:ServiceAccounts:Archive', 'Auth:PersonalAccessTokens:Create', 'Auth:PersonalAccessTokens:Read',
        'Auth:PersonalAccessTokens:Update', 'Auth:PersonalAccessTokens:Delete',
        'Permissions:Create', 'Permissions:Read', 'Permissions:Update', 'Permissions:Delete',
        'Permissions:Assign', 'Permissions:Revoke', 'Permissions:Assignments:Read',
        'Wallets:Create', 'Wallets:Read', 'Wallets:Update', 'Wallets:Delete',
        'Wallets:Transactions:Create', 'Wallets:Transactions:Read', 
        'Wallets:Transfers:Create', 'Wallets:Transfers:Read',
        'Keys:Create', 'Keys:Read', 'Keys:Update', 'Keys:Delete',
        'Policies:Create', 'Policies:Read', 'Policies:Update', 'Policies:Delete',
        'Organization:Read', 'Organization:Update'
      ],
      effect: 'Allow',
      color: 'text-purple-600'
    },
    {
      id: 'wallet_manager',
      name: 'Wallet Manager',
      description: 'Full access to wallet management, transactions, and transfers',
      category: 'Wallet Management',
      icon: <Wallet className="h-5 w-5" />,
      operations: [
        'Wallets:Create', 'Wallets:Read', 'Wallets:Update', 'Wallets:Delete',
        'Wallets:Transactions:Create', 'Wallets:Transactions:Read',
        'Wallets:Transfers:Create', 'Wallets:Transfers:Read',
        'Wallets:Assets:Read', 'Wallets:History:Read', 'Wallets:Nfts:Read'
      ],
      effect: 'Allow',
      color: 'text-green-600'
    },
    {
      id: 'user_manager',
      name: 'User Manager',
      description: 'Manage users, service accounts, and access tokens',
      category: 'User Management',
      icon: <Users className="h-5 w-5" />,
      operations: [
        'Auth:Users:Create', 'Auth:Users:Read', 'Auth:Users:Update',
        'Auth:Users:Activate', 'Auth:Users:Deactivate',
        'Auth:ServiceAccounts:Create', 'Auth:ServiceAccounts:Read', 'Auth:ServiceAccounts:Update',
        'Auth:ServiceAccounts:Activate', 'Auth:ServiceAccounts:Deactivate',
        'Auth:PersonalAccessTokens:Create', 'Auth:PersonalAccessTokens:Read', 'Auth:PersonalAccessTokens:Update',
        'Auth:PersonalAccessTokens:Activate', 'Auth:PersonalAccessTokens:Deactivate',
        'Auth:Credentials:Read'
      ],
      effect: 'Allow',
      color: 'text-blue-600'
    },
    {
      id: 'security_officer',
      name: 'Security Officer',
      description: 'Manage permissions, policies, and security configurations',
      category: 'Security',
      icon: <Shield className="h-5 w-5" />,
      operations: [
        'Permissions:Create', 'Permissions:Read', 'Permissions:Update',
        'Permissions:Assign', 'Permissions:Revoke', 'Permissions:Assignments:Read',
        'Policies:Create', 'Policies:Read', 'Policies:Update', 'Policies:Delete',
        'Policies:Approvals:Read', 'Policies:Approvals:Update',
        'Auth:Credentials:Read', 'Auth:Credentials:Update',
        'Auth:Users:Read', 'Auth:ServiceAccounts:Read', 'Auth:PersonalAccessTokens:Read'
      ],
      effect: 'Allow',
      color: 'text-red-600'
    },
    {
      id: 'api_service',
      name: 'API Service',
      description: 'Limited API access for automated services and integrations',
      category: 'Service Account',
      icon: <Bot className="h-5 w-5" />,
      operations: [
        'Wallets:Read', 'Wallets:Assets:Read', 'Wallets:History:Read',
        'Wallets:Transactions:Read', 'Wallets:Transfers:Read',
        'Auth:Users:Read', 'Organization:Read'
      ],
      effect: 'Allow',
      color: 'text-gray-600'
    },
    {
      id: 'key_manager',
      name: 'Key Manager',
      description: 'Manage cryptographic keys and signatures',
      category: 'Key Management',
      icon: <Key className="h-5 w-5" />,
      operations: [
        'Keys:Create', 'Keys:Read', 'Keys:Update', 'Keys:Delete',
        'Keys:Signatures:Create', 'Keys:Signatures:Read',
        'Keys:Export', 'Keys:Import', 'Keys:Delegate',
        'Auth:Credentials:Create', 'Auth:Credentials:Read', 'Auth:Credentials:Update'
      ],
      effect: 'Allow',
      color: 'text-orange-600'
    },
    {
      id: 'analyst',
      name: 'Analyst',
      description: 'Read-only access for reporting and analytics',
      category: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      operations: [
        'Auth:Users:Read', 'Auth:ServiceAccounts:Read', 'Auth:PersonalAccessTokens:Read',
        'Wallets:Read', 'Wallets:Assets:Read', 'Wallets:History:Read',
        'Wallets:Transactions:Read', 'Wallets:Transfers:Read',
        'Permissions:Read', 'Permissions:Assignments:Read',
        'Policies:Read', 'Organization:Read'
      ],
      effect: 'Allow',
      color: 'text-cyan-600'
    },
    {
      id: 'operator',
      name: 'Operator',
      description: 'Day-to-day operational access to wallets and transactions',
      category: 'Operations',
      icon: <Settings className="h-5 w-5" />,
      operations: [
        'Wallets:Read', 'Wallets:Update',
        'Wallets:Transactions:Create', 'Wallets:Transactions:Read',
        'Wallets:Transfers:Create', 'Wallets:Transfers:Read',
        'Wallets:Assets:Read', 'Wallets:History:Read'
      ],
      effect: 'Allow',
      color: 'text-indigo-600'
    }
  ]);

  const [filteredTemplates, setFilteredTemplates] = useState<RoleTemplate[]>(templates);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    template: RoleTemplate | null;
  }>({ open: false, template: null });

  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    template: RoleTemplate | null;
  }>({ open: false, template: null });

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

  // Filter templates based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTemplates(filtered);
    }
  }, [searchTerm, templates]);

  const handleCreatePermissionFromTemplate = async (template: RoleTemplate) => {
    if (!dfnsService) return;

    try {
      setActionLoading(`create-${template.id}`);
      const permissionService = dfnsService.getPermissionService();

      const request: DfnsCreatePermissionRequest = {
        name: `${template.name} Role`,
        description: template.description,
        category: template.category,
        operations: template.operations,
        effect: template.effect
      };

      const newPermission = await permissionService.createPermission(request, {
        autoActivate: true,
        syncToDatabase: true,
        validateOperations: true
      });

      setCreateDialog({ open: false, template: null });
      setError(`Permission "${newPermission.name}" created successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Failed to create permission from template:', error);
      setError(`Failed to create permission: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openDetailsDialog = (template: RoleTemplate) => {
    setDetailsDialog({ open: true, template });
  };

  const openCreateDialog = (template: RoleTemplate) => {
    setCreateDialog({ open: true, template });
  };

  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'administrative': return 'bg-purple-100 text-purple-800';
      case 'wallet management': return 'bg-green-100 text-green-800';
      case 'user management': return 'bg-blue-100 text-blue-800';
      case 'security': return 'bg-red-100 text-red-800';
      case 'service account': return 'bg-gray-100 text-gray-800';
      case 'key management': return 'bg-orange-100 text-orange-800';
      case 'analytics': return 'bg-cyan-100 text-cyan-800';
      case 'operations': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error && !error.includes('successfully')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5" />
            <span>Role Templates</span>
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
                <Crown className="h-5 w-5" />
                <span>Role Templates</span>
              </CardTitle>
              <CardDescription>
                Predefined permission templates for common enterprise roles ({filteredTemplates.length} templates)
              </CardDescription>
              {error && error.includes('successfully') && (
                <div className="mt-2 text-sm text-green-600">{error}</div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search role templates by name, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {searchTerm ? 'No role templates found matching your search.' : 'No role templates available.'}
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={template.color}>
                          {template.icon}
                        </div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="mb-4 min-h-[3rem]">
                      {template.description}
                    </CardDescription>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Operations</div>
                        <div className="text-sm text-muted-foreground">
                          {template.operations.length} operations
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.operations.slice(0, 3).join(', ')}
                          {template.operations.length > 3 && ` +${template.operations.length - 3} more`}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Effect</div>
                        <Badge variant={template.effect === 'Allow' ? 'default' : 'destructive'}>
                          {template.effect}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailsDialog(template)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openCreateDialog(template)}
                        disabled={!!actionLoading}
                        className="flex-1"
                      >
                        {actionLoading === `create-${template.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Template Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => 
        setDetailsDialog({ open, template: null })
      }>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {detailsDialog.template && (
                <>
                  <div className={detailsDialog.template.color}>
                    {detailsDialog.template.icon}
                  </div>
                  <span>{detailsDialog.template.name} Role Template</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Detailed information about the role template
            </DialogDescription>
          </DialogHeader>
          {detailsDialog.template && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Badge variant="secondary" className={getCategoryColor(detailsDialog.template.category) + " mt-1"}>
                    {detailsDialog.template.category}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Effect</label>
                  <Badge 
                    variant={detailsDialog.template.effect === 'Allow' ? 'default' : 'destructive'} 
                    className="mt-1"
                  >
                    {detailsDialog.template.effect}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground mt-1">{detailsDialog.template.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Operations ({detailsDialog.template.operations.length})</label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {detailsDialog.template.operations.map((operation, index) => (
                      <Badge key={index} variant="secondary" className="text-xs justify-start">
                        {operation}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDetailsDialog({ open: false, template: null })}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (detailsDialog.template) {
                  setDetailsDialog({ open: false, template: null });
                  openCreateDialog(detailsDialog.template);
                }
              }}
              disabled={!!actionLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Permission Dialog */}
      <Dialog open={createDialog.open} onOpenChange={(open) => 
        setCreateDialog({ open, template: null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Permission from Template</DialogTitle>
            <DialogDescription>
              This will create a new DFNS permission based on the "{createDialog.template?.name}" role template.
            </DialogDescription>
          </DialogHeader>
          {createDialog.template && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={createDialog.template.color}>
                    {createDialog.template.icon}
                  </div>
                  <span className="font-medium">{createDialog.template.name}</span>
                  <Badge variant="secondary" className={getCategoryColor(createDialog.template.category)}>
                    {createDialog.template.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{createDialog.template.description}</p>
                <div className="text-sm">
                  <strong>Operations:</strong> {createDialog.template.operations.length}
                  <br />
                  <strong>Effect:</strong> {createDialog.template.effect}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                The permission will be created with the name "{createDialog.template.name} Role" and can be modified after creation.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDialog({ open: false, template: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (createDialog.template) {
                  handleCreatePermissionFromTemplate(createDialog.template);
                }
              }}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
