import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ethers } from 'ethers';
import { Zap, AlertTriangle } from 'lucide-react';

interface FeeBumpButtonProps {
  transactionHash: string;
  blockchain: string;
  currentMaxFeePerGas?: string; // In Wei
  currentMaxPriorityFeePerGas?: string; // In Wei
  onBump: (newMaxFeePerGas: string, newMaxPriorityFeePerGas: string) => Promise<void>;
}

/**
 * Button to bump fees for stuck transactions
 * Implements EIP-1559 fee replacement with 10%+ increase requirement
 */
export const FeeBumpButton: React.FC<FeeBumpButtonProps> = ({
  transactionHash,
  blockchain,
  currentMaxFeePerGas,
  currentMaxPriorityFeePerGas,
  onBump
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newMaxFee, setNewMaxFee] = useState('');
  const [newPriorityFee, setNewPriorityFee] = useState('');
  const [isBumping, setIsBumping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate minimum required bump (10% increase)
  const minMaxFee = currentMaxFeePerGas 
    ? ethers.formatUnits((BigInt(currentMaxFeePerGas) * 110n) / 100n, 'gwei')
    : '0';
  const minPriorityFee = currentMaxPriorityFeePerGas
    ? ethers.formatUnits((BigInt(currentMaxPriorityFeePerGas) * 110n) / 100n, 'gwei')
    : '0';

  // Initialize with 20% increase (safer than minimum 10%)
  React.useEffect(() => {
    if (currentMaxFeePerGas && !newMaxFee) {
      const suggested = ethers.formatUnits((BigInt(currentMaxFeePerGas) * 120n) / 100n, 'gwei');
      setNewMaxFee(suggested);
    }
    if (currentMaxPriorityFeePerGas && !newPriorityFee) {
      const suggested = ethers.formatUnits((BigInt(currentMaxPriorityFeePerGas) * 120n) / 100n, 'gwei');
      setNewPriorityFee(suggested);
    }
  }, [currentMaxFeePerGas, currentMaxPriorityFeePerGas, newMaxFee, newPriorityFee]);

  const handleBump = async () => {
    setError(null);
    
    try {
      // Validate inputs
      if (!newMaxFee || !newPriorityFee) {
        throw new Error('Please enter both fee values');
      }

      const newMaxFeeWei = ethers.parseUnits(newMaxFee, 'gwei');
      const newPriorityFeeWei = ethers.parseUnits(newPriorityFee, 'gwei');

      // Validate minimum 10% increase
      if (currentMaxFeePerGas && newMaxFeeWei < (BigInt(currentMaxFeePerGas) * 110n) / 100n) {
        throw new Error(`Max Fee must be at least ${minMaxFee} Gwei (10% increase)`);
      }
      if (currentMaxPriorityFeePerGas && newPriorityFeeWei < (BigInt(currentMaxPriorityFeePerGas) * 110n) / 100n) {
        throw new Error(`Priority Fee must be at least ${minPriorityFee} Gwei (10% increase)`);
      }

      // Validate priority fee <= max fee
      if (newPriorityFeeWei > newMaxFeeWei) {
        throw new Error('Priority Fee cannot exceed Max Fee');
      }

      setIsBumping(true);
      await onBump(newMaxFeeWei.toString(), newPriorityFeeWei.toString());
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bump fees');
    } finally {
      setIsBumping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Speed Up Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Speed Up Transaction
          </DialogTitle>
          <DialogDescription>
            Increase gas fees to make your transaction process faster. Your original transaction will be replaced.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Important:</strong> Fees must be at least 10% higher than original. The new transaction uses the same nonce to replace the pending one.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-max-fee" className="text-xs text-muted-foreground">
              Current Max Fee Per Gas
            </Label>
            <Input
              id="current-max-fee"
              value={currentMaxFeePerGas ? `${ethers.formatUnits(currentMaxFeePerGas, 'gwei')} Gwei` : 'N/A'}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-max-fee">
              New Max Fee Per Gas (Gwei) *
            </Label>
            <Input
              id="new-max-fee"
              type="number"
              step="0.1"
              min={minMaxFee}
              value={newMaxFee}
              onChange={(e) => setNewMaxFee(e.target.value)}
              placeholder={`Minimum: ${minMaxFee}`}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: {minMaxFee} Gwei (10% increase)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-priority-fee" className="text-xs text-muted-foreground">
              Current Priority Fee
            </Label>
            <Input
              id="current-priority-fee"
              value={currentMaxPriorityFeePerGas ? `${ethers.formatUnits(currentMaxPriorityFeePerGas, 'gwei')} Gwei` : 'N/A'}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-priority-fee">
              New Priority Fee (Gwei) *
            </Label>
            <Input
              id="new-priority-fee"
              type="number"
              step="0.1"
              min={minPriorityFee}
              value={newPriorityFee}
              onChange={(e) => setNewPriorityFee(e.target.value)}
              placeholder={`Minimum: ${minPriorityFee}`}
            />
            <p className="text-xs text-muted-foreground">
              Minimum: {minPriorityFee} Gwei (10% increase)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isBumping}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleBump}
            disabled={isBumping || !newMaxFee || !newPriorityFee}
          >
            {isBumping ? 'Bumping...' : 'Bump Fees'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
