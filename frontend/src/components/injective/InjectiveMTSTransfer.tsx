/**
 * Injective MTS (MultiVM Token Standard) Transfer Component
 * 
 * Enables cross-VM token transfers between Injective EVM and Native Cosmos environments.
 * 
 * KEY CONCEPT: With MTS, transfers work identically in both environments!
 * - Balance is stored in bank module (single source of truth)
 * - EVM transfer() and Cosmos bank send both update the same balance
 * - No bridging needed - instant sync across VMs
 * 
 * @see https://docs.injective.network/developers-evm/multivm-token-standard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeftRight, 
  Wallet, 
  Info, 
  CheckCircle, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { Network } from '@injectivelabs/networks';
import {
  MTSUtilities,
  MTSBalance,
  MTSTokenInfo,
  mtsUtilitiesTestnet,
  getMTSDenom,
  isMTSDenom,
  InjectiveWalletService
} from '@/services/wallet/injective';
import { cn } from '@/utils/utils';

// ============================================================================
// TYPES
// ============================================================================

interface InjectiveMTSTransferProps {
  network?: 'testnet' | 'mainnet';
  defaultAddress?: string;
  defaultTokenAddress?: string;
  projectId?: string; // Project context for filtering/tracking
  onTransferComplete?: (txHash: string) => void;
}

type TransferDirection = 'evm-to-native' | 'native-to-evm';

// ============================================================================
// COMPONENT
// ============================================================================

export function InjectiveMTSTransfer({
  network = 'testnet',
  defaultAddress = '',
  defaultTokenAddress = '',
  onTransferComplete
}: InjectiveMTSTransferProps) {
  // State
  const [address, setAddress] = useState(defaultAddress);
  const [tokenAddress, setTokenAddress] = useState(defaultTokenAddress);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [direction, setDirection] = useState<TransferDirection>('evm-to-native');
  
  // MTS data
  const [balance, setBalance] = useState<MTSBalance | null>(null);
  const [tokenInfo, setTokenInfo] = useState<MTSTokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // MTS utilities instance - switches based on network prop
  const mtsUtils = network === 'mainnet' 
    ? new MTSUtilities(Network.Mainnet)
    : mtsUtilitiesTestnet;

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Load token info when token address changes
   */
  useEffect(() => {
    if (tokenAddress && address) {
      loadTokenInfo();
      loadBalance();
    }
  }, [tokenAddress, address]);

  // ==========================================================================
  // LOAD DATA
  // ==========================================================================

  /**
   * Load MTS token information
   */
  const loadTokenInfo = async () => {
    if (!tokenAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const info = await mtsUtils.getTokenInfo(tokenAddress);
      setTokenInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load token info');
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load MTS balance
   */
  const loadBalance = async () => {
    if (!tokenAddress || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const bal = await mtsUtils.getMTSBalance(address, tokenAddress);
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // TRANSFER LOGIC
  // ==========================================================================

  /**
   * Execute cross-VM transfer
   * 
   * NOTE: For MTS tokens, this is just a regular transfer!
   * The "cross-VM" aspect is automatic - balance updates in both environments.
   */
  const handleTransfer = async () => {
    if (!tokenAddress || !address || !recipient || !amount) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const bankDenom = getMTSDenom(tokenAddress);

      // Validate transfer
      const validation = MTSUtilities.validateCrossVMTransfer({
        from: address,
        to: recipient,
        denom: bankDenom,
        amount,
        fromEnvironment: direction === 'evm-to-native' ? 'evm' : 'native',
        toEnvironment: direction === 'evm-to-native' ? 'native' : 'evm'
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get suggested transfer method
      const { method, reason } = MTSUtilities.getSuggestedTransferMethod({
        from: address,
        to: recipient,
        denom: bankDenom,
        amount,
        fromEnvironment: direction === 'evm-to-native' ? 'evm' : 'native',
        toEnvironment: direction === 'evm-to-native' ? 'native' : 'evm'
      });

      // Execute transfer using Cosmos SDK (works for MTS tokens in both environments)
      // For MTS tokens, balance updates automatically in both EVM and Native
      const walletService = new InjectiveWalletService(
        network === 'mainnet' ? Network.Mainnet : Network.Testnet
      );

      // Note: In production, you would need to get the private key securely
      // This is a placeholder - actual implementation needs wallet integration
      const txHash = await walletService.sendTokens(
        {
          fromAddress: address,
          toAddress: recipient,
          amount,
          denom: bankDenom
        },
        {
          address,
          // privateKey would come from secure wallet connection
          privateKey: '', // TODO: Integrate with wallet connection
          publicKey: ''
        }
      );

      setSuccess(
        `Transfer successful! Method: ${method.toUpperCase()}. ${reason}\nTransaction: ${txHash}`
      );

      // Refresh balance after transfer
      setTimeout(() => {
        loadBalance();
      }, 2000);

      // Notify parent with real tx hash
      if (onTransferComplete) {
        onTransferComplete(txHash);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch transfer direction
   */
  const switchDirection = () => {
    setDirection(prev => 
      prev === 'evm-to-native' ? 'native-to-evm' : 'evm-to-native'
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* MTS Explanation Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            MultiVM Token Standard (MTS)
          </CardTitle>
          <CardDescription>
            MTS tokens have a single canonical balance stored in the bank module.
            Transfers work identically in both EVM and Native Cosmos environments!
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Token Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Token Information</CardTitle>
          <CardDescription>Enter an ERC20 token address to view MTS info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Address Input */}
          <div className="space-y-2">
            <Label htmlFor="tokenAddress">ERC20 Token Address</Label>
            <div className="flex gap-2">
              <Input
                id="tokenAddress"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
              <Button
                onClick={loadTokenInfo}
                disabled={!tokenAddress || isLoading}
                variant="outline"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Token Info Display */}
          {tokenInfo && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{tokenInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Symbol</p>
                <p className="font-medium">{tokenInfo.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Decimals</p>
                <p className="font-medium">{tokenInfo.decimals}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">MTS Status</p>
                <Badge 
                  variant={tokenInfo.isMTSEnabled ? 'default' : 'secondary'}
                  className={tokenInfo.isMTSEnabled ? 'bg-green-500' : ''}
                >
                  {tokenInfo.isMTSEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Bank Denom</p>
                <p className="font-mono text-xs break-all">{tokenInfo.bankDenom}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            MTS Balance
          </CardTitle>
          <CardDescription>
            Unified balance across both environments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address Input */}
          <div className="space-y-2">
            <Label htmlFor="address">Your Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="inj1... or 0x..."
              disabled={isLoading}
            />
          </div>

          {/* Balance Display */}
          {balance && (
            <Tabs defaultValue="unified">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="unified">Unified</TabsTrigger>
                <TabsTrigger value="evm">EVM View</TabsTrigger>
                <TabsTrigger value="native">Native View</TabsTrigger>
              </TabsList>

              <TabsContent value="unified" className="mt-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                  <p className="text-2xl font-bold">
                    {balance.totalBalance} {tokenInfo?.symbol || 'tokens'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Last synced: {balance.lastSyncedAt.toLocaleString()}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="evm" className="mt-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">EVM Balance</p>
                  <p className="text-2xl font-bold">
                    {balance.evmBalance} {tokenInfo?.symbol || 'tokens'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Contract: {balance.erc20Address}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="native" className="mt-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Native Balance</p>
                  <p className="text-2xl font-bold">
                    {balance.nativeBalance} {tokenInfo?.symbol || 'tokens'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                    Denom: {balance.bankDenom}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <Button
            onClick={loadBalance}
            disabled={!tokenAddress || !address || isLoading}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh Balance
          </Button>
        </CardContent>
      </Card>

      {/* Transfer Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Cross-VM Transfer
          </CardTitle>
          <CardDescription>
            Transfer tokens between EVM and Native representations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transfer Direction */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 text-center">
              <p className="text-sm font-medium">
                {direction === 'evm-to-native' ? 'EVM' : 'Native'}
              </p>
              <p className="text-xs text-gray-500">From</p>
            </div>
            <Button
              onClick={switchDirection}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium">
                {direction === 'evm-to-native' ? 'Native' : 'EVM'}
              </p>
              <p className="text-xs text-gray-500">To</p>
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="inj1... or 0x..."
              disabled={isLoading}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isLoading}
            />
            {balance && (
              <p className="text-xs text-gray-500">
                Available: {balance.totalBalance} {tokenInfo?.symbol || 'tokens'}
              </p>
            )}
          </div>

          {/* Transfer Button */}
          <Button
            onClick={handleTransfer}
            disabled={!tokenAddress || !address || !recipient || !amount || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Transfer
              </>
            )}
          </Button>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
