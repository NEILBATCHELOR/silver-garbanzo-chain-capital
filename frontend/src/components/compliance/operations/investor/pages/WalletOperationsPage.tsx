import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BulkWalletGeneration } from "../wallets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/infrastructure/database/client";
import { OrganizationSelector, useOrganizationContext } from "@/components/organizations";
import { getPrimaryOrFirstProject } from '@/services/project/primaryProjectService';

// Import ALL multi-sig components
import {
  MultiSigManager,
  MultiSigWalletForm,
  MultiSigTransactionProposal,
  MultiSigTransactionList,
  MultiSigRoleManager,
  RoleCreationForm,
  RoleOwnerManager
} from "@/components/wallet/multisig";
import { ProjectSelector } from "@/components/wallet/components/ProjectSelector";

interface MultiSigWallet {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  threshold: number;
}

export function WalletOperationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shouldShowSelector } = useOrganizationContext();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  
  // State for project selection (for funding multi-sig deployments)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(routeProjectId || "");
  
  // State for wallet selection
  const [multiSigWallets, setMultiSigWallets] = useState<MultiSigWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load multi-sig wallets on mount
  useEffect(() => {
    loadMultiSigWallets();
  }, []);

  // Update selected project when route changes
  useEffect(() => {
    if (routeProjectId) {
      setSelectedProjectId(routeProjectId);
    }
  }, [routeProjectId]);

  // Auto-redirect to project-specific URL if no projectId in route
  useEffect(() => {
    const redirectToProject = async () => {
      // Only redirect if no projectId in URL
      if (!routeProjectId) {
        try {
          const project = await getPrimaryOrFirstProject();
          if (project) {
            // Redirect to project-specific URL
            navigate(`/compliance/operations/investor/${project.id}/wallets`, { replace: true });
          } else {
            // No projects available - let user stay on page but show message
            toast({
              title: "No Projects Found",
              description: "Please create a project first or select one from the dropdown.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error("Error finding primary project:", error);
        }
      }
    };

    redirectToProject();
  }, [routeProjectId, navigate, toast]);

  const loadMultiSigWallets = async () => {
    setIsLoadingWallets(true);
    try {
      const { data, error } = await supabase
        .from('multi_sig_wallets')
        .select('id, name, address, blockchain, threshold')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMultiSigWallets(data || []);
      
      // Auto-select first wallet if available
      if (data && data.length > 0 && !selectedWalletId) {
        setSelectedWalletId(data[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load multi-sig wallets:', error);
      toast({
        title: "Error loading wallets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingWallets(false);
    }
  };

  // Handle page refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadMultiSigWallets();
      
      toast({
        title: "Page Refreshed",
        description: "Data has been reloaded successfully",
      });
    } catch (error) {
      console.error("Error refreshing page:", error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Failed to refresh page data. Please try again.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedWallet = multiSigWallets.find(w => w.id === selectedWalletId);

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header with project selector - Matching NewWalletPage.tsx pattern */}
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Investor Wallet Operations</h1>
              <p className="text-muted-foreground">
                Manage and generate wallets for investors
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {shouldShowSelector && (
              <OrganizationSelector 
                compact={true}
                showIcon={true}
                className="w-64"
              />
            )}
            <ProjectSelector
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              compact={true}
              className="w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto py-8">
        <Tabs defaultValue="bulk" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="bulk">Bulk Wallet Generation</TabsTrigger>
            <TabsTrigger value="multisig" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Multi-sig Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Generate Wallets for Investors</CardTitle>
                <CardDescription>
                  Create Ethereum wallets for investors who don't have one yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkWalletGeneration />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="multisig" className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Complete Multi-Signature System</AlertTitle>
              <AlertDescription>
                Create wallets, manage transactions, roles, and contract permissions all in one place.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="create-wallet" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="create-wallet">Create Wallet</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              {/* 1. Create Wallet Tab - MultiSigWalletForm */}
              <TabsContent value="create-wallet" className="space-y-6">
                {/* Project Selector for Funding */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Funding Source</CardTitle>
                    <CardDescription>
                      Choose which project's wallet will pay for deployment gas costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProjectSelector
                      value={selectedProjectId}
                      onChange={setSelectedProjectId}
                      label="Funding Project"
                      description="The selected project's wallet will pay approximately 0.01 ETH in gas fees"
                    />
                  </CardContent>
                </Card>

                {/* Multi-Sig Wallet Creation Form */}
                {selectedProjectId ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Create New Multi-Sig Wallet</CardTitle>
                      <CardDescription>
                        Deploy a new multi-signature wallet contract
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MultiSigWalletForm
                        projectId={selectedProjectId}
                        onSuccess={(address) => {
                          toast({
                            title: "Multi-Sig Wallet Created",
                            description: `Deployed to ${address}`,
                          });
                          loadMultiSigWallets(); // Refresh wallet list
                        }}
                        onCancel={() => {
                          // Optional: handle cancel
                        }}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        Please select a project to fund the deployment
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 3. Transactions Tab - Proposal + List */}
              <TabsContent value="transactions" className="space-y-6">
                {/* Wallet Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Wallet for Transactions</CardTitle>
                    <CardDescription>Choose which wallet to manage transactions for</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingWallets ? (
                      <div className="text-sm text-muted-foreground">Loading wallets...</div>
                    ) : multiSigWallets.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No multi-sig wallets found. Create one in the Create Wallet tab.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a wallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {multiSigWallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{wallet.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {wallet.address.slice(0, 10)}... ({wallet.blockchain})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                {selectedWallet ? (
                  <>
                    {/* Transaction Proposal */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Propose Transaction</CardTitle>
                        <CardDescription>
                          Create a new transaction proposal for multi-sig approval
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MultiSigTransactionProposal
                          walletId={selectedWallet.id}
                          walletAddress={selectedWallet.address}
                          blockchain={selectedWallet.blockchain}
                          onSuccess={(proposalId) => {
                            toast({
                              title: "Transaction Proposed",
                              description: "Proposal created successfully",
                            });
                          }}
                        />
                      </CardContent>
                    </Card>

                    {/* Transaction List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Pending Transactions</CardTitle>
                        <CardDescription>
                          View and manage multi-sig transaction proposals
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MultiSigTransactionList
                          walletId={selectedWallet.id}
                          walletAddress={selectedWallet.address}
                        />
                      </CardContent>
                    </Card>
                  </>
                ) : null}
              </TabsContent>

              {/* 4. Roles Tab - Role Creation + Owner Management */}
              <TabsContent value="roles" className="space-y-6">
                {/* Create Role */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create Organizational Roles</CardTitle>
                    <CardDescription>
                      Define roles that will own and control multi-sig wallets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RoleCreationForm 
                      onSuccess={(roleId, roleName) => {
                        toast({
                          title: "Role Created",
                          description: `${roleName} has been created successfully`,
                        });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Wallet Owners */}
                {selectedWallet && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Assign Roles to Wallet</CardTitle>
                      <CardDescription>
                        Link organizational roles as owners of {selectedWallet.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RoleOwnerManager
                        walletId={selectedWallet.id}
                        walletName={selectedWallet.name}
                        threshold={selectedWallet.threshold}
                        blockchain={selectedWallet.blockchain}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 5. Permissions Tab - MultiSigRoleManager */}
              <TabsContent value="permissions" className="space-y-6">
                {selectedWallet ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Grant Contract Roles</CardTitle>
                      <CardDescription>
                        Grant smart contract roles to {selectedWallet.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MultiSigRoleManager
                        walletAddress={selectedWallet.address}
                        blockchain={selectedWallet.blockchain}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        Please select a wallet to manage contract permissions
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
