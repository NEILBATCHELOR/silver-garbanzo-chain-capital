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
  Calendar,
  Trash2,
  ArrowRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  multiSigProposalService,
  type MultiSigProposal 
} from '@/services/wallet/multiSig';
import { enhancedProposalService, type EnhancedProposalDetails } from '@/services/wallet/multiSig/EnhancedProposalService';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/infrastructure/database/client';
import { cn } from '@/utils/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [proposals, setProposals] = useState<EnhancedProposalDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signingTxId, setSigningTxId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load user's address
  useEffect(() => {
    const loadUserAddress = async () => {
      if (!user) {
        setUserAddress(null);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('user_addresses')
          .select('address')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        setUserAddress(data?.address?.toLowerCase() || null);
      } catch (err) {
        console.error('Failed to load user address:', err);
        setUserAddress(null);
      }
    };
    
    loadUserAddress();
  }, [user]);

  const loadProposals = useCallback(async () => {
    try {
      setError(null);
      const data = await enhancedProposalService.getEnhancedProposalsForWallet(walletId);
      
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
  }, [walletId]);

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
      
      // Get the user's active address from user_addresses table
      const { data: userAddressData, error: addressError } = await supabase
        .from('user_addresses')
        .select('address')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (addressError || !userAddressData?.address) {
        throw new Error('Could not determine signer address. Please ensure you have an active wallet address.');
      }
      
      const userAddress = userAddressData.address;
      
      // Verify user is an owner of this wallet
      const { data: ownerData, error: ownerError } = await supabase
        .from('multi_sig_wallet_owners')
        .select('id')
        .eq('wallet_id', walletId)
        .eq('user_id', user.id)
        .single();
      
      if (ownerError || !ownerData) {
        throw new Error('You are not an owner of this wallet');
      }
      
      // Get current proposal state
      const proposal = await multiSigProposalService.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      
      // Check if proposal is already on-chain
      if (proposal.submittedOnChain && proposal.onChainTxId !== undefined) {
        // Proposal is on-chain, confirm it
        toast({
          title: 'Confirming on-chain',
          description: 'Submitting confirmation to smart contract...',
        });
        
        await multiSigProposalService.confirmOnChain(proposalId, userAddress);
        
        toast({
          title: 'Success',
          description: 'Transaction confirmed on-chain successfully',
        });
      } else {
        // Proposal not on-chain yet, add off-chain signature first
        toast({
          title: 'Signing proposal',
          description: 'Adding your signature...',
        });
        
        await multiSigProposalService.signProposal(proposalId, userAddress);
        
        // Reload to get updated signature count
        const updatedProposal = await multiSigProposalService.getProposal(proposalId);
        
        // Check if threshold is met after adding signature
        if (updatedProposal && 
            updatedProposal.signaturesCollected >= updatedProposal.signaturesRequired) {
          
          toast({
            title: 'Threshold met',
            description: 'Submitting transaction to smart contract...',
          });
          
          // Submit to contract (auto-confirms for the submitter)
          const { onChainTxId, transactionHash } = await multiSigProposalService.submitToContract(proposalId);
          
          toast({
            title: 'Transaction submitted on-chain',
            description: `Transaction ID: ${onChainTxId}. Other owners can now confirm on-chain.`,
            duration: 5000,
          });
        } else {
          toast({
            title: 'Success',
            description: `Signature added (${updatedProposal?.signaturesCollected}/${updatedProposal?.signaturesRequired})`,
          });
        }
      }
      
      // Reload proposals to show updated state
      await loadProposals();
      
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
  const handleDelete = async (proposalId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete proposals',
        variant: 'destructive'
      });
      return;
    }

    // Get proposal to check if it can be deleted
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) {
      toast({
        title: 'Error',
        description: 'Proposal not found',
        variant: 'destructive'
      });
      return;
    }

    // Check if proposal has been executed
    if (proposal.executedAt || proposal.status === 'executed') {
      toast({
        title: 'Error',
        description: 'Cannot delete executed proposals',
        variant: 'destructive'
      });
      return;
    }

    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingTxId(proposalId);
      
      await multiSigProposalService.deleteProposal(proposalId);
      
      toast({
        title: 'Success',
        description: 'Proposal deleted successfully',
      });
      
      // Reload proposals
      await loadProposals();
      
    } catch (err: any) {
      console.error('Failed to delete proposal:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete proposal',
        variant: 'destructive'
      });
    } finally {
      setDeletingTxId(null);
    }
  };

  const copyToClipboard = async (text: string, label: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'submitted':
        return <FileSignature className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, proposal: EnhancedProposalDetails) => {
    const isExpired = new Date(proposal.expiresAt) < new Date();
    
    if (status === 'executed') {
      return (
        <Badge className="bg-green-500 text-white">
          Executed
        </Badge>
      );
    }
    
    if (isExpired && status !== 'executed') {
      return (
        <Badge variant="destructive">
          Expired
        </Badge>
      );
    }
    
    if (status === 'submitted') {
      return (
        <Badge className="bg-blue-500 text-white">
          On-Chain (Awaiting Confirmations)
        </Badge>
      );
    }
    
    if (status === 'pending') {
      return (
        <Badge variant="secondary">
          Collecting Signatures
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="capitalize">
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

  const formatAddress = (address: string, name?: string) => {
    if (name) {
      return (
        <div>
          <div className="font-medium">{name}</div>
          <div className="font-mono text-xs text-muted-foreground break-all">
            {address}
          </div>
        </div>
      );
    }
    
    return (
      <div className="font-mono text-xs break-all">
        {address}
      </div>
    );
  };

  const getBlockExplorerUrl = (txHash: string, blockchain: string) => {
    const explorers: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx/',
      sepolia: 'https://sepolia.etherscan.io/tx/',
      holesky: 'https://holesky.etherscan.io/tx/',
      hoodi: 'https://hoodi.etherscan.io/tx/',
      polygon: 'https://polygonscan.com/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      base: 'https://basescan.org/tx/',
    };
    
    const baseUrl = explorers[blockchain.toLowerCase()] || explorers.ethereum;
    return `${baseUrl}${txHash}`;
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

  // Categorize proposals
  const pendingProposals = proposals.filter(
    p => (p.status === 'pending' || p.status === 'submitted' || p.status === 'signed') && new Date(p.expiresAt) > new Date()
  );
  const completedProposals = proposals.filter(p => p.status === 'executed');
  const expiredProposals = proposals.filter(
    p => new Date(p.expiresAt) < new Date() && p.status !== 'executed'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Multi-Sig Transactions</h3>
          <p className="text-sm text-muted-foreground font-mono break-all">
            Wallet: {walletAddress}
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
            <p className="text-muted-foreground">No transactions found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new transaction proposal to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Transactions */}
          {pendingProposals.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Transactions ({pendingProposals.length})
              </h4>
              {pendingProposals.map((proposal) => renderProposal(proposal, 'pending'))}
            </div>
          )}

          {/* Completed Transactions */}
          {completedProposals.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completed Transactions ({completedProposals.length})
              </h4>
              {completedProposals.map((proposal) => renderProposal(proposal, 'completed'))}
            </div>
          )}

          {/* Expired Transactions */}
          {expiredProposals.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Expired Proposals ({expiredProposals.length})
              </h4>
              {expiredProposals.map((proposal) => renderProposal(proposal, 'expired'))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  function renderProposal(proposal: EnhancedProposalDetails, category: 'pending' | 'completed' | 'expired') {    const isExpired = category === 'expired';
    const isSigning = signingTxId === proposal.id;
    
    // Check if current user has already signed this proposal
    const hasUserSigned = userAddress 
      ? proposal.signers.some(s => s.address.toLowerCase() === userAddress)
      : false;
    
    const canSign = category === 'pending' && !hasUserSigned;
    
    return (
      <Card key={proposal.id} className={cn(
        category === 'expired' && "opacity-75"
      )}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(proposal.status)}
              <CardTitle className="text-base">
                {proposal.isTokenTransfer 
                  ? `Transfer ${proposal.valueFormatted}`
                  : proposal.isContractCall
                  ? 'Contract Interaction'
                  : `Transfer ${proposal.valueFormatted}`
                }
              </CardTitle>
            </div>
            {getStatusBadge(proposal.status, proposal)}
          </div>
          <CardDescription className="flex flex-col gap-1 text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {new Date(proposal.createdAt).toLocaleString()}
              {proposal.createdBy && (
                <span className="text-muted-foreground">
                  by {proposal.createdBy.userName || proposal.createdBy.userEmail || 'Unknown'}
                </span>
              )}
            </span>
            {!isExpired && category === 'pending' && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeRemaining(new Date(proposal.expiresAt))}
              </span>
            )}
            <span className="flex items-center gap-1 capitalize">
              <span className="font-medium">Chain:</span>
              {proposal.blockchain}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transaction Flow */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">From</div>
                {formatAddress(proposal.fromAddress, proposal.fromWalletName)}
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">To</div>
                {formatAddress(proposal.toAddress, proposal.toWalletName)}
              </div>
            </div>
            
            {/* Amount Display */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-semibold text-lg">
                  {proposal.valueFormatted}
                </span>
              </div>
              {proposal.isTokenTransfer && proposal.tokenAddress && (
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Token Address:</span>
                  <span className="font-mono">{proposal.tokenAddress.slice(0, 10)}...{proposal.tokenAddress.slice(-8)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Hashes */}
          <div className="space-y-2 text-sm">
            {/* Proposal Hash (Internal) */}
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Proposal ID:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
                  {proposal.proposalHash}
                </code>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(proposal.proposalHash, 'Proposal hash', `hash-${proposal.id}`)}
                      >
                        {copiedId === `hash-${proposal.id}` ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy hash</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* On-Chain Transaction Hash (when submitted) */}
            {proposal.onChainTxHash && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Submission TX:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
                    {proposal.onChainTxHash}
                  </code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyToClipboard(proposal.onChainTxHash!, 'Transaction hash', `tx-${proposal.id}`)}
                        >
                          {copiedId === `tx-${proposal.id}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy hash</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => window.open(getBlockExplorerUrl(proposal.onChainTxHash!, proposal.blockchain), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* On-Chain Transaction ID */}
            {proposal.onChainTxId !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On-Chain TX ID:</span>
                <Badge variant="outline" className="font-mono">
                  #{proposal.onChainTxId}
                </Badge>
              </div>
            )}

            {/* Execution Hash */}
            {proposal.executionHash && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Execution TX:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all flex-1">
                    {proposal.executionHash}
                  </code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyToClipboard(proposal.executionHash!, 'Execution hash', `exec-${proposal.id}`)}
                        >
                          {copiedId === `exec-${proposal.id}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy hash</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => window.open(getBlockExplorerUrl(proposal.executionHash!, proposal.blockchain), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Contract Data (if present) */}
          {proposal.data && proposal.isContractCall && (
            <div>
              <span className="text-muted-foreground text-sm">Contract Call Data:</span>
              <div className="font-mono text-xs break-all bg-muted p-2 rounded mt-1 max-h-24 overflow-y-auto">
                {proposal.data.slice(0, 200)}
                {proposal.data.length > 200 && '...'}
              </div>
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
                className={cn(
                  "h-2 rounded-full transition-all",
                  proposal.signaturesCollected >= proposal.signaturesRequired
                    ? 'bg-green-500'
                    : 'bg-primary'
                )}
                style={{ 
                  width: `${(proposal.signaturesCollected / proposal.signaturesRequired) * 100}%` 
                }}
              />
            </div>

            {/* Signer Details */}
            {proposal.signers.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Signers:</div>
                {proposal.signers.map((signer, idx) => (
                  <div key={idx} className="flex flex-col gap-2 text-xs bg-muted/50 p-3 rounded">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {(signer.userName || signer.userEmail) && (
                          <div className="space-y-0.5 mb-1">
                            {signer.userName && (
                              <div className="font-medium">
                                {signer.userName}
                              </div>
                            )}
                            {signer.userEmail && (
                              <div className="text-muted-foreground text-xs">
                                {signer.userEmail}
                              </div>
                            )}
                            {signer.userRole && (
                              <Badge variant="secondary" className="text-xs">
                                {signer.userRole}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="font-mono text-muted-foreground break-all text-xs">
                          {signer.address}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-muted-foreground">
                            Signed: {signer.signedAt && new Date(signer.signedAt).toLocaleString()}
                          </span>
                          {signer.onChainConfirmed && (
                            <Badge variant="outline" className="text-xs">
                              Confirmed On-Chain
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {hasUserSigned && !isExpired && (category === 'pending') ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>You have signed this proposal</span>
            </div>
          ) : canSign && !isExpired ? (
            <div className="flex gap-2">
              <Button
                onClick={() => handleSign(proposal.id)}
                disabled={isSigning}
                className="flex-1"
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
              {!proposal.executedAt && proposal.status !== 'executed' && (
                <Button
                  onClick={() => handleDelete(proposal.id)}
                  disabled={deletingTxId === proposal.id}
                  variant="destructive"
                  size="icon"
                >
                  {deletingTxId === proposal.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ) : isExpired && !proposal.executedAt && proposal.status !== 'executed' ? (
            <div className="space-y-2">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  This proposal has expired and can no longer be signed
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => handleDelete(proposal.id)}
                disabled={deletingTxId === proposal.id}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {deletingTxId === proposal.id ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Expired Proposal
                  </>
                )}
              </Button>
            </div>
          ) : proposal.status === 'executed' ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Transaction executed successfully on {proposal.executedAt && new Date(proposal.executedAt).toLocaleString()}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    );
  }
}

export default MultiSigTransactionList;