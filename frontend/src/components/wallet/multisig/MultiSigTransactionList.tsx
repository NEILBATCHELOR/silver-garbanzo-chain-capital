import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Eye,
  RefreshCw,
  FileSignature,
  Users,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  MultiSigTransactionService, 
  type MultiSigProposal 
} from '@/services/wallet/multiSig/MultiSigTransactionService';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/infrastructure/database/client';

interface TransactionListProps {
  walletId: string;
  walletAddress: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function MultiSigTransactionList({ 
  walletId,
  walletAddress,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: TransactionListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [proposals, setProposals] = useState<MultiSigProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingTxId, setSigningTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const multiSigService = MultiSigTransactionService.getInstance();

  const loadProposals = useCallback(async () => {
    try {
      setError(null);
      const data = await multiSigService.getProposalsForWallet(walletId);
      
      // Sort by created date (newest first)
      const sorted = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setProposals(sorted);
    } catch (err: any) {
      console.error('Failed to load proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }, [walletId, multiSigService]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadProposals();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadProposals]);

  const handleSign = async (proposalId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to sign transactions',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSigningTxId(proposalId);
      
      // Get the wallet to find user's address in the owners list
      const { data: walletData } = await supabase
        .from('multi_sig_wallets')
        .select('owners')
        .eq('id', walletId)
        .single();
      
      if (!walletData || !walletData.owners || walletData.owners.length === 0) {
        throw new Error('Could not determine signer address');
      }
      
      // Use the first owner as the signer (you may want to implement better logic here)
      const userAddress = walletData.owners[0];
      
      // Confirm on-chain
      await multiSigService.confirmOnChain(proposalId, userAddress);
      
      // Reload proposals
      await loadProposals();
      
      toast({
        title: 'Success',
        description: 'Transaction signed successfully',
      });
      
    } catch (err: any) {
      console.error('Failed to sign:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to sign transaction',
        variant: 'destructive'
      });
    } finally {
      setSigningTxId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      executed: 'default',
      pending: 'secondary',
      submitted: 'outline',
      expired: 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    
    return `${minutes}m remaining`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading proposals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pending Transactions</h3>
          <p className="text-sm text-muted-foreground">
            Multi-sig wallet: {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadProposals}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileSignature className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">No pending transactions</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new transaction proposal to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        proposals.map((proposal) => {
          const isExpired = new Date(proposal.expiresAt) < new Date();
          const canSign = proposal.status === 'pending' || proposal.status === 'submitted';
          const isSigning = signingTxId === proposal.id;
          
          return (
            <Card key={proposal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(proposal.status)}
                    <CardTitle className="text-base">
                      Transaction #{proposal.transactionHash.slice(0, 10)}...
                    </CardTitle>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>
                <CardDescription className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {new Date(proposal.createdAt).toLocaleString()}
                  </span>
                  {!isExpired && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeRemaining(new Date(proposal.expiresAt))}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Transaction Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <p className="font-mono text-xs break-all">
                      {proposal.rawTransaction.to}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Value:</span>
                    <p className="font-medium">
                      {proposal.rawTransaction.value || '0'} ETH
                    </p>
                  </div>
                </div>

                {/* Data Field (if present) */}
                {proposal.rawTransaction.data && proposal.rawTransaction.data !== '0x' && (
                  <div>
                    <span className="text-muted-foreground text-sm">Data:</span>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                      {proposal.rawTransaction.data.slice(0, 100)}
                      {proposal.rawTransaction.data.length > 100 && '...'}
                    </p>
                  </div>
                )}

                {/* Signatures Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Signatures:
                    </span>
                    <span className="font-medium">
                      {proposal.signaturesCollected} / {proposal.signaturesRequired}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        proposal.signaturesCollected >= proposal.signaturesRequired
                          ? 'bg-green-500'
                          : 'bg-primary'
                      }`}
                      style={{ 
                        width: `${(proposal.signaturesCollected / proposal.signaturesRequired) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {/* On-Chain Information */}
                {proposal.onChainTxId !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    <span>On-Chain TX ID: </span>
                    <Badge variant="outline" className="font-mono">
                      #{proposal.onChainTxId}
                    </Badge>
                  </div>
                )}

                {/* Sign Button */}
                {canSign && !isExpired ? (
                  <Button
                    onClick={() => handleSign(proposal.id)}
                    disabled={isSigning}
                    className="w-full"
                  >
                    {isSigning ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <FileSignature className="mr-2 h-4 w-4" />
                        Sign Transaction
                      </>
                    )}
                  </Button>
                ) : isExpired ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      This proposal has expired and can no longer be signed
                    </AlertDescription>
                  </Alert>
                ) : proposal.status === 'executed' ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Transaction executed successfully
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* Execution Transaction Hash */}
                {proposal.executionHash && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Execution TX:</span>
                    <a
                      href={`https://etherscan.io/tx/${proposal.executionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-500 hover:underline ml-2 text-xs break-all"
                    >
                      {proposal.executionHash}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

export default MultiSigTransactionList;
