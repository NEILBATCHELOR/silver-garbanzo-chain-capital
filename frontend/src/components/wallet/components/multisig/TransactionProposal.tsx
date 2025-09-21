/**
 * Transaction Proposal Component
 * Displays and manages multi-signature transaction proposals
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Copy,
  Share2,
  Users,
  FileText,
  TrendingUp,
  Hash,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { multiSigTransactionService } from '@/services/wallet/multiSig';
import { ChainType } from '@/services/wallet/AddressUtils';
import { format } from 'date-fns';

// ============================================================================
// INTERFACES
// ============================================================================

interface TransactionProposalProps {
  proposalId: string;
  walletId: string;
  onSign?: () => void;
  onExecute?: () => void;
  onShare?: () => void;
  isSimulation?: boolean; // For testing without real assets
}

interface ProposalDetails {
  id: string;
  walletId: string;
  transactionHash: string;
  rawTransaction: any;
  chainType: ChainType;
  status: 'pending' | 'signed' | 'executed' | 'expired' | 'rejected';
  signaturesCollected: number;
  signaturesRequired: number;
  expiresAt: Date;
  executedAt?: Date;
  executionHash?: string;
  createdBy: string;
  createdAt: Date;
}

interface Signer {
  address: string;
  hasSigned: boolean;
  signedAt?: Date;
  signature?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TransactionProposal: React.FC<TransactionProposalProps> = ({
  proposalId,
  walletId,
  onSign,
  onExecute,
  onShare,
  isSimulation = false,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signing, setSigning] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [currentUserAddress, setCurrentUserAddress] = useState<string>('');

  // Load proposal details
  useEffect(() => {
    loadProposal();
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      
      if (isSimulation) {
        // Create mock data for testing
        const mockProposal: ProposalDetails = {
          id: proposalId,
          walletId: walletId,
          transactionHash: '0x' + '0'.repeat(64),
          rawTransaction: {
            from: '0x919E5F179971e9103BF96F3CBA20D580C6B3C26a',
            to: '0x81ae5EFb5A4E733B29b7C775cA8Ad00b7B00Caf3',
            value: '1000000000000000000', // 1 ETH in wei
            data: '0x',
            chainId: 5, // Goerli testnet
          },
          chainType: ChainType.ETHEREUM,
          status: 'pending',
          signaturesCollected: 1,
          signaturesRequired: 3,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdBy: 'test-user',
          createdAt: new Date(),
        };
        
        const mockSigners: Signer[] = [
          {
            address: '0x919E5F179971e9103BF96F3CBA20D580C6B3C26a',
            hasSigned: true,
            signedAt: new Date(Date.now() - 60 * 60 * 1000),
            signature: '0x' + 'a'.repeat(130),
          },
          {
            address: '0x81ae5EFb5A4E733B29b7C775cA8Ad00b7B00Caf3',
            hasSigned: false,
          },
          {
            address: '0x7A470d8014a122245b0410774618B7ED0E990Daa',
            hasSigned: false,
          },
        ];
        
        setProposal(mockProposal);
        setSigners(mockSigners);
        setCanSign(true);
        setCurrentUserAddress(mockSigners[1].address);
      } else {
        // Load real proposal from service
        // This would integrate with the multiSigTransactionService
        // For now, we'll use placeholder data
        toast({
          title: "Loading proposal",
          description: "Fetching proposal details from blockchain...",
        });
      }
    } catch (error) {
      console.error('Failed to load proposal:', error);
      toast({
        variant: "destructive",
        title: "Failed to load proposal",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    try {
      setSigning(true);
      
      if (isSimulation) {
        // Simulate signing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update signers
        const updatedSigners = signers.map(s => {
          if (s.address === currentUserAddress) {
            return {
              ...s,
              hasSigned: true,
              signedAt: new Date(),
              signature: '0x' + 'b'.repeat(130),
            };
          }
          return s;
        });
        
        setSigners(updatedSigners);
        
        if (proposal) {
          setProposal({
            ...proposal,
            signaturesCollected: proposal.signaturesCollected + 1,
          });
        }
        
        toast({
          title: "Signature added",
          description: "Your signature has been added to the proposal",
        });
        
        setShowSignDialog(false);
        if (onSign) onSign();
      } else {
        // Real signing with multiSigTransactionService
        await multiSigTransactionService.signProposal(
          proposalId,
          currentUserAddress
        );
        
        toast({
          title: "Proposal signed",
          description: "Your signature has been recorded on-chain",
        });
        
        loadProposal(); // Reload to get updated signatures
      }
    } catch (error) {
      console.error('Failed to sign proposal:', error);
      toast({
        variant: "destructive",
        title: "Failed to sign",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setSigning(false);
    }
  };

  const handleExecute = async () => {
    if (!proposal) return;
    
    try {
      if (isSimulation) {
        toast({
          title: "Executing transaction",
          description: "Broadcasting to testnet...",
        });
        
        if (onExecute) onExecute();
      } else {
        // Real execution
        const signedTx = await multiSigTransactionService.aggregateSignatures(proposalId);
        const result = await multiSigTransactionService.broadcastMultiSig(signedTx);
        
        if (result.success) {
          toast({
            title: "Transaction executed",
            description: `Transaction hash: ${result.transactionHash}`,
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!proposal) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Proposal not found</AlertTitle>
            <AlertDescription>
              The requested proposal could not be loaded.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (proposal.signaturesCollected / proposal.signaturesRequired) * 100;
  const isExpired = new Date() > new Date(proposal.expiresAt);
  const canExecute = proposal.signaturesCollected >= proposal.signaturesRequired && !isExpired;
  const userHasSigned = signers.find(s => s.address === currentUserAddress)?.hasSigned || false;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Multi-Sig Transaction Proposal
              </CardTitle>
              <CardDescription>
                {isSimulation && (
                  <Badge variant="secondary" className="mr-2">Testnet Simulation</Badge>
                )}
                Proposal ID: {proposal.id.substring(0, 8)}...
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={proposal.status === 'pending' ? 'default' : 
                           proposal.status === 'executed' ? 'success' : 
                           'destructive'}>
                {proposal.status.toUpperCase()}
              </Badge>
              {!isExpired && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(proposal.expiresAt), 'MMM dd, HH:mm')}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expires at {format(new Date(proposal.expiresAt), 'PPpp')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">From:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs">
                      {proposal.rawTransaction.from?.substring(0, 6)}...{proposal.rawTransaction.from?.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(proposal.rawTransaction.from)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">To:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs">
                      {proposal.rawTransaction.to?.substring(0, 6)}...{proposal.rawTransaction.to?.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(proposal.rawTransaction.to)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="text-sm font-medium">
                    {(parseInt(proposal.rawTransaction.value || '0') / 1e18).toFixed(4)} ETH
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chain:</span>
                  <Badge variant="outline">{proposal.chainType}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs">
                      {proposal.transactionHash.substring(0, 8)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(proposal.transactionHash)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(proposal.createdAt), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Signature Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Signature Progress</h3>
              <span className="text-sm font-medium">
                {proposal.signaturesCollected} / {proposal.signaturesRequired} signatures
              </span>
            </div>
            
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="space-y-3">
              {signers.map((signer) => (
                <div key={signer.address} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      signer.hasSigned ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      {signer.hasSigned ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <code className="text-xs">
                        {signer.address.substring(0, 8)}...{signer.address.slice(-6)}
                      </code>
                      {signer.address === currentUserAddress && (
                        <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {signer.hasSigned && signer.signedAt
                      ? `Signed ${format(new Date(signer.signedAt), 'MMM dd, HH:mm')}`
                      : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onShare}
            disabled={proposal.status !== 'pending'}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          
          <div className="flex gap-2">
            {!userHasSigned && proposal.status === 'pending' && !isExpired && (
              <Button
                onClick={() => setShowSignDialog(true)}
                disabled={!canSign}
              >
                Sign Transaction
              </Button>
            )}
            
            {canExecute && (
              <Button
                onClick={handleExecute}
                variant="default"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Execute Transaction
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Transaction</DialogTitle>
            <DialogDescription>
              By signing, you approve this transaction. Once enough signatures are collected, the transaction can be executed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                {isSimulation ? 
                  "This is a testnet simulation. No real assets will be transferred." :
                  "This is a real transaction. Please verify all details before signing."}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Address:</span>
                <code className="text-xs">{currentUserAddress.substring(0, 10)}...</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Required Signatures:</span>
                <span>{proposal?.signaturesRequired}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Signatures:</span>
                <span>{proposal?.signaturesCollected}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing}>
              {signing ? "Signing..." : "Sign Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionProposal;