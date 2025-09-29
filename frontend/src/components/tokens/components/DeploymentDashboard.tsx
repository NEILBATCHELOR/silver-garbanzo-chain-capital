/**
 * Deployment Dashboard Component
 * Shows wallet selection, balance, gas estimation, and faucet links
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Wallet,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Info,
  Zap,
  DollarSign
} from 'lucide-react';
import { NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import { 
  deploymentEnhancementService,
  type ProjectWallet,
  type WalletBalance,
  type GasEstimation,
  type FaucetInfo
} from '../services/deploymentEnhancementService';

interface DeploymentDashboardProps {
  projectId: string;
  blockchain: string;
  environment: NetworkEnvironment;
  tokenType: string;
  onWalletSelected: (wallet: ProjectWallet) => void;
  selectedWallet?: ProjectWallet;
}

export const DeploymentDashboard: React.FC<DeploymentDashboardProps> = ({
  projectId,
  blockchain,
  environment,
  tokenType,
  onWalletSelected,
  selectedWallet
}) => {
  const [wallets, setWallets] = useState<ProjectWallet[]>([]);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [gasEstimation, setGasEstimation] = useState<GasEstimation | null>(null);
  const [faucets, setFaucets] = useState<FaucetInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sufficientBalance, setSufficientBalance] = useState(true);

  // Load wallets when blockchain changes
  useEffect(() => {
    console.log('[DeploymentDashboard] Blockchain changed:', blockchain);
    loadWallets();
  }, [projectId, blockchain]);

  // Load balance when wallet or blockchain changes
  useEffect(() => {
    if (selectedWallet) {
      console.log('[DeploymentDashboard] Loading balance for:', blockchain, selectedWallet.wallet_address);
      loadBalance();
      checkBalance();
    }
  }, [selectedWallet, blockchain, environment]);

  // Load gas estimation when token type or blockchain changes
  useEffect(() => {
    console.log('[DeploymentDashboard] Loading gas estimation for:', blockchain);
    loadGasEstimation();
  }, [blockchain, environment, tokenType]);

  // Load faucets when environment changes
  useEffect(() => {
    if (environment === NetworkEnvironment.TESTNET) {
      console.log('[DeploymentDashboard] Loading faucets for:', blockchain);
      loadFaucets();
    }
  }, [blockchain, environment]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const walletList = await deploymentEnhancementService.getProjectWallets(projectId, blockchain);
      setWallets(walletList);
      
      // Auto-select first wallet if none selected
      if (walletList.length > 0 && !selectedWallet) {
        onWalletSelected(walletList[0]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    if (!selectedWallet) return;
    
    try {
      setLoading(true);
      const walletBalance = await deploymentEnhancementService.getWalletBalance(
        selectedWallet.wallet_address,
        blockchain,
        environment
      );
      setBalance(walletBalance);
    } catch (err) {
      console.error('Error loading balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGasEstimation = async () => {
    try {
      const estimation = await deploymentEnhancementService.estimateDeploymentGas(
        blockchain,
        environment,
        tokenType
      );
      setGasEstimation(estimation);
    } catch (err) {
      console.error('Error estimating gas:', err);
    }
  };

  const loadFaucets = () => {
    const faucetList = deploymentEnhancementService.getFaucetInfo(blockchain, environment);
    setFaucets(faucetList);
  };

  const checkBalance = async () => {
    if (!selectedWallet || !gasEstimation) return;
    
    try {
      const result = await deploymentEnhancementService.checkSufficientBalance(
        selectedWallet.wallet_address,
        blockchain,
        environment,
        gasEstimation
      );
      setSufficientBalance(result.sufficient);
    } catch (err) {
      console.error('Error checking balance:', err);
    }
  };

  const handleWalletChange = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
      onWalletSelected(wallet);
    }
  };

  return (
    <div className="space-y-4">
      {/* Wallet Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Deployment Wallet
          </CardTitle>
          <CardDescription>
            Select the wallet to deploy from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wallets.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Wallets Found</AlertTitle>
              <AlertDescription>
                No {blockchain} wallets found for this project. Please create a wallet first.
              </AlertDescription>
            </Alert>
          ) : wallets.length === 1 ? (
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="font-mono text-sm">{selectedWallet?.wallet_address}</span>
                <Badge variant="secondary">Primary</Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Wallet</Label>
              <Select value={selectedWallet?.id} onValueChange={handleWalletChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet, index) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-sm">
                          {wallet.wallet_address.slice(0, 6)}...{wallet.wallet_address.slice(-4)}
                        </span>
                        {index === 0 && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Balance Display */}
          {selectedWallet && balance && (
            <div className="space-y-2 pt-2">
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Balance</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadBalance}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold">{balance.balanceFormatted}</span>
                {balance.balanceUsd !== '0.00' && (
                  <span className="text-sm text-muted-foreground">
                    ≈ ${balance.balanceUsd} USD
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Gas Estimation */}
      {gasEstimation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Gas Estimation
            </CardTitle>
            <CardDescription>
              Estimated cost for deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gas Limit</Label>
                <p className="text-sm font-medium">{Number(gasEstimation.gasLimit).toLocaleString()} units</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gas Price</Label>
                <p className="text-sm font-medium">
                  {gasEstimation.gasPrice 
                    ? `${(Number(gasEstimation.gasPrice) / 1e9).toFixed(2)} gwei`
                    : 'Estimating...'}
                </p>
              </div>
            </div>

            {gasEstimation.maxFeePerGas && gasEstimation.maxPriorityFeePerGas && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max Fee</Label>
                  <p className="text-sm font-medium">
                    {(Number(gasEstimation.maxFeePerGas) / 1e9).toFixed(2)} gwei
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Priority Fee</Label>
                  <p className="text-sm font-medium">
                    {(Number(gasEstimation.maxPriorityFeePerGas) / 1e9).toFixed(2)} gwei
                  </p>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Cost</span>
                <span className="text-lg font-bold">
                  {parseFloat(gasEstimation.totalCostNative).toFixed(6)} {getNativeCurrency(blockchain)}
                </span>
              </div>
              {gasEstimation.totalCostUsd && (
                <p className="text-xs text-muted-foreground text-right">
                  ≈ ${gasEstimation.totalCostUsd} USD
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Estimated time: ~{gasEstimation.estimatedTimeSeconds}s
              </p>
            </div>

            {/* Balance Check Warning */}
            {!sufficientBalance && balance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient Balance</AlertTitle>
                <AlertDescription>
                  Your wallet needs approximately {parseFloat(gasEstimation.totalCostNative).toFixed(6)} {getNativeCurrency(blockchain)} but only has {balance.balanceFormatted}. 
                  Please fund your wallet before deploying.
                </AlertDescription>
              </Alert>
            )}

            {sufficientBalance && balance && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Wallet has sufficient balance for deployment</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Testnet Faucets */}
      {environment === NetworkEnvironment.TESTNET && faucets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Testnet Faucets
            </CardTitle>
            <CardDescription>
              Get free testnet tokens to fund your wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {faucets.map((faucet, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-md">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{faucet.name}</p>
                  <p className="text-xs text-muted-foreground">{faucet.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(faucet.url, '_blank')}
                  className="ml-3"
                >
                  Get Tokens
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Helper function to get native currency symbol
function getNativeCurrency(blockchain: string): string {
  const currencies: Record<string, string> = {
    'ethereum': 'ETH',
    'sepolia': 'ETH',
    'holesky': 'ETH',
    'polygon': 'MATIC',
    'bsc': 'BNB',
    'avalanche': 'AVAX',
    'arbitrum': 'ETH',
    'optimism': 'ETH',
    'base': 'ETH'
  };
  return currencies[blockchain] || 'ETH';
}
