/**
 * WrapUnwrapModal Component
 * Modal for wrapping cTokens into StataTokens or unwrapping StataTokens back to cTokens
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
import { parseUnits, formatUnits } from 'viem';
import { 
  useStataToken, 
  useWrapCToken, 
  useUnwrapStataToken,
  useStataTokenAPR 
} from '@/hooks/trade-finance';
import { toast } from 'sonner';

interface WrapUnwrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stataTokenAddress: string;
  mode: 'wrap' | 'unwrap';
}

export function WrapUnwrapModal({
  isOpen,
  onClose,
  stataTokenAddress,
  mode,
}: WrapUnwrapModalProps) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewShares, setPreviewShares] = useState<string>('0');

  const { data: stataToken } = useStataToken(stataTokenAddress);
  const { data: apr } = useStataTokenAPR(stataTokenAddress);
  const wrapMutation = useWrapCToken();
  const unwrapMutation = useUnwrapStataToken();

  // Calculate shares preview
  useEffect(() => {
    if (!amount || !stataToken) {
      setPreviewShares('0');
      return;
    }

    try {
      const amountBigInt = parseUnits(amount, 18);
      const totalAssets = BigInt(stataToken.total_assets);
      const totalShares = BigInt(stataToken.total_shares);

      if (mode === 'wrap') {
        // Calculate shares to receive: (amount * totalShares) / totalAssets
        if (totalAssets === BigInt(0)) {
          setPreviewShares(amount); // 1:1 for first deposit
        } else {
          const shares = (amountBigInt * totalShares) / totalAssets;
          setPreviewShares(formatUnits(shares, 18));
        }
      } else {
        // Calculate assets to receive: (shares * totalAssets) / totalShares
        if (totalShares === BigInt(0)) {
          setPreviewShares('0');
        } else {
          const assets = (amountBigInt * totalAssets) / totalShares;
          setPreviewShares(formatUnits(assets, 18));
        }
      }
    } catch (error) {
      setPreviewShares('0');
    }
  }, [amount, stataToken, mode]);

  const handleSubmit = async () => {
    if (!amount || !stataToken) return;

    setIsProcessing(true);
    try {
      const amountBigInt = parseUnits(amount, 18);

      if (mode === 'wrap') {
        await wrapMutation.mutateAsync({
          stataTokenAddress,
          amount: amountBigInt.toString(), // Convert bigint to string
        });
        toast.success('Successfully wrapped cTokens!');
      } else {
        await unwrapMutation.mutateAsync({
          stataTokenAddress,
          shares: amountBigInt.toString(), // Convert bigint to string
        });
        toast.success('Successfully unwrapped StataTokens!');
      }

      onClose();
      setAmount('');
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Transaction failed'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isWrap = mode === 'wrap';
  const inputLabel = isWrap ? 'cToken Amount' : 'StataToken Shares';
  const outputLabel = isWrap ? 'StataToken Shares' : 'cToken Amount';
  const buttonText = isWrap ? 'Wrap' : 'Unwrap';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isWrap ? 'Wrap cTokens' : 'Unwrap StataTokens'}
          </DialogTitle>
          <DialogDescription>
            {isWrap
              ? 'Convert your cTokens into yield-bearing StataTokens'
              : 'Convert your StataTokens back to cTokens'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Info */}
          {stataToken && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{stataToken.symbol}</span>
                <Badge variant="outline">{stataToken.commodity_type}</Badge>
              </div>
              {apr !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Current APR: {apr.toFixed(2)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Paused Warning */}
          {stataToken?.is_paused && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This StataToken is currently paused. Operations are not available.
              </AlertDescription>
            </Alert>
          )}

          {/* Input Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">{inputLabel}</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isProcessing || stataToken?.is_paused}
              min="0"
              step="0.000001"
            />
          </div>

          {/* Preview Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Output Preview */}
          <div className="space-y-2">
            <Label htmlFor="preview">{outputLabel} (Preview)</Label>
            <Input
              id="preview"
              type="text"
              value={previewShares}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-sm">
              {isWrap ? (
                <>
                  StataTokens auto-compound your rewards. You'll earn{' '}
                  {apr?.toFixed(2)}% APR with automatic reward compounding.
                </>
              ) : (
                <>
                  Unwrapping converts your StataTokens back to the underlying
                  cTokens. Any accrued rewards will be claimed automatically.
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !amount ||
              parseFloat(amount) <= 0 ||
              isProcessing ||
              stataToken?.is_paused
            }
          >
            {isProcessing && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
