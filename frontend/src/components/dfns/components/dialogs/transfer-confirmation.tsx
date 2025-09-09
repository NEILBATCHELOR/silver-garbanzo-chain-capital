import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowRight,
  Wallet,
  Send,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle,
  ExternalLink,
  Copy,
  Coins,
  DollarSign
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsTransferAssetRequest,
  DfnsNetwork,
  DfnsWallet,
  DfnsWalletAsset
} from "../../../../types/dfns";

interface TransferFormData {
  fromWalletId: string;
  to: string;
  kind: 'Native' | 'Erc20' | 'Erc721' | 'Asa' | 'Aip21' | 'Spl' | 'Spl2022';
  amount?: string;
  contract?: string;
  tokenId?: string;
  externalId?: string;
}

interface TransferConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWalletId?: string;
  initialAsset?: DfnsWalletAsset;
}

/**
 * Transfer Confirmation Dialog
 * Handles asset transfers with validation and User Action Signing
 */
export function TransferConfirmation({ 
  open, 
  onOpenChange,
  initialWalletId,
  initialAsset
}: TransferConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [wallets, setWallets] = useState<DfnsWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<DfnsWallet | null>(null);
  const [walletAssets, setWalletAssets] = useState<DfnsWalletAsset[]>([]);
  
  const [transferData, setTransferData] = useState<TransferFormData>({
    fromWalletId: initialWalletId || '',
    to: '',
    kind: (initialAsset?.kind as 'Native' | 'Erc20' | 'Erc721') || 'Native',
    amount: '',
    contract: ('contract' in (initialAsset || {}) ? (initialAsset as any).contract : '') || '',
    tokenId: '',
    externalId: ''
  });

  // DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Load wallets when dialog opens
  useEffect(() => {
    if (open && dfnsService) {
      loadWallets();
    }
  }, [open, dfnsService]);

  // Load assets when wallet changes
  useEffect(() => {
    if (transferData.fromWalletId && dfnsService) {
      loadWalletAssets();
      
      const wallet = wallets.find(w => w.id === transferData.fromWalletId);
      setSelectedWallet(wallet || null);
    }
  }, [transferData.fromWalletId, wallets, dfnsService]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setTransferId(null);
      setTxHash(null);
      setTransferData({
        fromWalletId: initialWalletId || '',
        to: '',
        kind: (initialAsset?.kind as 'Native' | 'Erc20' | 'Erc721') || 'Native',
        amount: '',
        contract: ('contract' in (initialAsset || {}) ? (initialAsset as any).contract : '') || '',
        tokenId: '',
        externalId: ''
      });
    }
  }, [open, initialWalletId, initialAsset]);

  const loadWallets = async () => {
    if (!dfnsService) return;

    try {
      const walletService = dfnsService.getWalletService();
      const allWallets = await walletService.getAllWallets();
      
      // Filter only active wallets
      const activeWallets = allWallets.filter(w => w.status === 'Active');
      setWallets(activeWallets);
    } catch (error) {
      console.error('Failed to load wallets:', error);
      setError('Failed to load wallets');
    }
  };

  const loadWalletAssets = async () => {
    if (!dfnsService || !transferData.fromWalletId) return;

    try {
      const walletService = dfnsService.getWalletService();
      const assetsResponse = await walletService.getWalletAssets(transferData.fromWalletId, true);
      setWalletAssets(assetsResponse.assets);
    } catch (error) {
      console.error('Failed to load wallet assets:', error);
      setError('Failed to load wallet assets');
    }
  };

  const validateTransfer = (): boolean => {
    if (!transferData.fromWalletId) {
      setError('Please select a wallet');
      return false;
    }

    if (!transferData.to.trim()) {
      setError('Please enter destination address');
      return false;
    }

    if (transferData.kind === 'Native' || transferData.kind === 'Erc20') {
      if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
        setError('Please enter a valid amount');
        return false;
      }
    }

    if (transferData.kind === 'Erc20' && !transferData.contract) {
      setError('Contract address is required for ERC-20 transfers');
      return false;
    }

    if (transferData.kind === 'Erc721' && !transferData.tokenId) {
      setError('Token ID is required for NFT transfers');
      return false;
    }

    return true;
  };

  const handleTransfer = async () => {
    if (!dfnsService || !validateTransfer()) return;

    try {
      setLoading(true);
      setError(null);

      const walletService = dfnsService.getWalletService();
      
      // Build transfer request based on type
      let request: DfnsTransferAssetRequest;
      
      if (transferData.kind === 'Native') {
        request = {
          kind: 'Native',
          to: transferData.to.trim(),
          amount: transferData.amount || '0',
          ...(transferData.externalId && { externalId: transferData.externalId })
        };
      } else if (transferData.kind === 'Erc20') {
        request = {
          kind: 'Erc20',
          to: transferData.to.trim(),
          contract: transferData.contract || '',
          amount: transferData.amount || '0',
          ...(transferData.externalId && { externalId: transferData.externalId })
        };
      } else if (transferData.kind === 'Erc721') {
        request = {
          kind: 'Erc721',
          to: transferData.to.trim(),
          contract: transferData.contract || '',
          tokenId: transferData.tokenId || '',
          ...(transferData.externalId && { externalId: transferData.externalId })
        };
      } else {
        throw new Error(`Unsupported transfer kind: ${transferData.kind}`);
      }

      // Execute transfer with User Action Signing
      const transferResponse = await walletService.transferAsset(
        transferData.fromWalletId,
        request,
        {
          syncToDatabase: true,
          validateBalance: true,
          includeGasEstimation: true
        }
      );

      setTransferId(transferResponse.id);
      setTxHash(transferResponse.txHash || null);
      setSuccess(true);

      console.log('Transfer initiated:', transferResponse);

    } catch (error) {
      console.error('Transfer failed:', error);
      setError(`Transfer failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getAssetSymbol = () => {
    if (transferData.kind === 'Native') {
      return selectedWallet?.network === 'Bitcoin' ? 'BTC' :
             selectedWallet?.network === 'Ethereum' ? 'ETH' :
             selectedWallet?.network === 'Solana' ? 'SOL' :
             selectedWallet?.network === 'Polygon' ? 'MATIC' :
             selectedWallet?.network === 'Binance' ? 'BNB' :
             'Native';
    }

    if (transferData.kind === 'Erc20') {
      const asset = walletAssets.find(a => 
        a.kind === 'Erc20' && ('contract' in a ? (a as any).contract : '') === transferData.contract
      );
      return asset?.symbol || 'ERC20';
    }

    return 'NFT';
  };

  const getExplorerUrl = (txHash: string) => {
    if (!selectedWallet || !txHash) return '';
    
    const baseUrls: Record<string, string> = {
      'Ethereum': 'https://etherscan.io/tx/',
      'Bitcoin': 'https://blockstream.info/tx/',
      'Polygon': 'https://polygonscan.com/tx/',
      'Arbitrum': 'https://arbiscan.io/tx/',
      'Optimism': 'https://optimistic.etherscan.io/tx/',
      'Solana': 'https://explorer.solana.com/tx/',
      'Avalanche': 'https://snowtrace.io/tx/',
      'Binance': 'https://bscscan.com/tx/'
    };
    
    return baseUrls[selectedWallet.network] + txHash;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Transfer Initiated Successfully</span>
            </DialogTitle>
            <DialogDescription>
              Your transfer has been submitted to the blockchain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Transfer ID:</span>
                  <div className="flex items-center space-x-1">
                    <code className="text-sm font-mono">{transferId}</code>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => transferId && copyToClipboard(transferId)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {txHash && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transaction Hash:</span>
                    <div className="flex items-center space-x-1">
                      <code className="text-sm font-mono">{txHash.slice(0, 12)}...{txHash.slice(-8)}</code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(txHash)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => window.open(getExplorerUrl(txHash), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {transferData.amount} {getAssetSymbol()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">To:</span>
                  <code className="text-sm font-mono">{transferData.to.slice(0, 8)}...{transferData.to.slice(-6)}</code>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">What happens next?</p>
                  <p className="text-blue-700 mt-1">
                    Your transfer is being processed by the blockchain network. 
                    You can track its status in the transaction history.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Transfer Assets</span>
          </DialogTitle>
          <DialogDescription>
            Send tokens or NFTs from your wallet to another address
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Source Wallet Selection */}
          <div>
            <Label htmlFor="source-wallet">From Wallet *</Label>
            <Select
              value={transferData.fromWalletId}
              onValueChange={(value) => setTransferData(prev => ({ ...prev, fromWalletId: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4" />
                      <span>{wallet.name || 'Unnamed Wallet'}</span>
                      <Badge variant="secondary">{wallet.network}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedWallet && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Wallet className="h-4 w-4" />
                <span className="font-medium">{selectedWallet.name}</span>
                <Badge variant="secondary">{selectedWallet.network}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <code>{selectedWallet.address}</code>
              </div>
            </div>
          )}

          {/* Asset Type Selection */}
          <div>
            <Label htmlFor="asset-type">Asset Type *</Label>
            <Select
              value={transferData.kind}
              onValueChange={(value: 'Native' | 'Erc20' | 'Erc721') => 
                setTransferData(prev => ({ ...prev, kind: value as any, contract: '', tokenId: '', amount: '' }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Native">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4" />
                    <span>Native Currency</span>
                  </div>
                </SelectItem>
                <SelectItem value="Erc20">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>ERC-20 Token</span>
                  </div>
                </SelectItem>
                <SelectItem value="Erc721">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span>NFT (ERC-721)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contract Address for ERC-20/ERC-721 */}
          {(transferData.kind === 'Erc20' || transferData.kind === 'Erc721') && (
            <div>
              <Label htmlFor="contract">Contract Address *</Label>
              <Input
                id="contract"
                placeholder="0x..."
                value={transferData.contract || ''}
                onChange={(e) => setTransferData(prev => ({ ...prev, contract: e.target.value }))}
                className="mt-1"
              />
            </div>
          )}

          {/* Amount for Native/ERC-20 */}
          {(transferData.kind === 'Native' || transferData.kind === 'Erc20') && (
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder={`Amount in ${getAssetSymbol()}`}
                value={transferData.amount || ''}
                onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                className="mt-1"
              />
            </div>
          )}

          {/* Token ID for NFTs */}
          {transferData.kind === 'Erc721' && (
            <div>
              <Label htmlFor="tokenId">Token ID *</Label>
              <Input
                id="tokenId"
                placeholder="Token ID"
                value={transferData.tokenId || ''}
                onChange={(e) => setTransferData(prev => ({ ...prev, tokenId: e.target.value }))}
                className="mt-1"
              />
            </div>
          )}

          {/* Destination Address */}
          <div>
            <Label htmlFor="destination">Destination Address *</Label>
            <Input
              id="destination"
              placeholder="0x... or address"
              value={transferData.to}
              onChange={(e) => setTransferData(prev => ({ ...prev, to: e.target.value }))}
              className="mt-1"
            />
          </div>

          {/* External ID */}
          <div>
            <Label htmlFor="external-id">External ID (Optional)</Label>
            <Input
              id="external-id"
              placeholder="Reference ID"
              value={transferData.externalId || ''}
              onChange={(e) => setTransferData(prev => ({ ...prev, externalId: e.target.value }))}
              className="mt-1"
            />
          </div>

          {/* Transfer Summary */}
          {transferData.fromWalletId && transferData.to && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Transfer Summary</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span>From:</span>
                  <code className="text-xs">{selectedWallet?.address?.slice(0, 12)}...</code>
                </div>
                <div className="flex items-center justify-center py-1">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <span>To:</span>
                  <code className="text-xs">{transferData.to.slice(0, 12)}...</code>
                </div>
                {(transferData.amount || transferData.tokenId) && (
                  <div className="flex items-center justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">
                      {transferData.amount || `Token #${transferData.tokenId}`} {getAssetSymbol()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Security Notice</p>
                <p className="text-yellow-700 mt-1">
                  This transfer requires User Action Signing with your security key. 
                  Double-check all details as transfers cannot be reversed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing Transfer...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Confirm Transfer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
