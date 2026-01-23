/**
 * Solana Token Balance Display Component
 * Shows token balance for a specific address
 * 
 * Features:
 * - Real-time balance fetching
 * - Formatted display
 * - Refresh functionality
 * - Loading states
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Wallet, TrendingUp } from 'lucide-react';
import { createModernRpc } from '@/infrastructure/web3/solana/ModernSolanaRpc';
import { address, type Address } from '@solana/kit';
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';

// ============================================================================
// TYPES
// ============================================================================

interface TokenBalanceDisplayProps {
  tokenAddress: string;
  ownerAddress: string;
  tokenSymbol: string;
  decimals: number;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  showCard?: boolean;
  className?: string;
}

interface BalanceInfo {
  balance: string;
  formattedBalance: string;
  uiAmount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenBalanceDisplay({
  tokenAddress,
  ownerAddress,
  tokenSymbol,
  decimals,
  network,
  showCard = true,
  className = ''
}: TokenBalanceDisplayProps) {
  const { toast } = useToast();
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadBalance();
  }, [tokenAddress, ownerAddress, network]);

  const loadBalance = async () => {
    try {
      setIsLoading(true);

      // Create RPC client
      const rpc = createModernRpc(network);

      // Find the Associated Token Account (ATA)
      const [ata] = await findAssociatedTokenPda({
        owner: address(ownerAddress),
        mint: address(tokenAddress),
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      });

      // Get token account info
      const accountInfo = await rpc.getRpc().getAccountInfo(ata, {
        encoding: 'base64'
      }).send();

      if (!accountInfo.value) {
        // Account doesn't exist, balance is 0
        setBalanceInfo({
          balance: '0',
          formattedBalance: '0',
          uiAmount: 0
        });
        setLastUpdated(new Date());
        return;
      }

      // Get token account balance
      const balanceResult = await rpc.getRpc().getTokenAccountBalance(ata).send();
      
      if (balanceResult.value) {
        const balance = balanceResult.value.amount;
        const uiAmount = Number(balanceResult.value.uiAmount || 0);
        
        setBalanceInfo({
          balance,
          formattedBalance: formatBalance(balance, decimals),
          uiAmount
        });
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading balance:', error);
      // Set to 0 on error (likely account doesn't exist)
      setBalanceInfo({
        balance: '0',
        formattedBalance: '0',
        uiAmount: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: string, decimals: number): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.min(decimals, 6)
    });
  };

  const handleRefresh = () => {
    loadBalance();
    toast({
      title: 'Balance Updated',
      description: 'Token balance has been refreshed'
    });
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Balance</span>
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

      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : balanceInfo ? (
        <div>
          <div className="text-3xl font-bold">
            {balanceInfo.formattedBalance}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {tokenSymbol}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center p-4 text-muted-foreground">
          <p>Unable to load balance</p>
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Token Balance
        </CardTitle>
        <CardDescription>
          Current balance for this token
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

export default TokenBalanceDisplay;
