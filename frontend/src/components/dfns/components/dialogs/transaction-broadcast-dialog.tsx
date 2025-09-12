import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowRightLeft, 
  Send,
  Wallet,
  AlertTriangle, 
  Loader2,
  Shield,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services
import { getDfnsService, initializeDfnsService } from '@/services/dfns';

interface TransactionBroadcastDialogProps {
  onTransactionBroadcast?: (txHash: string) => void;
  children?: React.ReactNode;
}

/**
 * Transaction Broadcast Dialog
 * Broadcasts raw signed transactions to the blockchain
 */
export function TransactionBroadcastDialog({ onTransactionBroadcast, children }: TransactionBroadcastDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    walletId: '',
    network: '',
    signedTransaction: '',
    note: ''
  });

  // Load wallets when dialog opens
  useEffect(() => {
    const loadWallets = async () => {
      if (!isOpen) return;

      try {
        const dfnsService = await initializeDfnsService();
        const authStatus = await dfnsService.getAuthenticationStatus();

        if (authStatus.isAuthenticated) {
          const walletService = dfnsService.getWalletService();
          const allWallets = await walletService.getAllWallets();
          setWallets(allWallets);
        }
      } catch (error) {
        console.error('Failed to load wallets:', error);
      }
    };

    loadWallets();
  }, [isOpen]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Handle wallet selection
  const handleWalletChange = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    setFormData(prev => ({ 
      ...prev, 
      walletId,
      network: wallet?.network || ''
    }));
    setError(null);
  };

  // Validate form data
  const validateForm = (): boolean => {
    if (!formData.walletId) {
      setError('Please select a wallet');
      return false;
    }

    if (!formData.signedTransaction.trim()) {
      setError('Please enter a signed transaction');
      return false;
    }

    // Basic hex validation for signed transaction
    if (!formData.signedTransaction.startsWith('0x') && !formData.signedTransaction.match(/^[0-9a-fA-F]+$/)) {
      setError('Signed transaction must be in hexadecimal format');
      return false;
    }

    return true;
  };

  // Handle transaction broadcast
  const handleBroadcastTransaction = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      const authStatus = await dfnsService.getAuthenticationStatus();

      if (!authStatus.isAuthenticated) {
        setError('Authentication required. Please login to DFNS first.');
        return;
      }

      // Broadcast transaction using the transaction service
      const transactionService = dfnsService.getTransactionBroadcastService();
      
      const result = await transactionService.broadcastTransaction(
        formData.walletId, // walletId
        {
          kind: 'Transaction',
          transaction: formData.signedTransaction.startsWith('0x') 
            ? formData.signedTransaction 
            : '0x' + formData.signedTransaction
        }, // request
        {
          externalId: formData.note || 'Broadcasted via DFNS Dashboard'
        } // options
      );

      const selectedWallet = wallets.find(w => w.id === formData.walletId);
      
      toast({
        title: "Success",
        description: `Transaction broadcast successfully on ${selectedWallet?.network || formData.network}`,
      });

      // Reset form
      setFormData({ walletId: '', network: '', signedTransaction: '', note: '' });
      setIsOpen(false);

      // Notify parent component with transaction hash
      if (onTransactionBroadcast && result.txHash) {
        onTransactionBroadcast(result.txHash);
      }

    } catch (error: any) {
      console.error('Transaction broadcast failed:', error);
      
      if (error.message.includes('Invalid transaction')) {
        setError('Invalid transaction format. Please check your signed transaction data.');
      } else if (error.message.includes('Insufficient funds')) {
        setError('Insufficient funds in the selected wallet for this transaction.');
      } else if (error.message.includes('Nonce too low')) {
        setError('Transaction nonce is too low. The transaction may have already been processed.');
      } else if (error.message.includes('Gas limit')) {
        setError('Transaction gas limit is too low or too high.');
      } else {
        setError(`Failed to broadcast transaction: ${error.message}`);
      }

      toast({
        title: "Error",
        description: "Failed to broadcast transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Broadcast Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Broadcast Transaction
          </DialogTitle>
          <DialogDescription>
            Broadcast a pre-signed transaction to the blockchain network
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Wallet selection */}
          <div>
            <Label htmlFor="wallet">Source Wallet *</Label>
            <Select value={formData.walletId} onValueChange={handleWalletChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select wallet for broadcasting" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{wallet.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {wallet.network} • {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wallets.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Loading wallets...
              </p>
            )}
          </div>

          {/* Network display */}
          {formData.network && (
            <div>
              <Label>Network</Label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
                {formData.network}
              </div>
            </div>
          )}

          {/* Signed transaction */}
          <div>
            <Label htmlFor="signedTransaction">Signed Transaction *</Label>
            <Textarea
              id="signedTransaction"
              value={formData.signedTransaction}
              onChange={(e) => handleInputChange('signedTransaction', e.target.value)}
              placeholder="0x02f871011a8405f5e1008405f5e100827530949c1f5f..."
              className="mt-1 font-mono text-xs"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the complete signed transaction in hexadecimal format
            </p>
          </div>

          {/* Optional note */}
          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Input
              id="note"
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              placeholder="Internal note for this transaction"
              className="mt-1"
            />
          </div>

          {/* Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Broadcasting a transaction is irreversible. Make sure you have verified the transaction details before proceeding.
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBroadcastTransaction} 
              disabled={loading || !formData.walletId || !formData.signedTransaction.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Broadcast Transaction
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
