import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, FileSignature, Settings } from 'lucide-react';
import { MultiSigWalletForm } from './MultiSigWalletForm';
import { MultiSigTransactionProposal } from './MultiSigTransactionProposal';
import { MultiSigTransactionList } from './MultiSigTransactionList';
import { MultiSigRoleManager } from './MultiSigRoleManager';

interface MultiSigManagerProps {
  projectId?: string;
  walletId?: string;
  walletAddress?: string;
  blockchain?: string;
  defaultTab?: 'create' | 'transactions' | 'roles';
}

export function MultiSigManager({
  projectId,
  walletId,
  walletAddress,
  blockchain = 'ethereum',
  defaultTab = 'transactions'
}: MultiSigManagerProps) {
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [currentWalletId, setCurrentWalletId] = useState(walletId);
  const [currentWalletAddress, setCurrentWalletAddress] = useState(walletAddress);

  const handleWalletCreated = (address: string, txHash: string) => {
    setCurrentWalletAddress(address);
    // TODO: Query database for wallet ID after creation
    setSelectedTab('transactions');
  };

  const handleProposalCreated = (proposalId: string) => {
    // Proposal created, stay on transactions tab to see it
  };

  // If no wallet is set, show creation form
  if (!currentWalletId || !currentWalletAddress) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Multi-Signature Wallet
            </CardTitle>
            <CardDescription>
              Secure multi-signature wallet management for your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiSigWalletForm
              projectId={projectId}
              onSuccess={handleWalletCreated}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Multi-Signature Wallet Manager
          </CardTitle>
          <CardDescription>
            Manage transactions, signatures, and roles for your multi-sig wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab as any}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6 space-y-6">
              {/* Create Proposal Section */}
              <MultiSigTransactionProposal
                walletId={currentWalletId}
                walletAddress={currentWalletAddress}
                blockchain={blockchain}
                onSuccess={handleProposalCreated}
              />

              {/* Transaction List */}
              <MultiSigTransactionList
                walletId={currentWalletId}
                walletAddress={currentWalletAddress}
              />
            </TabsContent>

            <TabsContent value="roles" className="mt-6">
              <MultiSigRoleManager
                walletAddress={currentWalletAddress}
                blockchain={blockchain}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Settings</CardTitle>
                  <CardDescription>
                    Configure your multi-sig wallet settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Wallet Address:</span>
                        <p className="font-mono break-all">{currentWalletAddress}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Network:</span>
                        <p className="capitalize">{blockchain}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      More wallet configuration options coming soon...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default MultiSigManager;
