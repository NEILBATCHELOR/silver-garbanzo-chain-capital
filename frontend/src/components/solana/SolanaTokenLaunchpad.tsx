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
  ArrowRight,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type TokenDeployment = Tables<'token_deployments'>;

interface LaunchpadStats {
  totalTokens: number;
  splTokens: number;
  token2022Count: number;
  totalDeployed: number;
}

interface RecentToken {
  id: string;
  name: string;
  symbol: string;
  solana_token_type: string | null;
  deployed_at: string;
}

interface SolanaTokenLaunchpadProps {
  projectId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SolanaTokenLaunchpad({ projectId }: SolanaTokenLaunchpadProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<LaunchpadStats>({
    totalTokens: 0,
    splTokens: 0,
    token2022Count: 0,
    totalDeployed: 0
  });
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, [projectId]);

  /**
   * Load dashboard statistics and recent tokens
   */
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('tokens')
        .select('id, name, symbol, standard')
        .eq('project_id', projectId)
        .in('standard', ['SPL', 'Token2022']);

      if (tokensError) throw tokensError;

      // Load deployments
      const { data: deployments, error: deploymentsError } = await supabase
        .from('token_deployments')
        .select('token_id, solana_token_type, deployed_at')
        .eq('status', 'deployed')
        .in('token_id', (tokens || []).map(t => t.id))
        .order('deployed_at', { ascending: false })
        .limit(5);

      if (deploymentsError) throw deploymentsError;

      // Calculate stats
      const totalTokens = tokens?.length || 0;
      const totalDeployed = deployments?.length || 0;
      
      const deploymentMap = new Map<string, TokenDeployment>(
        (deployments || []).map(d => [d.token_id, d as TokenDeployment])
      );

      const splTokens = deployments?.filter((d: TokenDeployment) => 
        !d.solana_token_type || d.solana_token_type === 'SPL'
      ).length || 0;

      const token2022Count = deployments?.filter((d: TokenDeployment) => 
        d.solana_token_type === 'Token2022'
      ).length || 0;

      setStats({
        totalTokens,
        splTokens,
        token2022Count,
        totalDeployed
      });

      // Get recent tokens with deployment info
      const recent = (tokens || [])
        .filter(t => deploymentMap.has(t.id))
        .slice(0, 5)
        .map(t => {
          const deployment = deploymentMap.get(t.id)!;
          return {
            id: t.id,
            name: t.name,
            symbol: t.symbol,
            solana_token_type: deployment.solana_token_type,
            deployed_at: deployment.deployed_at
          };
        });

      setRecentTokens(recent);
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

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTokens}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDeployed} deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SPL Tokens</CardTitle>
            <Badge variant="secondary">SPL</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.splTokens}</div>
            <p className="text-xs text-muted-foreground">
              Basic fungible tokens
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
              With extensions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentTokens.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent deployments
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

      {/* Recent Tokens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Deployments</CardTitle>
              <CardDescription>
                Your most recently deployed tokens
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('list')}
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentTokens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No tokens deployed yet
              </p>
              <Button onClick={() => navigate('deploy')}>
                <Plus className="h-4 w-4 mr-2" />
                Deploy Your First Token
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => navigate(`${token.id}/details`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Coins className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{token.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {token.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={token.solana_token_type === 'Token2022' ? 'default' : 'secondary'}>
                      {token.solana_token_type || 'SPL'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(token.deployed_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
