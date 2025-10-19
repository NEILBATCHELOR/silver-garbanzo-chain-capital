import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Shield, AlertCircle, Wallet } from "lucide-react";
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

// Import only existing multi-sig components
import {
  MultiSigRoleManager,
  RoleCreationForm,
  RoleOwnerManager
} from "@/components/wallet/multisig";

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
  
  // State for wallet selection
  const [multiSigWallets, setMultiSigWallets] = useState<MultiSigWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);

  // Load multi-sig wallets on mount
  useEffect(() => {
    loadMultiSigWallets();
  }, []);

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

  const selectedWallet = multiSigWallets.find(w => w.id === selectedWalletId);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Investor Wallet Operations</h1>
          <p className="text-muted-foreground">
            Manage and generate wallets for investors
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate("/compliance/operations/dashboard")}
        >
          Back to Operations
        </Button>
      </div>

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="bulk">Bulk Wallet Generation</TabsTrigger>
          <TabsTrigger value="multisig" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role-Based Multi-sig
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
            <AlertTitle>Role-Based Multi-Signature System</AlertTitle>
            <AlertDescription>
              This system links organizational roles to blockchain addresses for multi-sig wallet ownership.
              Create roles, generate their blockchain addresses, and then assign roles to multi-sig wallets.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="roles">Role Management</TabsTrigger>
              <TabsTrigger value="addresses">Role Addresses</TabsTrigger>
              <TabsTrigger value="owners">Wallet Owners</TabsTrigger>
            </TabsList>

            {/* Role Creation Tab */}
            <TabsContent value="roles" className="space-y-6">
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
            </TabsContent>

            {/* Role Addresses Tab */}
            <TabsContent value="addresses" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Role Addresses</CardTitle>
                  <CardDescription>
                    Generate blockchain addresses for roles. This is typically done in the Edit Role modal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Navigate to User Management → Roles to edit a role and generate blockchain addresses.
                      Each role can have one address per blockchain network (Ethereum, Polygon, etc.).
                    </AlertDescription>
                  </Alert>
                  <div className="mt-4 flex justify-center">
                    <Button 
                      onClick={() => navigate('/user-management/roles')}
                    >
                      Go to Role Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Wallet Owners Tab */}
            <TabsContent value="owners" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Roles to Wallets</CardTitle>
                  <CardDescription>
                    Link organizational roles as owners of multi-sig wallets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Wallet Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Select Multi-Sig Wallet
                    </label>
                    {isLoadingWallets ? (
                      <div className="text-sm text-muted-foreground">Loading wallets...</div>
                    ) : multiSigWallets.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No multi-sig wallets found. Create one in the Wallet Management page.
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
                  </div>

                  {/* Role Owner Manager */}
                  {selectedWallet ? (
                    <RoleOwnerManager
                      walletId={selectedWallet.id}
                      walletName={selectedWallet.name}
                      threshold={selectedWallet.threshold}
                      blockchain={selectedWallet.blockchain}
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please select a wallet to manage its role-based owners.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
