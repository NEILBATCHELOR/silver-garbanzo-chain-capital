import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Send, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Hash,
  DollarSign
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsTransactionRequestResponse,
  DfnsNetwork 
} from "../../../../types/dfns/transactions";
import type { DfnsWallet } from "../../../../types/dfns/wallets";

interface BroadcastDialogProps {
  walletId?: string;
  trigger?: React.ReactNode;
  onTransactionBroadcast?: (transaction: DfnsTransactionRequestResponse) => void;
}

/**
 * Broadcast Dialog Component
 * Manual transaction broadcasting interface for DFNS
 */
export function BroadcastDialog({ walletId, trigger, onTransactionBroadcast }: BroadcastDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DfnsTransactionRequestResponse | null>(null);
  const [wallets, setWallets] = useState<DfnsWallet[]>([]);
  
  // Form state
  const [selectedWalletId, setSelectedWalletId] = useState(walletId || '');
  const [transactionType, setTransactionType] = useState<string>('generic');
  const [transactionHex, setTransactionHex] = useState('');
  const [externalId, setExternalId] = useState('');
  
  // EVM transaction fields
  const [toAddress, setToAddress] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('');
  
  // EIP-1559 fields
  const [gasLimit, setGasLimit] = useState('');
  const [maxFeePerGas, setMaxFeePerGas] = useState('');
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState('');
  const [nonce, setNonce] = useState('');

  // Initialize DFNS service
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

  // Load wallets for selection
  useEffect(() => {
    const loadWallets = async () => {
      if (!dfnsService || !open) return;

      try {
        const walletService = dfnsService.getWalletService();
        const allWallets = await walletService.getAllWallets();
        setWallets(allWallets);
        
        if (!selectedWalletId && allWallets.length > 0) {
          setSelectedWalletId(allWallets[0].id);
        }
      } catch (error) {
        console.error('Failed to load wallets:', error);
        setError('Failed to load wallets');
      }
    };

    loadWallets();
  }, [dfnsService, open, selectedWalletId]);

  const resetForm = () => {
    setError(null);
    setSuccess(null);
    setTransactionHex('');
    setExternalId('');
    setToAddress('');
    setValue('');
    setData('');
    setGasLimit('');
    setMaxFeePerGas('');
    setMaxPriorityFeePerGas('');
    setNonce('');
  };

  const handleBroadcastTransaction = async () => {
    if (!dfnsService || !selectedWalletId) {
      setError('Please select a wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const transactionService = dfnsService.getTransactionService();
      let result: DfnsTransactionRequestResponse;

      const options = {
        syncToDatabase: true,
        validateBalance: true,
      };

      switch (transactionType) {
        case 'generic':
          if (!transactionHex.trim()) {
            throw new Error('Transaction hex is required');
          }
          result = await transactionService.broadcastGenericTransaction(
            selectedWalletId,
            transactionHex,
            options
          );
          break;

        case 'evm':
          if (!toAddress.trim()) {
            throw new Error('To address is required for EVM transactions');
          }
          result = await transactionService.broadcastEvmTransaction(
            selectedWalletId,
            toAddress,
            value || '0',
            data || undefined,
            options
          );
          break;

        case 'eip1559':
          if (!toAddress.trim()) {
            throw new Error('To address is required for EIP-1559 transactions');
          }
          if (!gasLimit.trim() || !maxFeePerGas.trim() || !maxPriorityFeePerGas.trim()) {
            throw new Error('Gas parameters are required for EIP-1559 transactions');
          }
          result = await transactionService.broadcastEip1559Transaction(
            selectedWalletId,
            toAddress,
            value || '0',
            data || '0x',
            gasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
            nonce ? parseInt(nonce) : undefined,
            options
          );
          break;

        case 'bitcoin':
          if (!transactionHex.trim()) {
            throw new Error('PSBT hex is required');
          }
          result = await transactionService.broadcastBitcoinTransaction(
            selectedWalletId,
            transactionHex,
            options
          );
          break;

        case 'solana':
          if (!transactionHex.trim()) {
            throw new Error('Transaction hex is required');
          }
          result = await transactionService.broadcastSolanaTransaction(
            selectedWalletId,
            transactionHex,
            options
          );
          break;

        default:
          throw new Error('Invalid transaction type');
      }

      setSuccess(result);
      if (onTransactionBroadcast) {
        onTransactionBroadcast(result);
      }
    } catch (error) {
      console.error('Failed to broadcast transaction:', error);
      setError(`Failed to broadcast transaction: ${error instanceof Error ? error.message : error}`);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedWallet = () => {
    return wallets.find(w => w.id === selectedWalletId);
  };

  const getNetworkSupportedTypes = (network: DfnsNetwork): string[] => {
    // Simple network support mapping
    const networkSupport: Record<string, string[]> = {
      'Ethereum': ['generic', 'evm', 'eip1559'],
      'Bitcoin': ['generic', 'bitcoin'],
      'Solana': ['generic', 'solana'],
      'Polygon': ['generic', 'evm', 'eip1559'],
      'Arbitrum': ['generic', 'evm', 'eip1559'],
      'Optimism': ['generic', 'evm', 'eip1559'],
      'Base': ['generic', 'evm', 'eip1559'],
      'Avalanche': ['generic', 'evm', 'eip1559'],
      'Binance': ['generic', 'evm', 'eip1559'],
    };
    
    return networkSupport[network] || ['generic'];
  };

  const selectedWallet = getSelectedWallet();
  const supportedTypes = selectedWallet ? getNetworkSupportedTypes(selectedWallet.network) : ['generic'];

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Broadcast Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Broadcast Transaction</span>
          </DialogTitle>
          <DialogDescription>
            Manually broadcast a transaction to the blockchain network
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Transaction broadcast successfully! ID: {success.id}
                {success.txHash && ` | Hash: ${success.txHash.slice(0, 10)}...`}
              </AlertDescription>
            </Alert>
          )}

          {/* Wallet Selection */}
          <div className="space-y-2">
            <Label htmlFor="wallet-select">Select Wallet</Label>
            <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{wallet.name || wallet.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="ml-2">
                        {wallet.network}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedWallet && (
              <div className="text-sm text-muted-foreground">
                Network: {selectedWallet.network} | Address: {selectedWallet.address}
              </div>
            )}
          </div>

          {/* Transaction Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Transaction Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedTypes.includes('generic') && (
                  <SelectItem value="generic">Generic (Raw Hex)</SelectItem>
                )}
                {supportedTypes.includes('evm') && (
                  <SelectItem value="evm">EVM Transaction</SelectItem>
                )}
                {supportedTypes.includes('eip1559') && (
                  <SelectItem value="eip1559">EIP-1559 Transaction</SelectItem>
                )}
                {supportedTypes.includes('bitcoin') && (
                  <SelectItem value="bitcoin">Bitcoin PSBT</SelectItem>
                )}
                {supportedTypes.includes('solana') && (
                  <SelectItem value="solana">Solana Transaction</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Fields */}
          <Tabs value={transactionType} className="w-full">
            <TabsContent value="generic">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Raw Transaction Hex</CardTitle>
                  <CardDescription>
                    Provide a pre-signed transaction in hexadecimal format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tx-hex">Transaction Hex</Label>
                    <Textarea
                      id="tx-hex"
                      placeholder="0x02f86e83aa36a7850d..."
                      value={transactionHex}
                      onChange={(e) => setTransactionHex(e.target.value)}
                      className="font-mono text-sm"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evm">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">EVM Transaction</CardTitle>
                  <CardDescription>
                    DFNS will construct and sign the transaction for you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="to-address">To Address *</Label>
                    <Input
                      id="to-address"
                      placeholder="0x742d35Cc000000000000000000000000000000004"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="value">Value (wei)</Label>
                    <Input
                      id="value"
                      placeholder="1000000000000000000"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="data">Data (optional)</Label>
                    <Textarea
                      id="data"
                      placeholder="0xa9059cbb000000000000000000000000..."
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="font-mono text-sm"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="eip1559">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">EIP-1559 Transaction</CardTitle>
                  <CardDescription>
                    Type 2 transaction with custom gas parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="to-address-eip">To Address *</Label>
                      <Input
                        id="to-address-eip"
                        placeholder="0x742d35Cc..."
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="value-eip">Value (wei)</Label>
                      <Input
                        id="value-eip"
                        placeholder="0"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gas-limit">Gas Limit *</Label>
                      <Input
                        id="gas-limit"
                        placeholder="21000"
                        value={gasLimit}
                        onChange={(e) => setGasLimit(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="max-fee">Max Fee Per Gas *</Label>
                      <Input
                        id="max-fee"
                        placeholder="30000000000"
                        value={maxFeePerGas}
                        onChange={(e) => setMaxFeePerGas(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority-fee">Priority Fee *</Label>
                      <Input
                        id="priority-fee"
                        placeholder="2000000000"
                        value={maxPriorityFeePerGas}
                        onChange={(e) => setMaxPriorityFeePerGas(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nonce">Nonce (optional)</Label>
                    <Input
                      id="nonce"
                      placeholder="Auto-generated if not provided"
                      value={nonce}
                      onChange={(e) => setNonce(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="data-eip">Data (optional)</Label>
                    <Textarea
                      id="data-eip"
                      placeholder="0x"
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="font-mono text-sm"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bitcoin">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Bitcoin PSBT</CardTitle>
                  <CardDescription>
                    Partially Signed Bitcoin Transaction
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="psbt-hex">PSBT Hex</Label>
                    <Textarea
                      id="psbt-hex"
                      placeholder="0x70736274ff0100..."
                      value={transactionHex}
                      onChange={(e) => setTransactionHex(e.target.value)}
                      className="font-mono text-sm"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="solana">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Solana Transaction</CardTitle>
                  <CardDescription>
                    Solana transaction hex
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="solana-hex">Transaction Hex</Label>
                    <Textarea
                      id="solana-hex"
                      placeholder="0x01000103c8d842a2..."
                      value={transactionHex}
                      onChange={(e) => setTransactionHex(e.target.value)}
                      className="font-mono text-sm"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* External ID */}
          <div className="space-y-2">
            <Label htmlFor="external-id">External ID (optional)</Label>
            <Input
              id="external-id"
              placeholder="correlation-id-12345"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              Optional correlation ID for tracking this transaction
            </div>
          </div>

          {/* Security Warning */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This transaction will require User Action Signing for security. 
              You'll need to confirm the transaction with your WebAuthn credential.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleBroadcastTransaction} 
            disabled={loading || !selectedWalletId || success !== null}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Broadcasting...' : 'Broadcast Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
