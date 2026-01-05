import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { TransactionRescueService } from '@/services/transactions/transactionRescueService';
import { useToast } from '@/components/ui/use-toast';

interface TransactionRescueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: ethers.Wallet | null;
  provider: ethers.Provider | null;
  blockchain: string;
  walletAddress?: string;
  // Pass stuck transaction info from parent to avoid race conditions
  initialStuckInfo?: {
    latestNonce: number;
    pendingNonce: number;
    stuckCount: number;
    stuckNonces: number[];
    pendingTxs: Array<{ hash: string | null; nonce: number; }>;
  } | null;
  // Callback when transactions are successfully cleared
  onTransactionsCleared?: () => void;
}

interface StuckTransactionInfo {
  latestNonce: number;
  pendingNonce: number;
  stuckCount: number;
  stuckNonces: number[];
  pendingTxs: Array<{ hash: string | null; nonce: number; }>;
}

export const TransactionRescueDialog: React.FC<TransactionRescueDialogProps> = ({
  open,
  onOpenChange,
  wallet,
  provider,
  blockchain,
  walletAddress,
  initialStuckInfo,
  onTransactionsCleared
}) => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [stuckInfo, setStuckInfo] = useState<StuckTransactionInfo | null>(null);
  const [feeData, setFeeData] = useState<ethers.FeeData | null>(null);
  const [clearingProgress, setClearingProgress] = useState(0);
  const [clearingStatus, setClearingStatus] = useState<string>('');
  const [cancelledTxs, setCancelledTxs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use initialStuckInfo if provided, otherwise analyze on open
  useEffect(() => {
    console.log('🔍 [Transaction Rescue Dialog] Props received:', {
      open,
      hasWallet: !!wallet,
      hasProvider: !!provider,
      walletAddress,
      blockchain,
      hasInitialStuckInfo: !!initialStuckInfo,
      initialStuckInfo
    });
    
    if (open) {
      if (initialStuckInfo) {
        // Use provided stuck info to avoid race conditions
        console.log('✅ [Transaction Rescue Dialog] Using provided stuck info:', initialStuckInfo);
        setStuckInfo(initialStuckInfo);
        
        // Still fetch fee data for cost estimation
        if (provider) {
          provider.getFeeData().then(fees => {
            setFeeData(fees);
          }).catch(err => {
            console.error('Failed to get fee data:', err);
          });
        }
        
        // Show message if no stuck transactions
        if (initialStuckInfo.stuckCount === 0) {
          toast({
            title: "No Stuck Transactions",
            description: "All transactions have been confirmed. You're good to go!",
            variant: "default",
          });
        }
      } else if (wallet || (provider && walletAddress)) {
        // No initial info provided, perform fresh analysis
        console.log('🔍 [Transaction Rescue Dialog] No initial info, performing fresh analysis...');
        analyzeStuckTransactions();
      }
    }
  }, [open, wallet, provider, walletAddress, initialStuckInfo]);

  const analyzeStuckTransactions = async () => {
    console.log('🔍 [Transaction Rescue Dialog] Starting analysis...');
    
    if (!provider) {
      console.error('❌ [Transaction Rescue Dialog] No provider available');
      setError('No provider available');
      return;
    }

    const addressToCheck = wallet?.address || walletAddress;
    console.log('🔍 [Transaction Rescue Dialog] Address to check:', addressToCheck);
    
    if (!addressToCheck) {
      console.error('❌ [Transaction Rescue Dialog] No wallet address available');
      setError('No wallet address available');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('📡 [Transaction Rescue Dialog] Calling getStuckTransactionInfo...');
      
      // Get stuck transaction info
      const info = await TransactionRescueService.getStuckTransactionInfo(
        provider,
        addressToCheck
      );

      console.log('✅ [Transaction Rescue Dialog] Got stuck transaction info:', info);
      setStuckInfo(info);

      // Get fee data for cost estimation
      const fees = await provider.getFeeData();
      setFeeData(fees);

      if (info.stuckCount === 0) {
        toast({
          title: "No Stuck Transactions",
          description: "All transactions have been confirmed. You're good to go!",
          variant: "default",
        });
      }
    } catch (err) {
      console.error('Error analyzing stuck transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze transactions');
      toast({
        title: "Analysis Failed",
        description: "Could not check for stuck transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearStuckTransactions = async () => {
    if (!wallet || !stuckInfo || stuckInfo.stuckCount === 0) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setClearingProgress(0);
    setClearingStatus('Starting cancellation process...');
    setCancelledTxs([]);

    try {
      setClearingStatus('Clearing stuck transactions...');
      
      const cancelTxs = await TransactionRescueService.clearAllStuckTransactions(wallet, {
        gasPriceMultiplier: 1.5
      });

      // Update progress as transactions are sent
      const progressPerTx = 50 / cancelTxs.length;
      cancelTxs.forEach((tx, index) => {
        setClearingProgress(prev => prev + progressPerTx);
        setCancelledTxs(prev => [...prev, tx.hash]);
      });

      setClearingStatus('Waiting for confirmations...');
      setClearingProgress(50);

      // Wait for all confirmations
      const receipts = await Promise.all(cancelTxs.map(tx => tx.wait()));

      // Update progress as confirmations come in
      const confirmProgressPerTx = 50 / receipts.length;
      receipts.forEach((receipt, index) => {
        setClearingProgress(prev => prev + confirmProgressPerTx);
        
        if (receipt?.status !== 1) {
          console.warn(`Cancellation transaction ${index + 1} failed`);
        }
      });

      setClearingProgress(100);
      setClearingStatus('Complete!');

      toast({
        title: "Transactions Cleared!",
        description: `Successfully cleared ${cancelTxs.length} stuck transaction(s). You can now deploy normally.`,
        variant: "default",
      });

      // Notify parent that transactions were cleared
      if (onTransactionsCleared) {
        console.log('✅ [Transaction Rescue Dialog] Calling onTransactionsCleared callback');
        onTransactionsCleared();
      }

      // Refresh the analysis
      setTimeout(() => {
        analyzeStuckTransactions();
      }, 2000);

    } catch (err) {
      console.error('Error clearing stuck transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear transactions');
      toast({
        title: "Clearing Failed",
        description: "Could not clear stuck transactions. Please try again or use the command line tool.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const getExplorerUrl = (txHash: string) => {
    const explorers: Record<string, string> = {
      'hoodi': 'https://hoodi.etherscan.io',
      'polygon': 'https://polygonscan.com',
      'ethereum': 'https://etherscan.io',
      'injective': 'https://explorer.injective.network'
    };

    const baseUrl = explorers[blockchain] || explorers['hoodi'];
    return `${baseUrl}/tx/${txHash}`;
  };

  const calculateEstimatedCost = () => {
    if (!stuckInfo || !feeData || stuckInfo.stuckCount === 0) {
      return '0.00';
    }

    const gasLimit = 21000; // Standard transfer
    const gasPriceMultiplier = 1.5;
    
    let gasCost: bigint;
    if (feeData.maxFeePerGas) {
      gasCost = feeData.maxFeePerGas * BigInt(gasPriceMultiplier * 100) / 100n;
    } else if (feeData.gasPrice) {
      gasCost = feeData.gasPrice * BigInt(gasPriceMultiplier * 100) / 100n;
    } else {
      return '0.00';
    }

    const totalCost = gasCost * BigInt(gasLimit) * BigInt(stuckInfo.stuckCount);
    return ethers.formatEther(totalCost);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Transaction Rescue Utility
          </DialogTitle>
          <DialogDescription>
            Diagnose and clear stuck transactions that are blocking new deployments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Alert */}
          {isAnalyzing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Analyzing...</AlertTitle>
              <AlertDescription>
                Checking for stuck transactions on {blockchain}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Transaction Status */}
          {stuckInfo && !isAnalyzing && (
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Transaction Status</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={analyzeStuckTransactions}
                    disabled={isAnalyzing}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Latest Nonce (Mined)</p>
                    <p className="font-medium">{stuckInfo.latestNonce}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending Nonce</p>
                    <p className="font-medium">{stuckInfo.pendingNonce}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Stuck Transactions</p>
                    <p className="text-2xl font-bold">
                      {stuckInfo.stuckCount}
                    </p>
                  </div>
                  {stuckInfo.stuckCount > 0 ? (
                    <Badge variant="destructive" className="text-sm">
                      <XCircle className="h-3 w-3 mr-1" />
                      Blocking
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-sm bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Clear
                    </Badge>
                  )}
                </div>

                {stuckInfo.stuckCount > 0 && (
                  <>
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Stuck Nonces:</p>
                      <div className="flex flex-wrap gap-1">
                        {stuckInfo.stuckNonces.map(nonce => (
                          <Badge key={nonce} variant="outline" className="text-xs">
                            {nonce}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Transactions Stuck</AlertTitle>
                      <AlertDescription>
                        These stuck transactions are blocking new deployments. Each nonce represents a transaction that either has too low gas, was dropped from mempool, or is waiting for network confirmation.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>

              {/* Cost Estimation */}
              {stuckInfo.stuckCount > 0 && feeData && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="text-sm font-medium">Clearing Cost Estimate</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Gas Price (1.5x)</p>
                      <p className="font-medium">
                        {feeData.maxFeePerGas 
                          ? (parseFloat(ethers.formatUnits(feeData.maxFeePerGas, 'gwei')) * 1.5).toFixed(2)
                          : feeData.gasPrice
                          ? (parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')) * 1.5).toFixed(2)
                          : '0.00'
                        } Gwei
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gas per TX</p>
                      <p className="font-medium">21,000</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                    <p className="text-lg font-bold">
                      ~{calculateEstimatedCost()} ETH
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Each cancellation sends a 0 ETH self-transfer with higher gas to replace the stuck transaction
                  </p>
                </div>
              )}

              {/* Clearing Progress */}
              {isClearing && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <h4 className="text-sm font-medium">Clearing Transactions...</h4>
                  </div>

                  <Progress value={clearingProgress} className="h-2" />

                  <p className="text-sm text-muted-foreground">{clearingStatus}</p>

                  {cancelledTxs.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cancellation Transactions:</p>
                      {cancelledTxs.map((hash, index) => (
                        <div key={hash} className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <a
                            href={getExplorerUrl(hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {hash.slice(0, 10)}...{hash.slice(-8)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isClearing}
          >
            Close
          </Button>

          {stuckInfo && stuckInfo.stuckCount > 0 && !isClearing && (
            <Button
              variant="destructive"
              onClick={clearStuckTransactions}
              disabled={!wallet || isClearing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear {stuckInfo.stuckCount} Stuck Transaction{stuckInfo.stuckCount !== 1 ? 's' : ''}
            </Button>
          )}

          {!wallet && stuckInfo && stuckInfo.stuckCount > 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Wallet required to clear transactions. Please provide a wallet with private key access.
              </AlertDescription>
            </Alert>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};