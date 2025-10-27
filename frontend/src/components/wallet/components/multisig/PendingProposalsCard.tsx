/**
 * Pending Proposals Card Component
 * Displays and manages pending multi-sig transfer proposals
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  multiSigApprovalService,
  type ProposalWithSignatures
} from '@/services/wallet/multiSig/MultiSigApprovalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ExternalLink,
  UserCheck,
  Send,
  Link as LinkIcon,
  Circle
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { BlockchainExplorerService, getChainId } from '@/infrastructure/web3/utils';

// ============================================================================
// INTERFACES
// ============================================================================

interface PendingProposalsCardProps {
  walletId: string;
  userAddressId: string; // Current user's address ID for signing
  onProposalExecuted?: (proposalId: string, txHash: string) => void;
  refreshInterval?: number; // Auto-refresh interval in ms
}

interface ProposalAction {
  type: 'approve' | 'execute';
  proposalId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PendingProposalsCard: React.FC<PendingProposalsCardProps> = ({
  walletId,
  userAddressId,
  onProposalExecuted,
  refreshInterval = 30000 // 30 seconds
}) => {
  // State
  const [proposals, setProposals] = useState<ProposalWithSignatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ProposalAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchProposals = async () => {
    try {
      setError(null);
      const data = await multiSigApprovalService.getPendingProposals(walletId);
      setProposals(data);
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProposals();
  }, [walletId]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchProposals, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [walletId, refreshInterval]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleApprove = async (proposalId: string) => {
    setActiveAction({ type: 'approve', proposalId });
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await multiSigApprovalService.approveProposal(
        proposalId,
        userAddressId
      );

      if (!result.success) {
        throw new Error(result.error || 'Approval failed');
      }

      setActionSuccess('Proposal approved successfully!');
      
      // Refresh proposals
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to approve proposal:', err);
      setActionError(err.message || 'Failed to approve proposal');
    } finally {
      setActiveAction(null);
    }
  };

  const handleExecute = async (proposalId: string) => {
    setActiveAction({ type: 'execute', proposalId });
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await multiSigApprovalService.executeProposal(proposalId);

      if (!result.success) {
        throw new Error(result.error || 'Execution failed');
      }

      setActionSuccess(
        `Transaction executed! Hash: ${result.transactionHash?.slice(0, 10)}...`
      );

      // Notify parent
      if (onProposalExecuted && result.transactionHash) {
        onProposalExecuted(proposalId, result.transactionHash);
      }

      // Refresh proposals
      await fetchProposals();
    } catch (err: any) {
      console.error('Failed to execute proposal:', err);
      setActionError(err.message || 'Failed to execute proposal');
    } finally {
      setActiveAction(null);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStatusBadge = (proposal: ProposalWithSignatures) => {
    // Show executed status if on-chain
    if (proposal.executionHash) {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Executed On-Chain
        </Badge>
      );
    }

    // Show submitted to blockchain status
    if (proposal.onChainTxId !== null && proposal.onChainTxId !== undefined) {
      return (
        <Badge variant="default" className="bg-blue-600">
          <LinkIcon className="mr-1 h-3 w-3" />
          On-Chain TX #{proposal.onChainTxId}
        </Badge>
      );
    }

    // Show ready to execute (threshold met)
    if (proposal.canExecute) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="mr-1 h-3 w-3" />
          Ready to Execute
        </Badge>
      );
    }

    // Show pending signatures
    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" />
        Pending ({proposal.signaturesCollected}/{proposal.signaturesRequired})
      </Badge>
    );
  };

  const formatAmount = (value: string, symbol: string) => {
    try {
      const eth = ethers.formatEther(value);
      return `${parseFloat(eth).toLocaleString()} ${symbol}`;
    } catch {
      return `${value} ${symbol}`;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isActionActive = (proposalId: string, actionType: 'approve' | 'execute') => {
    return activeAction?.proposalId === proposalId && activeAction?.type === actionType;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading proposals...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pending Proposals</CardTitle>
        <CardDescription>
          Review and approve transfer proposals from this multi-sig wallet
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Action Status Alerts */}
        {actionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {actionSuccess && (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              {actionSuccess}
            </AlertDescription>
          </Alert>
        )}

        {/* Proposals List */}
        {proposals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No pending proposals</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new transfer proposal to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <Card key={proposal.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      {proposal.description && (
                        <CardDescription className="text-sm">
                          {proposal.description}
                        </CardDescription>
                      )}
                    </div>
                    {getStatusBadge(proposal)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Transfer Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">To:</span>
                      {proposal.toWalletName ? (
                        <div className="mt-1">
                          <p className="font-semibold">{proposal.toWalletName}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {formatAddress(proposal.toAddress)}
                          </p>
                        </div>
                      ) : (
                        <p className="font-mono mt-1">
                          {formatAddress(proposal.toAddress)}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-semibold mt-1">
                        {formatAmount(proposal.value, proposal.tokenSymbol || 'ETH')}
                      </p>
                    </div>
                  </div>

                  {/* Token Info (if ERC20) */}
                  {proposal.tokenAddress && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Token Address:</span>
                      <p className="font-mono text-xs mt-1">
                        {proposal.tokenAddress}
                      </p>
                    </div>
                  )}

                  {/* ============================================ */}
                  {/* PHASE 4: ON-CHAIN STATUS (NEW) */}
                  {/* ============================================ */}
                  {(proposal.onChainTxId !== null || proposal.executionHash) && (
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                        Blockchain Status
                      </div>

                      {/* On-Chain Transaction ID */}
                      {proposal.onChainTxId !== null && proposal.onChainTxId !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">On-Chain TX ID:</span>
                          <Badge variant="outline" className="font-mono">
                            #{proposal.onChainTxId}
                          </Badge>
                        </div>
                      )}

                      {/* Execution Transaction Hash */}
                      {proposal.executionHash && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Execution TX:</span>
                            <span className="font-mono text-xs">
                              {proposal.executionHash.slice(0, 10)}...{proposal.executionHash.slice(-8)}
                            </span>
                          </div>
                          {proposal.executionHash && proposal.blockchain && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                // Get chain ID from blockchain name (e.g., 'ethereum' -> 1)
                                const chainId = getChainId(proposal.blockchain!.toLowerCase());
                                if (chainId) {
                                  BlockchainExplorerService.openTransaction(chainId, proposal.executionHash!);
                                } else {
                                  console.warn(`Unknown blockchain: ${proposal.blockchain}`);
                                }
                              }}
                            >
                              <ExternalLink className="mr-2 h-3 w-3" />
                              View on Explorer
                            </Button>
                          )}
                        </div>
                      )}

                      {/* On-Chain Confirmation Progress */}
                      {proposal.onChainTxId !== null && !proposal.executionHash && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">On-Chain Confirmations</span>
                            <span className="font-medium">
                              {proposal.onChainConfirmations || 0} / {proposal.signaturesRequired}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all"
                              style={{
                                width: `${((proposal.onChainConfirmations || 0) / proposal.signaturesRequired) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ============================================ */}

                  {/* Signatures Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Signatures</span>
                      <span className="font-medium">
                        {proposal.signaturesCollected} / {proposal.signaturesRequired}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          proposal.canExecute ? "bg-green-500" : "bg-primary"
                        )}
                        style={{
                          width: `${(proposal.signaturesCollected / proposal.signaturesRequired) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Signatures List */}
                  {proposal.signatures.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Approved by:</span>
                      <div className="space-y-1">
                        {proposal.signatures.map((sig) => (
                          <div
                            key={sig.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <UserCheck className="h-3 w-3 text-green-600 flex-shrink-0" />
                            <span className="font-medium">{sig.signerName}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-mono text-muted-foreground">
                              {sig.signerAddress.slice(0, 6)}...{sig.signerAddress.slice(-4)}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {new Date(sig.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {!proposal.canExecute && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(proposal.id)}
                        disabled={!!activeAction}
                        className="flex-1"
                      >
                        {isActionActive(proposal.id, 'approve') && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <UserCheck className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    )}

                    {proposal.canExecute && (
                      <Button
                        size="sm"
                        onClick={() => handleExecute(proposal.id)}
                        disabled={!!activeAction}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isActionActive(proposal.id, 'execute') && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Send className="mr-2 h-4 w-4" />
                        Execute Transaction
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/proposals/${proposal.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Metadata */}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Created {new Date(proposal.createdAt).toLocaleDateString()}</span>
                    <span className="font-mono">ID: {proposal.id.slice(0, 8)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProposals}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
