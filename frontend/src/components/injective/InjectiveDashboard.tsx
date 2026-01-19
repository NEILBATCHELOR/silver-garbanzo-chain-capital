/**
 * Injective Dashboard Component
 * 
 * Main dashboard for Injective TokenFactory integration
 * Displays overview, stats, and navigation to key features
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  TrendingUp, 
  Settings, 
  Wallet,
  ExternalLink,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Network } from '@injectivelabs/networks';
import { 
  InjectiveNavigation, 
  InjectiveBreadcrumb, 
  InjectiveStats 
} from './shared/injective-navigation';
import { InjectiveWalletService } from '@/services/wallet/injective';
import { supabase } from '@/infrastructure/database/client';
import { cn } from '@/utils/utils';

interface DashboardStats {
  walletBalance: string;
  tokenCount: number;
  marketCount: number;
  transactionCount: number;
}

interface WalletStatus {
  connected: boolean;
  address?: string;
  network?: 'mainnet' | 'testnet';
}

export const InjectiveDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    walletBalance: '0',
    tokenCount: 0,
    marketCount: 0,
    transactionCount: 0
  });
  
  const [wallet, setWallet] = useState<WalletStatus>({
    connected: false
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Check wallet connection
      const walletData = localStorage.getItem('injective_wallet');
      let parsed: { address: string; network?: string } | null = null;
      
      if (walletData) {
        parsed = JSON.parse(walletData);
        const networkValue = parsed.network || 'testnet';
        setWallet({
          connected: true,
          address: parsed.address,
          network: (networkValue === 'mainnet' || networkValue === 'testnet') 
            ? networkValue 
            : 'testnet'
        });
      }

      // Load stats from database
      try {
        const { data: tokens } = await supabase
          .from('injective_native_tokens')
          .select('id')
          .eq('creator_address', parsed?.address || '');

        const { data: markets } = await supabase
          .from('injective_markets')
          .select('id');

        const { data: trades } = await supabase
          .from('injective_trades')
          .select('id')
          .eq('trader_address', parsed?.address || '');

        // Get wallet balance using InjectiveWalletService
        let walletBalance = '0';
        if (parsed?.address) {
          try {
            const walletService = new InjectiveWalletService(
              parsed.network === 'mainnet' ? Network.Mainnet : Network.Testnet
            );
            const balance = await walletService.getBalance(parsed.address);
            walletBalance = typeof balance === 'string' ? balance : balance.amount || '0';
          } catch (balanceError) {
            console.error('Failed to load balance:', balanceError);
          }
        }

        setStats({
          walletBalance,
          tokenCount: tokens?.length || 0,
          marketCount: markets?.length || 0,
          transactionCount: trades?.length || 0
        });
      } catch (statsError) {
        console.error('Failed to load stats:', statsError);
        // Fallback to zeros if API fails
        setStats({
          walletBalance: '0',
          tokenCount: 0,
          marketCount: 0,
          transactionCount: 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Deploy Token',
      description: 'Create a new TokenFactory token',
      icon: Coins,
      href: '/injective/deploy',
      badge: 'Native',
      color: 'text-blue-600'
    },
    {
      title: 'Launch Market',
      description: 'Create a spot market on DEX',
      icon: TrendingUp,
      href: '/injective/market',
      badge: 'DEX',
      color: 'text-green-600'
    },
    {
      title: 'Manage Tokens',
      description: 'Mint, burn, and update tokens',
      icon: Settings,
      href: '/injective/manage',
      badge: null,
      color: 'text-purple-600'
    }
  ];

  const resources = [
    {
      title: 'Injective Documentation',
      description: 'Official Injective developer docs',
      url: 'https://docs.injective.network',
      icon: ExternalLink
    },
    {
      title: 'Injective Explorer',
      description: 'View transactions and tokens',
      url: wallet.network === 'mainnet' 
        ? 'https://explorer.injective.network'
        : 'https://testnet.explorer.injective.network',
      icon: ExternalLink
    },
    {
      title: 'Helix DEX',
      description: 'Trade on Injective DEX',
      url: wallet.network === 'mainnet'
        ? 'https://helixapp.com/spot'
        : 'https://testnet.helixapp.com/spot',
      icon: ExternalLink
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <InjectiveBreadcrumb currentPage="Dashboard" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Injective Dashboard</h1>
          <p className="text-muted-foreground">
            TokenFactory integration for Chain Capital platform
          </p>
        </div>
        <Badge variant={wallet.network === 'mainnet' ? 'default' : 'secondary'}>
          {wallet.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
        </Badge>
      </div>

      {/* Wallet Status */}
      {!wallet.connected ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>Connect your Injective wallet to access TokenFactory features.</p>
              <Button asChild size="sm">
                <Link to="/injective/wallet">
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Wallet Connected</AlertTitle>
          <AlertDescription>
            <code className="text-sm">{wallet.address}</code>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <InjectiveStats
        walletBalance={stats.walletBalance}
        tokenCount={stats.tokenCount}
        marketCount={stats.marketCount}
        transactionCount={stats.transactionCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with Injective TokenFactory
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    to={action.href}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                      wallet.connected
                        ? 'hover:bg-muted cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={(e) => !wallet.connected && e.preventDefault()}
                  >
                    <div className={cn('p-2 rounded-lg bg-muted', action.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{action.title}</h3>
                        {action.badge && (
                          <Badge variant="outline" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* About Injective TokenFactory */}
          <Card>
            <CardHeader>
              <CardTitle>About TokenFactory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Injective's TokenFactory module enables permissionless token creation 
                  directly on the blockchain without smart contracts.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Key Features</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Permissionless creation</li>
                      <li>• No smart contracts needed</li>
                      <li>• Native bank module integration</li>
                      <li>• Immediate DEX trading</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Token Format</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• factory/{'{address}/{subdenom}'}</li>
                      <li>• Admin controls minting</li>
                      <li>• Transferable admin rights</li>
                      <li>• Custom metadata support</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <InjectiveNavigation walletConnected={wallet.connected} />
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {resources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <a
                    key={resource.url}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{resource.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {resource.description}
                      </p>
                    </div>
                  </a>
                );
              })}
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Phase 2 Complete</AlertTitle>
            <AlertDescription className="text-xs">
              Injective Native TokenFactory integration is ready for testing on testnet.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default InjectiveDashboard;
