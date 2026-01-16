/**
 * XRPL Multi-Signature Manager
 * Main component for managing XRPL multi-sig accounts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, FileSignature, Users, Settings } from 'lucide-react';
import { XRPLMultiSigSetupForm } from './xrpl-multisig-setup-form';
import { XRPLMultiSigTransactionProposal } from './xrpl-multisig-transaction-proposal';
import { XRPLMultiSigTransactionList } from './xrpl-multisig-transaction-list';
import { XRPLMultiSigSignerManager } from './xrpl-multisig-signer-manager';
import { XRPLMultiSigManagerProps } from './types';
import { xrplMultiSigDatabaseService } from '@/services/wallet/ripple/security';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function XRPLMultiSigManager({
  projectId,
  walletAddress,
  defaultTab = 'transactions'
}: XRPLMultiSigManagerProps) {
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const [isMultiSigAccount, setIsMultiSigAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signerQuorum, setSignerQuorum] = useState<number>(0);

  // Check if account has multi-sig setup
  useEffect(() => {
    const checkMultiSigStatus = async () => {
      if (!walletAddress) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const account = await xrplMultiSigDatabaseService.getMultiSigAccount(
          walletAddress
        );
        
        if (account) {
          setIsMultiSigAccount(true);
          setSignerQuorum(account.signer_quorum);
        }
      } catch (error) {
        console.error('[XRPLMultiSigManager] Error checking multi-sig status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkMultiSigStatus();
  }, [projectId, walletAddress]);

  const handleSetupSuccess = (newQuorum: number) => {
    setIsMultiSigAccount(true);
    setSignerQuorum(newQuorum);
    setSelectedTab('transactions');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Multi-Sig Configuration...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletAddress) {
    return (
      <Alert>
        <AlertDescription>
          Please select or create an XRPL wallet address to manage multi-signature functionality.
        </AlertDescription>
      </Alert>
    );
  }

  // If not a multi-sig account, show setup form
  if (!isMultiSigAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Set Up Multi-Signature Account
          </CardTitle>
          <CardDescription>
            Configure your XRPL account for multi-signature transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <XRPLMultiSigSetupForm
            projectId={projectId}
            walletAddress={walletAddress}
            onSuccess={handleSetupSuccess}
          />
        </CardContent>
      </Card>
    );
  }

  // Multi-sig account exists - show full manager
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          XRPL Multi-Signature Manager
        </CardTitle>
        <CardDescription>
          Manage transactions, signatures, and signers for your XRPL multi-sig account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab as any}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="signers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Signers
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-6 space-y-6">
            {/* Create Transaction Proposal */}
            <XRPLMultiSigTransactionProposal
              projectId={projectId}
              walletAddress={walletAddress}
            />

            {/* Transaction List */}
            <XRPLMultiSigTransactionList
              projectId={projectId}
              walletAddress={walletAddress}
            />
          </TabsContent>

          <TabsContent value="signers" className="mt-6">
            <XRPLMultiSigSignerManager
              projectId={projectId}
              walletAddress={walletAddress}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Multi-signature account configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Account Address:</span>
                      <p className="font-mono break-all text-xs mt-1">{walletAddress}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Signer Quorum:</span>
                      <p className="font-semibold mt-1">{signerQuorum}</p>
                      <p className="text-xs text-muted-foreground">
                        Total signer weight required
                      </p>
                    </div>
                  </div>
                  <Alert>
                    <AlertDescription>
                      XRPL multi-signature accounts require signatures from multiple
                      authorized signers to execute transactions. The total weight of
                      signatures must meet or exceed the quorum ({signerQuorum}).
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
