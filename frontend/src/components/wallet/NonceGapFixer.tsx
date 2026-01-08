/**
 * Nonce Gap Fixer Component
 * 
 * UI component to diagnose and fix nonce gaps for wallet addresses
 * Can be used in wallet management screens or transaction error dialogs
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TransactionRescueService } from '@/services/transactions/transactionRescueService';
import { getChainInfo } from '@/infrastructure/web3/utils/chainIds';

interface NonceGapFixerProps {
  address: string;
  chainId: number;
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
  onFixed?: () => void;
}

interface NonceStatus {
  confirmed: number;
  pending: number;
  hasGap: boolean;
  gapSize: number;
  balance: bigint;
  suggestedMaxFee: bigint;
  suggestedPriorityFee: bigint;
}

interface FixResult {
  nonce: number;
  status: 'pending' | 'success' | 'failed';
  hash?: string;
  error?: string;
}

export function NonceGapFixer({
  address,
  chainId,
  provider,
  wallet,
  onFixed
}: NonceGapFixerProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [nonceStatus, setNonceStatus] = useState<NonceStatus | null>(null);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const [progress, setProgress] = useState(0);

  // Automatically check status on mount
  useEffect(() => {
    console.log('🚀 [NonceGapFixer] Component mounted, automatically checking status...');
    checkNonceStatus();
  }, [address, chainId]); // Re-check when address or chainId changes

  const checkNonceStatus = async () => {
    setIsChecking(true);
    try {
      console.log('='.repeat(80));
      console.log('🔍 [NonceGapFixer] STARTING NONCE CHECK');
      console.log('Address:', address);
      console.log('Chain ID:', chainId);
      console.log('Chain Name:', chainName);
      console.log('='.repeat(80));
      
      // Step 1: Check provider connection
      console.log('📡 [NonceGapFixer] Step 1: Verifying provider connection...');
      const blockNumber = await provider.getBlockNumber();
      console.log('✅ [NonceGapFixer] Provider connected! Current block:', blockNumber);
      
      // Step 2: Check balance
      console.log('📡 [NonceGapFixer] Step 2: Checking balance...');
      const balance = await provider.getBalance(address);
      console.log('✅ [NonceGapFixer] Balance:', ethers.formatEther(balance), 'ETH');
      
      // Step 3: Use TransactionRescueService (same as PersistentTransactionStatus)
      console.log('📡 [NonceGapFixer] Step 3: Checking for stuck transactions using TransactionRescueService...');
      const stuckInfo = await TransactionRescueService.getStuckTransactionInfo(provider, address);
      console.log('✅ [NonceGapFixer] TransactionRescueService results:', {
        latestNonce: stuckInfo.latestNonce,
        pendingNonce: stuckInfo.pendingNonce,
        stuckCount: stuckInfo.stuckCount,
        stuckNonces: stuckInfo.stuckNonces,
        pendingTxs: stuckInfo.pendingTxs
      });
      
      // Step 4: Get fee data
      console.log('📡 [NonceGapFixer] Step 4: Fetching fee data...');
      const feeData = await provider.getFeeData();
      console.log('✅ [NonceGapFixer] Fee data:', {
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'N/A',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' gwei' : 'N/A',
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A'
      });

      const status: NonceStatus = {
        confirmed: stuckInfo.latestNonce,
        pending: stuckInfo.pendingNonce,
        hasGap: stuckInfo.stuckCount > 0,
        gapSize: stuckInfo.stuckCount,
        balance,
        suggestedMaxFee: (feeData.maxFeePerGas || 0n) * 2n,
        suggestedPriorityFee: (feeData.maxPriorityFeePerGas || 0n) * 2n
      };

      console.log('='.repeat(80));
      console.log('📊 [NonceGapFixer] FINAL STATUS:');
      console.log('Confirmed Nonce (latest):', status.confirmed);
      console.log('Pending Nonce:', status.pending);
      console.log('Has Gap:', status.hasGap ? 'YES ⚠️' : 'NO ✅');
      console.log('Gap Size:', status.gapSize, status.gapSize > 0 ? '⚠️ STUCK TRANSACTIONS!' : '');
      console.log('Balance:', ethers.formatEther(status.balance), 'ETH');
      console.log('Suggested Max Fee:', ethers.formatUnits(status.suggestedMaxFee, 'gwei'), 'gwei');
      console.log('Suggested Priority Fee:', ethers.formatUnits(status.suggestedPriorityFee, 'gwei'), 'gwei');
      console.log('='.repeat(80));

      setNonceStatus(status);

      if (!status.hasGap) {
        console.log('✅ [NonceGapFixer] All clear! No stuck transactions.');
        toast({
          title: 'No Issues Found',
          description: `Confirmed nonce: ${status.confirmed}, Pending nonce: ${status.pending}. No gaps detected.`,
        });
      } else {
        console.log('⚠️ [NonceGapFixer] STUCK TRANSACTIONS DETECTED!');
        toast({
          title: 'Nonce Gap Detected',
          description: `Found ${status.gapSize} stuck transaction(s) between nonce ${status.confirmed} and ${status.pending}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('='.repeat(80));
      console.error('❌ [NonceGapFixer] CHECK FAILED:');
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
      console.error('='.repeat(80));
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check nonce status',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const fixNonceGap = async () => {
    if (!nonceStatus || !nonceStatus.hasGap) return;

    setIsFixing(true);
    setProgress(0);

    const results: FixResult[] = [];
    const totalTxs = nonceStatus.gapSize;

    // Initialize results array
    for (let i = 0; i < totalTxs; i++) {
      results.push({
        nonce: nonceStatus.confirmed + i,
        status: 'pending'
      });
    }
    setFixResults(results);

    try {
      for (let i = 0; i < totalTxs; i++) {
        const nonce = nonceStatus.confirmed + i;
        
        try {
          // Send self-transfer with 0 ETH to cancel stuck nonce
          const tx = await wallet.sendTransaction({
            to: address,
            value: 0,
            nonce: nonce,
            gasLimit: 21000,
            maxFeePerGas: nonceStatus.suggestedMaxFee,
            maxPriorityFeePerGas: nonceStatus.suggestedPriorityFee,
            type: 2 // EIP-1559
          });

          // Update status to show hash
          results[i] = {
            nonce,
            status: 'pending',
            hash: tx.hash
          };
          setFixResults([...results]);

          // Wait for confirmation
          const receipt = await tx.wait(1);

          // Update to success
          results[i] = {
            nonce,
            status: 'success',
            hash: tx.hash
          };
          setFixResults([...results]);

          // Update progress
          setProgress(((i + 1) / totalTxs) * 100);

        } catch (error) {
          // Update to failed
          results[i] = {
            nonce,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Transaction failed'
          };
          setFixResults([...results]);
        }
      }

      // Check final status
      await checkNonceStatus();

      const successCount = results.filter(r => r.status === 'success').length;
      
      toast({
        title: 'Gap Fixing Complete',
        description: `Successfully cleared ${successCount} of ${totalTxs} stuck transactions.`,
      });

      if (onFixed) {
        onFixed();
      }

    } catch (error) {
      toast({
        title: 'Fix Failed',
        description: error instanceof Error ? error.message : 'Failed to fix nonce gap',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const chainInfo = getChainInfo(chainId);
  const chainName = chainInfo?.name || `Chain ${chainId}`;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Nonce Gap Fixer
        </CardTitle>
        <CardDescription>
          Diagnose and fix stuck transactions caused by nonce gaps
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Address and Chain Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Chain:</span>
            <span>{chainName}</span>
          </div>
        </div>

        {/* Check Status Button - Always visible */}
        <Button
          onClick={checkNonceStatus}
          disabled={isChecking || isFixing}
          variant="outline"
          className="w-full"
        >
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {nonceStatus ? 'Recheck' : 'Check'} Nonce Status
            </>
          )}
        </Button>

        {/* Status Display */}
        {nonceStatus && (
          <div className="space-y-4">
            <Alert variant={nonceStatus.hasGap ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {nonceStatus.hasGap ? 'Nonce Gap Detected' : 'All Clear'}
              </AlertTitle>
              <AlertDescription>
                {nonceStatus.hasGap ? (
                  <>
                    {nonceStatus.gapSize} transaction(s) stuck between nonce {nonceStatus.confirmed} and {nonceStatus.pending}
                  </>
                ) : (
                  'All transactions confirmed. No gaps detected.'
                )}
              </AlertDescription>
            </Alert>

            {/* Nonce Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Confirmed Nonce</div>
                <div className="font-mono text-lg">{nonceStatus.confirmed}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Pending Nonce</div>
                <div className="font-mono text-lg">{nonceStatus.pending}</div>
              </div>
            </div>

            {/* Balance Info */}
            <div className="text-sm">
              <div className="text-muted-foreground">Balance</div>
              <div className="font-mono">{ethers.formatEther(nonceStatus.balance)} ETH</div>
            </div>

            {/* Fix Button */}
            {nonceStatus.hasGap && (
              <div className="space-y-4">
                {nonceStatus.balance === 0n ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient balance to pay for gas. Please fund this wallet before fixing.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Button
                      onClick={fixNonceGap}
                      disabled={isFixing}
                      className="w-full"
                      variant="destructive"
                    >
                      {isFixing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Fixing... ({progress.toFixed(0)}%)
                        </>
                      ) : (
                        `Fix ${nonceStatus.gapSize} Stuck Transaction${nonceStatus.gapSize > 1 ? 's' : ''}`
                      )}
                    </Button>

                    {/* Progress Bar */}
                    {isFixing && (
                      <Progress value={progress} className="w-full" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fix Results */}
        {fixResults.length > 0 && (
          <div className="space-y-2">
            <div className="font-semibold text-sm">Transaction Results:</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {fixResults.map((result) => (
                <div
                  key={result.nonce}
                  className="flex items-center justify-between p-2 rounded-md border"
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {result.status === 'failed' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {result.status === 'pending' && (
                      <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                    <span className="font-mono text-sm">Nonce {result.nonce}</span>
                  </div>
                  <Badge variant={
                    result.status === 'success' ? 'default' :
                    result.status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
