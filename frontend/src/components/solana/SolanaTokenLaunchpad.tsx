/**
 * Solana Token Launchpad
 * Main dashboard for managing Solana tokens
 * 
 * Features:
 * - Overview of deployed tokens
 * - Quick deploy action
 * - Recent activity
 * - Statistics
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/database/client';
import type { Tables } from '@/types/core/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Coins,
  Plus,
  TrendingUp,
  Activity,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { modernSolanaBlockchainQueryService } from '@/services/wallet/solana';

// ============================================================================
// TYPES
// ============================================================================

type TokenDeployment = Tables<'token_deployments'>;

interface LaunchpadStats {
  totalTokens: number;
  splTokens: number;
  token2022Count: number;
  totalDeployed: number;
  totalValueLocked: string; // Total SOL across all wallets
  activeWallets: number; // Number of unique wallet addresses with tokens
}

interface SolanaTokenLaunchpadProps {
  projectId: string;
  selectedWallet?: string; // Wallet address for dynamic stats
  network?: string; // Network (DEVNET, MAINNET, TESTNET)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SolanaTokenLaunchpad({ projectId, selectedWallet, network: networkProp }: SolanaTokenLaunchpadProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<LaunchpadStats>({
    totalTokens: 0,
    splTokens: 0,
    token2022Count: 0,
    totalDeployed: 0,
    totalValueLocked: '0',
    activeWallets: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Normalize network for blockchain queries
  const normalizedNetwork = (networkProp === 'MAINNET' ? 'mainnet-beta' 
    : networkProp === 'DEVNET' ? 'devnet' 
    : networkProp === 'TESTNET' ? 'testnet'
    : 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet';

  // Load data on mount and when wallet/network changes
  useEffect(() => {
    loadDashboardData();
  }, [projectId, selectedWallet, networkProp]);

  /**
   * Load dashboard statistics and fetch LIVE blockchain data
   */
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load tokens from database
      const { data: tokens, error: tokensError } = await supabase
        .from('tokens')
        .select('id, name, symbol, standard')
        .eq('project_id', projectId)
        .in('standard', ['SPL', 'Token2022']);

      if (tokensError) throw tokensError;

      // Load ALL deployments from database (no limit for accurate counting)
      const { data: deployments, error: deploymentsError } = await supabase
        .from('token_deployments')
        .select('token_id, solana_token_type, deployed_at, deployed_by, network')
        .in('status', ['deployed', 'DEPLOYED', 'success', 'SUCCESS'])
        .in('token_id', (tokens || []).map(t => t.id))
        .order('deployed_at', { ascending: false });

      if (deploymentsError) throw deploymentsError;

      // Filter deployments by current network
      const currentNetworkDeployments = (deployments || []).filter((d: any) => {
        const deploymentNetwork = d.network.replace('solana-', '');
        return deploymentNetwork === normalizedNetwork;
      });

      // Calculate stats from filtered deployments
      const totalTokens = tokens?.length || 0;
      const totalDeployed = currentNetworkDeployments.length;
      
      const splTokens = currentNetworkDeployments.filter((d: any) => 
        !d.solana_token_type || d.solana_token_type === 'SPL'
      ).length;

      const token2022Count = currentNetworkDeployments.filter((d: any) => 
        d.solana_token_type === 'Token2022'
      ).length;

      // Fetch LIVE blockchain data for wallet
      let totalValueLocked = '0';
      let activeWallets = 0;
      let blockchainSPLCount = 0;
      let blockchainToken2022Count = 0;

      if (selectedWallet) {
        try {
          // ✅ FETCH LIVE DATA FROM BLOCKCHAIN
          const balance = await modernSolanaBlockchainQueryService.getWalletBalance(
            selectedWallet,
            normalizedNetwork
          );
          totalValueLocked = balance.solFormatted;
          
          // ✅ COUNT ACTUAL TOKENS BY PROGRAM TYPE FROM BLOCKCHAIN
          blockchainSPLCount = balance.tokens.filter(t => t.tokenProgram === 'spl-token').length;
          blockchainToken2022Count = balance.tokens.filter(t => t.tokenProgram === 'token-2022').length;
          
          // Count unique wallet holders from current network deployments
          const uniqueWallets = new Set<string>();
          for (const deployment of currentNetworkDeployments) {
            if (deployment.deployed_by) {
              uniqueWallets.add(deployment.deployed_by);
            }
          }
          activeWallets = uniqueWallets.size;

          console.log('✅ LIVE BLOCKCHAIN DATA LOADED:', {
            wallet: selectedWallet,
            network: normalizedNetwork,
            solBalance: totalValueLocked,
            totalTokens: balance.tokens.length,
            splTokens: blockchainSPLCount,
            token2022Tokens: blockchainToken2022Count,
            dbSPL: splTokens,
            dbToken2022: token2022Count
          });
        } catch (blockchainError) {
          console.error('Failed to fetch blockchain data:', blockchainError);
          toast({
            title: 'Warning',
            description: 'Could not fetch live blockchain data. Showing database info only.',
            variant: 'default'
          });
        }
      }

      // Use blockchain counts if wallet is selected, otherwise fall back to database
      const finalSPLCount = selectedWallet ? blockchainSPLCount : splTokens;
      const finalToken2022Count = selectedWallet ? blockchainToken2022Count : token2022Count;

      setStats({
        totalTokens,
        splTokens: finalSPLCount,
        token2022Count: finalToken2022Count,
        totalDeployed,
        totalValueLocked,
        activeWallets
      });

    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Token Launchpad</h2>
          <p className="text-muted-foreground">
            Deploy and manage SPL and Token-2022 tokens on Solana
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('deploy')}>
            <Plus className="h-4 w-4 mr-2" />
            Deploy New Token
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SPL Tokens</CardTitle>
            <Badge variant="secondary">SPL</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.splTokens}</div>
            <p className="text-xs text-muted-foreground">
              {selectedWallet ? '✅ Tokens in wallet' : 'Basic fungible tokens'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token-2022</CardTitle>
            <Badge>Advanced</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.token2022Count}</div>
            <p className="text-xs text-muted-foreground">
              {selectedWallet ? '✅ With extensions' : 'With extensions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalValueLocked} SOL</div>
            <p className="text-xs text-muted-foreground">
              {selectedWallet ? '✅ Live from blockchain' : 'Select wallet to view'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate('deploy')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Deploy New Token
            </CardTitle>
            <CardDescription>
              Launch a new SPL or Token-2022 token with our deployment wizard
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate('list')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              View All Tokens
            </CardTitle>
            <CardDescription>
              Browse and manage your deployed Solana tokens
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Getting Started */}
      {stats.totalTokens === 0 && !isLoading && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to the Solana Token Launchpad! Deploy your first token to get started:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Choose between SPL (basic) or Token-2022 (with extensions)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Configure your token parameters (name, symbol, supply)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Deploy to devnet or mainnet-beta
              </li>
            </ul>
            <Button className="w-full" onClick={() => navigate('deploy')}>
              <Plus className="h-4 w-4 mr-2" />
              Deploy Your First Token
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SolanaTokenLaunchpad;
