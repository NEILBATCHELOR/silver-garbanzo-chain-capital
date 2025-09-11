import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Wallet,
  AlertTriangle,
  Loader2,
  Shield,
  Calculator
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { WalletData, WalletAsset } from '@/types/dfns';

interface AssetTransferDialogProps {
  wallet?: WalletData;
  onTransferCompleted?: () => void;
  children?: React.ReactNode;
}

/**
 * DFNS Asset Transfer Dialog
 * Multi-asset transfer with User Action Signing
 */
export function AssetTransferDialog({ 
  wallet, 
  onTransferCompleted,
  children 
}: AssetTransferDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Available wallets and assets
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [assets, setAssets] = useState<WalletAsset[]>([]);

  // Form state
  const [transferData, setTransferData] = useState({
    fromWallet: wallet?.id || '',
    toAddress: '',
    asset: '',
    amount: '',
    gasPrice: '',
    gasLimit: ''
  });

  // Authentication state
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    supportsUserActionSigning: false
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isOpen) return;
      
      try {
        const dfnsService = await initializeDfnsService();
        const authService = dfnsService.getAuthenticationService();
        const status = await authService.getAuthenticationStatus();
        
        setAuthStatus({
          isAuthenticated: status.isAuthenticated,
          supportsUserActionSigning: authService.supportsUserActionSigning()
        });

        if (status.isAuthenticated) {
          // Load wallets
          const walletsData = await dfnsService.getWalletService().getAllWallets();
          setWallets(walletsData);

          // If specific wallet is provided, load its assets
          if (transferData.fromWallet) {
            const walletAssets = await dfnsService.getWalletAssetsService().getWalletAssets(transferData.fromWallet, true);
            setAssets(walletAssets.assets.filter(asset => parseFloat(asset.balance) > 0));
          }
        }
      } catch (error) {
        console.error('Failed to load transfer data:', error);
      }
    };

    loadInitialData();
  }, [isOpen, transferData.fromWallet]);

  // Handle wallet selection change
  const handleWalletChange = async (walletId: string) => {
    setTransferData(prev => ({ ...prev, fromWallet: walletId, asset: '', amount: '' }));
    
    if (walletId && authStatus.isAuthenticated) {
      try {
        const dfnsService = await initializeDfnsService();
        const walletAssets = await dfnsService.getWalletAssetsService().getWalletAssets(walletId, true);
        setAssets(walletAssets.assets.filter(asset => parseFloat(asset.balance) > 0));
      } catch (error) {
        console.error('Failed to load wallet assets:', error);
      }
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setTransferData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!transferData.fromWallet) {
      setError('Please select a source wallet');
      return false;
    }
    
    if (!transferData.toAddress.trim()) {
      setError('Please enter a destination address');
      return false;
    }
    
    if (!transferData.asset) {
      setError('Please select an asset to transfer');
      return false;
    }
    
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    const selectedAsset = assets.find(a => a.symbol === transferData.asset);
    if (selectedAsset && parseFloat(transferData.amount) > parseFloat(selectedAsset.balance)) {
      setError('Amount exceeds available balance');
      return false;
    }

    return true;
  };

  // Handle transfer execution
  const handleTransfer = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required. Please login to DFNS first.');
        return;
      }

      const selectedAsset = assets.find(a => a.symbol === transferData.asset);
      if (!selectedAsset) {
        setError('Selected asset not found');
        return;
      }

      // Determine if this is a native asset transfer or token transfer
      if (selectedAsset.kind === 'Native') {
        // Native asset transfer (ETH, BTC, etc.)
        await dfnsService.transferNativeAsset(
          transferData.fromWallet,
          transferData.toAddress,
          transferData.amount,
          undefined // User Action Token handled internally
        );
      } else {
        // Token transfer - would need specific implementation
        throw new Error('Token transfers not yet implemented in this demo');
      }

      toast({
        title: "Transfer Initiated",
        description: `${transferData.amount} ${transferData.asset} transfer initiated successfully`,
      });

      // Reset form
      setTransferData({
        fromWallet: wallet?.id || '',
        toAddress: '',
        asset: '',
        amount: '',
        gasPrice: '',
        gasLimit: ''
      });
      setStep(1);
      setIsOpen(false);

      // Notify parent component
      if (onTransferCompleted) {
        onTransferCompleted();
      }

    } catch (error: any) {
      console.error('Transfer failed:', error);
      
      if (error.message.includes('User action required')) {
        setError('User Action Signing required. Please complete the authentication prompt.');
      } else if (error.message.includes('Invalid or expired token')) {
        setError('Authentication token expired. Please refresh your DFNS session.');
      } else {
        setError(`Transfer failed: ${error.message}`);
      }

      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get selected asset details
  const selectedAsset = assets.find(a => a.symbol === transferData.asset);
  const maxAmount = selectedAsset ? parseFloat(selectedAsset.balance) : 0;

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fromWallet">From Wallet *</Label>
              <Select 
                value={transferData.fromWallet} 
                onValueChange={handleWalletChange}
                disabled={!!wallet}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select source wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <div className="flex items-center space-x-2">
                        <span>{w.name || 'Unnamed Wallet'}</span>
                        <Badge variant="outline">{w.network}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="toAddress">To Address *</Label>
              <Input
                id="toAddress"
                value={transferData.toAddress}
                onChange={(e) => handleInputChange('toAddress', e.target.value)}
                placeholder="Enter destination address"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="asset">Asset *</Label>
              <Select 
                value={transferData.asset} 
                onValueChange={(value) => handleInputChange('asset', value)}
                disabled={!transferData.fromWallet || assets.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select asset to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      <div className="flex items-center justify-between w-full">
                        <span>{asset.symbol}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Balance: {parseFloat(asset.balance).toFixed(6)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount *</Label>
                {selectedAsset && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInputChange('amount', maxAmount.toString())}
                    className="h-auto p-0 text-xs text-blue-600"
                  >
                    Max: {maxAmount.toFixed(6)}
                  </Button>
                )}
              </div>
              <Input
                id="amount"
                type="number"
                step="any"
                value={transferData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="Enter amount to transfer"
                className="mt-1"
                disabled={!transferData.asset}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <ArrowRightLeft className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Confirm Transfer</h3>
              <p className="text-muted-foreground mb-6">
                Please review your transfer details before proceeding
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">From:</span>
                    <span className="text-sm">
                      {wallets.find(w => w.id === transferData.fromWallet)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">To:</span>
                    <span className="text-sm font-mono">
                      {transferData.toAddress.slice(0, 10)}...{transferData.toAddress.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Asset:</span>
                    <span className="text-sm">{transferData.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="text-sm font-medium">
                      {transferData.amount} {transferData.asset}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {authStatus.supportsUserActionSigning && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This transfer will require User Action Signing for enhanced security.
                  You may be prompted to authenticate with your credentials.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render step buttons
  const renderStepButtons = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!transferData.fromWallet || !transferData.toAddress || !transferData.asset || !transferData.amount}
            >
              Next
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
      </div>

      {/* Authentication warning */}
      {!authStatus.isAuthenticated && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Authentication required. Please login to DFNS to transfer assets.
          </AlertDescription>
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      {renderStepContent()}

      {/* Step buttons */}
      {authStatus.isAuthenticated && renderStepButtons()}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Assets
          </DialogTitle>
          <DialogDescription>
            Transfer digital assets between wallets or to external addresses
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}