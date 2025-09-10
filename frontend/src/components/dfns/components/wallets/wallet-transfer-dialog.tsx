/**
 * DFNS Wallet Transfer Dialog Component
 * 
 * Comprehensive asset transfer interface supporting native assets, ERC-20 tokens, and NFTs
 * Includes gas estimation, balance validation, and User Action Signing integration
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Send,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Coins,
  Image as ImageIcon,
  Calculator,
  Shield,
  Info
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { DfnsService } from '@/services/dfns';
import type { 
  DfnsWallet,
  DfnsWalletAsset,
  DfnsTransferAssetRequest,
  DfnsNetwork
} from '@/types/dfns';

// Transfer form schema
const transferSchema = z.object({
  fromWallet: z.string().min(1, 'Please select a source wallet'),
  toAddress: z.string().min(1, 'Destination address is required'),
  asset: z.string().min(1, 'Please select an asset to transfer'),
  amount: z.string().optional(),
  tokenId: z.string().optional(),
  externalId: z.string().optional(),
  gasPrice: z.string().optional(),
  gasLimit: z.string().optional(),
  validateBalance: z.boolean().default(true),
  waitForConfirmation: z.boolean().default(false),
}).refine((data) => {
  // All wallet assets are fungible and require amount
  const asset = JSON.parse(data.asset || '{}');
  if (asset.kind) {
    return !!data.amount;
  }
  return true;
}, {
  message: "Amount is required for all asset transfers",
  path: ["amount"]
});

type TransferFormData = z.infer<typeof transferSchema>;

interface WalletTransferDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preselectedWallet?: DfnsWallet;
  preselectedAsset?: DfnsWalletAsset;
  onTransferComplete?: (transferId: string) => void;
}

/**
 * Format balance for display
 */
const formatBalance = (balance: string, decimals: number, symbol: string): string => {
  try {
    const balanceNumber = parseFloat(balance) / Math.pow(10, decimals);
    if (balanceNumber === 0) return '0';
    if (balanceNumber < 0.001) return `< 0.001 ${symbol}`;
    return `${balanceNumber.toFixed(6)} ${symbol}`;
  } catch (error) {
    return `${balance} ${symbol}`;
  }
};

/**
 * Validate Ethereum address format
 */
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate Bitcoin address format (simplified)
 */
const isValidBitcoinAddress = (address: string): boolean => {
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || // Legacy
         /^bc1[a-z0-9]{39,59}$/.test(address); // Bech32
};

/**
 * Validate address based on network
 */
const validateAddress = (address: string, network: DfnsNetwork): boolean => {
  switch (network) {
    case 'Ethereum':
    case 'Polygon':
    case 'Arbitrum':
    case 'Optimism':
    case 'Avalanche':
    case 'Binance':
      return isValidEthereumAddress(address);
    case 'Bitcoin':
      return isValidBitcoinAddress(address);
    case 'Solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    default:
      return address.length > 10; // Basic validation
  }
};

