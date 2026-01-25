/**
 * Deployer Wallet Overview Component
 * Shows COMPLETE wallet balance from blockchain:
 * - SOL balance
 * - ALL token balances (not just the deployed token)
 * 
 * NO DATABASE DATA - 100% blockchain queries
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Wallet, Coins } from 'lucide-react';
import { modernSolanaBlockchainQueryService } from '@/services/wallet/solana/ModernSolanaBlockchainQueryService';
import type { WalletBalance } from '@/services/wallet/solana/ModernSolanaBlockchainQueryService';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';

// ============================================================================
// TYPES
// ============================================================================

interface DeployerWalletOverviewProps {
  deployerAddress: string;
  network: SolanaNetwork;
  highlightToken?: string; // Mint address to highlight
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeployerWalletOverview({
  deployerAddress,
  network,
  highlightToken,
  className = ''
}: DeployerWalletOverviewProps) {
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadWalletBalance();
  }, [deployerAddress, network]);

  const loadWalletBalance = async () => {
    try {
      setIsLoading(true);

      const balance = await modernSolanaBlockchainQueryService.getWalletBalance(
        deployerAddress,
        network
      );

      setWalletBalance(balance);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wallet balance from blockchain',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadWalletBalance();
    toast({
      title: 'Refreshing',
      description: 'Fetching latest balance from blockchain...'
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Deployer Wallet
          </CardTitle>
          <CardDescription>
            Loading wallet balance from blockchain...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!walletBalance) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Deployer Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load wallet data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Deployer Wallet
            </CardTitle>
            <CardDescription>
              Complete balance for deployment wallet
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Address */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Address
          </label>
          <code className="block text-xs bg-muted px-2 py-1 rounded mt-1">
            {deployerAddress}
          </code>
        </div>

        {/* SOL Balance */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">SOL Balance</label>
          </div>
          <div className="text-2xl font-bold">
            {walletBalance.solFormatted} SOL
          </div>
        </div>

        {/* Token Balances */}
        {walletBalance.tokens.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">
                Token Balances ({walletBalance.tokens.length})
              </label>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {walletBalance.tokens.map((token) => {
                const isHighlighted = token.mint === highlightToken;
                
                return (
                  <div
                    key={token.mint}
                    className={`p-3 rounded border ${
                      isHighlighted
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs truncate">
                            {token.mint.slice(0, 8)}...{token.mint.slice(-6)}
                          </code>
                          {isHighlighted && (
                            <Badge variant="default" className="text-xs">
                              Deployed Token
                            </Badge>
                          )}
                        </div>
                        {token.symbol && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {token.symbol}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">
                          {token.uiAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {token.decimals} decimals
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {walletBalance.tokens.length === 0 && (
          <div className="text-center p-4 text-muted-foreground">
            <p className="text-sm">No tokens found in this wallet</p>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            ✅ Live data from Solana blockchain
          </p>
          <p className="text-xs text-muted-foreground">
            {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default DeployerWalletOverview;
