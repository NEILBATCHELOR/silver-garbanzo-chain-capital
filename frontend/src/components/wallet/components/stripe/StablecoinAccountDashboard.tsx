// Stablecoin Account Dashboard Component
// Phase 3: Frontend Components

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, RefreshCw, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  stablecoinAccountService,
  formatCurrencyAmount 
} from '@/services/wallet/stripe';
import type { StablecoinAccount } from '@/services/wallet/stripe/types';

interface StablecoinAccountDashboardProps {
  userId: string;
  onTransactionComplete?: (transaction: any) => void;
  className?: string;
}

/**
 * StablecoinAccountDashboard - Shows user's Stripe stablecoin account status and balances
 */
export const StablecoinAccountDashboard: React.FC<StablecoinAccountDashboardProps> = ({
  userId,
  onTransactionComplete,
  className
}) => {
  const [account, setAccount] = useState<StablecoinAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccount = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const response = await stablecoinAccountService.getAccountByUserId(userId);
      
      if (response.success && response.data) {
        setAccount(response.data);
      } else {
        // Account doesn't exist yet
        setAccount(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  const createAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use createAccountWithStripe which accepts userId and optional customerId
      const response = await stablecoinAccountService.createAccountWithStripe(userId);
      
      if (response.success && response.data) {
        setAccount(response.data);
      } else {
        throw new Error(response.error || 'Failed to create account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const refreshAccount = () => {
    loadAccount(true);
  };

  useEffect(() => {
    if (userId) {
      loadAccount();
    }
  }, [userId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'suspended':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'closed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'suspended':
        return 'secondary';
      case 'closed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading && !refreshing) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading account...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => loadAccount()} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Stablecoin Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have a stablecoin account yet. Create one to start converting between FIAT and stablecoins.
            </AlertDescription>
          </Alert>
          
          <Button onClick={createAccount} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Create Stablecoin Account
              </>
            )}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">What you'll get:</h4>
            <ul className="space-y-1 ml-4">
              <li>• USDC and USDB balance tracking</li>
              <li>• FIAT to stablecoin conversion</li>
              <li>• Stablecoin to FIAT withdrawal</li>
              <li>• Secure Stripe integration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBalance = account.balanceUsdc + account.balanceUsdb;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Stablecoin Account
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(account.accountStatus)} className="flex items-center gap-1">
              {getStatusIcon(account.accountStatus)}
              {account.accountStatus}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshAccount}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Balance */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {formatCurrencyAmount(totalBalance, 'USD')}
          </div>
          <div className="text-sm text-muted-foreground">Total Balance</div>
        </div>

        {/* Individual Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrencyAmount(account.balanceUsdc, 'USDC')}
            </div>
            <div className="text-sm text-blue-700 font-medium">USDC</div>
            <div className="text-xs text-muted-foreground">USD Coin</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrencyAmount(account.balanceUsdb, 'USDB')}
            </div>
            <div className="text-sm text-purple-700 font-medium">USDB</div>
            <div className="text-xs text-muted-foreground">Bridge USD</div>
          </div>
        </div>

        {/* Account Information */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm">Account Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account ID:</span>
              <span className="font-mono text-xs">{account.accountId.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{new Date(account.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{new Date(account.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              View Transactions
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              Stripe Dashboard
            </Button>
          </div>
        </div>

        {/* Information */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your stablecoin account is powered by Stripe Treasury. 
            Balances are held securely in FDIC-insured accounts.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default StablecoinAccountDashboard;