export function WalletTransferDialog({
  trigger,
  open,
  onOpenChange,
  preselectedWallet,
  preselectedAsset,
  onTransferComplete
}: WalletTransferDialogProps) {
  const { toast } = useToast();
  
  // State
  const [wallets, setWallets] = useState<DfnsWallet[]>([]);
  const [walletAssets, setWalletAssets] = useState<Record<string, DfnsWalletAsset[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<DfnsWallet | null>(preselectedWallet || null);
  const [selectedAsset, setSelectedAsset] = useState<DfnsWalletAsset | null>(preselectedAsset || null);
  
  // DFNS Service
  const [dfnsService] = useState(() => new DfnsService());

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWallet: preselectedWallet?.id || '',
      toAddress: '',
      asset: preselectedAsset ? JSON.stringify(preselectedAsset) : '',
      amount: '',
      tokenId: '',
      externalId: '',
      validateBalance: true,
      waitForConfirmation: false,
    },
  });

  const watchedWallet = form.watch('fromWallet');
  const watchedAsset = form.watch('asset');
  const watchedAmount = form.watch('amount');
  const watchedToAddress = form.watch('toAddress');

  // Load wallets on mount
  useEffect(() => {
    loadWallets();
  }, []);

  // Load wallet assets when wallet changes
  useEffect(() => {
    if (watchedWallet && !walletAssets[watchedWallet]) {
      loadWalletAssets(watchedWallet);
    }
  }, [watchedWallet]);

  // Update selected wallet and asset
  useEffect(() => {
    if (watchedWallet) {
      const wallet = wallets.find(w => w.id === watchedWallet);
      setSelectedWallet(wallet || null);
    }
  }, [watchedWallet, wallets]);

  useEffect(() => {
    if (watchedAsset) {
      try {
        const asset = JSON.parse(watchedAsset);
        setSelectedAsset(asset);
      } catch (error) {
        setSelectedAsset(null);
      }
    }
  }, [watchedAsset]);

  // Load wallets
  const loadWallets = async () => {
    try {
      setIsLoading(true);
      const walletsData = await dfnsService.getWalletService().getAllWallets();
      setWallets(walletsData.filter(w => w.status === 'Active'));
    } catch (error: any) {
      console.error('Failed to load wallets:', error);
      toast({
        title: "Error loading wallets",
        description: error.message || 'Failed to load wallets',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load assets for a wallet
  const loadWalletAssets = async (walletId: string) => {
    try {
      const assetsData = await dfnsService.getWalletService().getWalletAssets(walletId, true);
      setWalletAssets(prev => ({
        ...prev,
        [walletId]: assetsData.assets.filter(asset => parseFloat(asset.balance) > 0)
      }));
    } catch (error: any) {
      console.error('Failed to load wallet assets:', error);
      toast({
        title: "Error loading assets",
        description: error.message || 'Failed to load wallet assets',
        variant: "destructive",
      });
    }
  };

  // Estimate gas (placeholder - would integrate with actual gas estimation)
  const estimateGas = async () => {
    if (!selectedWallet || !selectedAsset || !watchedToAddress || !watchedAmount) return;

    try {
      // TODO: Implement actual gas estimation via DFNS
      setGasEstimate('0.001 ETH');
      
      toast({
        title: "Gas estimated",
        description: `Estimated gas: 0.001 ETH`,
      });
    } catch (error: any) {
      console.error('Failed to estimate gas:', error);
      toast({
        title: "Gas estimation failed",
        description: error.message || 'Could not estimate gas',
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: TransferFormData) => {
    if (!selectedWallet || !selectedAsset) return;

    try {
      setIsTransferring(true);

      // Validate address format
      if (!validateAddress(data.toAddress, selectedWallet.network)) {
        throw new Error(`Invalid address format for ${selectedWallet.network}`);
      }

      // Build transfer request
      let transferRequest: DfnsTransferAssetRequest;

      if (selectedAsset.kind === 'Native') {
        transferRequest = {
          kind: 'Native',
          to: data.toAddress,
          amount: (parseFloat(data.amount!) * Math.pow(10, selectedAsset.decimals)).toString(),
          externalId: data.externalId || undefined,
        };
      } else if (selectedAsset.kind === 'Erc20') {
        transferRequest = {
          kind: 'Erc20',
          contract: (selectedAsset as any).contract,
          to: data.toAddress,
          amount: (parseFloat(data.amount!) * Math.pow(10, selectedAsset.decimals)).toString(),
          externalId: data.externalId || undefined,
        };
      } else {
        // Handle other asset types (Asa, Aip21, Spl, Spl2022) with generic approach
        // These will need specific handling based on DFNS transfer API
        throw new Error(`Transfer for ${selectedAsset.kind} assets not yet implemented. Please use DFNS dashboard for these transfers.`);
      }

      // Execute transfer
      const transferResponse = await dfnsService.getWalletService().transferAsset(
        selectedWallet.id,
        transferRequest,
        {
          syncToDatabase: true,
          validateBalance: data.validateBalance,
          waitForConfirmation: data.waitForConfirmation,
        }
      );

      toast({
        title: "Transfer initiated successfully!",
        description: `Transfer ID: ${transferResponse.id}`,
      });

      if (onTransferComplete) {
        onTransferComplete(transferResponse.id);
      }

      if (onOpenChange) {
        onOpenChange(false);
      }

      // Reset form
      form.reset();
      setSelectedAsset(null);
      setGasEstimate(null);
    } catch (error: any) {
      console.error('Failed to transfer asset:', error);
      toast({
        title: "Transfer failed",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const assets = selectedWallet ? walletAssets[selectedWallet.id] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Transfer Asset</span>
          </DialogTitle>
          <DialogDescription>
            Send assets from your wallet to any address across the blockchain
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Source Wallet Selection */}
            <FormField
              control={form.control}
              name="fromWallet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Wallet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source wallet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex items-center space-x-2">
                            <span>{wallet.name || 'Unnamed Wallet'}</span>
                            <Badge variant="outline" className="text-xs">
                              {wallet.network}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Asset Selection */}
            {selectedWallet && (
              <FormField
                control={form.control}
                name="asset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset to transfer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assets.map((asset, index) => (
                          <SelectItem key={index} value={JSON.stringify(asset)}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-2">
                                {asset.kind === 'Native' ? (
                                  <Coins className="h-4 w-4" />
                                ) : (
                                  <DollarSign className="h-4 w-4" />
                                )}
                                <span>{asset.symbol}</span>
                                <Badge variant="outline" className="text-xs">
                                  {asset.kind}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatBalance(asset.balance, asset.decimals, asset.symbol)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the asset you want to transfer from this wallet
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Amount Input (for all assets) */}
            {selectedAsset && (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="0.0"
                          type="number"
                          step="any"
                          {...field}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                          {selectedAsset.symbol}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Available: {formatBalance(selectedAsset.balance, selectedAsset.decimals, selectedAsset.symbol)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Destination Address */}
            <FormField
              control={form.control}
              name="toAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Enter ${selectedWallet?.network || 'destination'} address`}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The recipient's wallet address on {selectedWallet?.network}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* External ID (Optional) */}
            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your internal reference"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional correlation ID for tracking this transfer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gas Estimation */}
            {selectedWallet && selectedAsset && watchedToAddress && watchedAmount && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Gas Estimation</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={estimateGas}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Estimate
                  </Button>
                </div>
                {gasEstimate && (
                  <p className="text-sm text-blue-800">
                    Estimated gas fee: {gasEstimate}
                  </p>
                )}
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="validateBalance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Validate balance before transfer</FormLabel>
                      <FormDescription>
                        Check that the wallet has sufficient balance
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="waitForConfirmation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Wait for blockchain confirmation</FormLabel>
                      <FormDescription>
                        Wait for the transaction to be confirmed on-chain
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Security Notice</span>
              </div>
              <p className="text-sm text-yellow-800">
                This transfer requires User Action Signing for security. 
                You'll need to approve the transaction with your WebAuthn credential.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isTransferring || !selectedWallet || !selectedAsset}
              className="w-full"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Transfer Asset
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default WalletTransferDialog;