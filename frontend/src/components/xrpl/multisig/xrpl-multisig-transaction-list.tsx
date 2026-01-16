/**
 * XRPL Multi-Sig Transaction List
 * Display and manage pending multi-sig transactions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSignature, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/auth/useAuth';
import { XRPLMultiSigTransactionListProps, PendingTransactionDisplay } from './types';
import { 
  xrplMultiSigService, 
  xrplMultiSigDatabaseService,
  xrplWalletService 
} from '@/services/wallet/ripple/security';
import { Wallet } from 'xrpl';

export function XRPLMultiSigTransactionList({
  projectId,
  walletAddress,
  onTransactionClick
}: XRPLMultiSigTransactionListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PendingTransactionDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingTxId, setSigningTxId] = useState<string | null>(null);
  const [userAddresses, setUserAddresses] = useState<string[]>([]);

  // Load user's XRPL addresses for signing
  useEffect(() => {
    const loadUserAddresses = async () => {
      if (!user?.id) return;

      try {
        const addresses = await xrplWalletService.getUserAddresses(user.id);
        setUserAddresses(addresses.map(a => a.address));
      } catch (error) {
        console.error('[XRPLMultiSigTransactionList] Failed to load user addresses:', error);
      }
    };

    loadUserAddresses();
  }, [user?.id]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const pending = await xrplMultiSigDatabaseService.getPendingTransactionsByWallet(
        walletAddress
      );

      setTransactions(pending as any);
    } catch (error) {
      console.error('[XRPLMultiSigTransactionList] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [projectId, walletAddress]);

  const handleSign = async (transactionId: string, transactionBlob: string) => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to sign transactions',
        variant: 'destructive'
      });
      return;
    }

    setSigningTxId(transactionId);
    try {
      // Get the multi-sig account to check which signers are authorized
      const account = await xrplMultiSigDatabaseService.getMultiSigAccount(walletAddress);
      if (!account) {
        throw new Error('Multi-sig account not found');
      }

      // Get the list of authorized signers
      const signers = await xrplMultiSigDatabaseService.getSigners(account.id);
      const signerAddresses = signers.map(s => s.signer_address);

      // Find which of user's addresses is an authorized signer
      const authorizedAddress = userAddresses.find(addr => signerAddresses.includes(addr));
      
      if (!authorizedAddress) {
        toast({
          title: 'Not Authorized',
          description: 'None of your addresses are authorized signers for this multi-sig account',
          variant: 'destructive'
        });
        return;
      }

      // Get signer wallet from user's key vault/addresses
      const signerWallet = await xrplWalletService.getSignerWallet(
        authorizedAddress,
        user.id
      );

      // Parse transaction
      const transaction = JSON.parse(transactionBlob);

      // Sign transaction - returns tx_blob string
      const signatureBlob = xrplMultiSigService.signForMultiSig(
        transaction,
        signerWallet
      );

      // Save signature
      await xrplMultiSigDatabaseService.saveSignatureSimple(
        transactionId,
        signerWallet.address,
        signatureBlob
      );

      // Get updated signatures
      const signatures = await xrplMultiSigDatabaseService.getPendingTransactionSignatures(
        transactionId
      );

      // Get total weight from signatures
      const signedAddresses = signatures.map(s => s.signer_address);
      const totalWeight = xrplMultiSigService.calculateSignatureWeight(signers.map(s => ({
        account: s.signer_address,
        weight: s.signer_weight
      })), signedAddresses);

      toast({
        title: 'Signature Added',
        description: `Transaction signed. Current weight: ${totalWeight}/${account.signer_quorum}`,
      });

      // Reload transactions
      await loadTransactions();
    } catch (error) {
      console.error('[XRPLMultiSigTransactionList] Sign error:', error);
      toast({
        title: 'Signing Failed',
        description: error instanceof Error ? error.message : 'Failed to sign transaction',
        variant: 'destructive'
      });
    } finally {
      setSigningTxId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'ready': return <CheckCircle2 className="h-4 w-4" />;
      case 'submitted': return <CheckCircle2 className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'ready': return 'default';
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Transactions</CardTitle>
        <CardDescription>
          Multi-signature transactions awaiting approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transactions.length === 0 ? (
          <Alert>
            <FileSignature className="h-4 w-4" />
            <AlertDescription>
              No pending transactions. Create a new proposal to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium capitalize">
                          {tx.transactionType.replace('_', ' ')}
                        </h4>
                        <Badge variant={getStatusVariant(tx.status)}>
                          {getStatusIcon(tx.status)}
                          <span className="ml-1 capitalize">{tx.status}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(tx.createdAt).toLocaleDateString()}
                        {tx.expiresAt && ` • Expires ${new Date(tx.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    {tx.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleSign(tx.id, tx.transactionBlob)}
                        disabled={signingTxId === tx.id}
                      >
                        {signingTxId === tx.id ? 'Signing...' : 'Sign'}
                      </Button>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Signature Weight</span>
                      <span className="font-medium">
                        {tx.currentWeight} / {tx.requiredWeight}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min((tx.currentWeight / tx.requiredWeight) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tx.signaturesCount} signature{tx.signaturesCount !== 1 ? 's' : ''} collected
                    </p>
                  </div>

                  {/* Transaction Details Preview */}
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    {tx.transactionBlob.substring(0, 100)}...
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
