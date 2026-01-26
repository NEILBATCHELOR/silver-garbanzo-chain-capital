/**
 * CPI Guard Management Form
 * Enable/disable CPI Guard on token accounts
 * 
 * CPI Guard protects token accounts from unauthorized Cross-Program Invocations:
 * - Prevents CPI transfers/burns (must use delegate)
 * - Restricts CPI close account to owner
 * - Blocks CPI approve and SetAuthority
 * 
 * Architecture: Modern @solana/kit + @solana-program/token-2022
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, ShieldOff, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { modernSolanaCpiGuardService } from '@/services/wallet/solana/ModernSolanaCpiGuardService';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/database/client';

interface CpiGuardFormProps {
  projectId: string;
  tokenId: string;
}

interface CpiGuardStatus {
  enabled: boolean;
  exists: boolean;
  accountAddress: string;
}

export function CpiGuardForm({ projectId, tokenId }: CpiGuardFormProps) {
  const [tokenAccount, setTokenAccount] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [network, setNetwork] = useState<'devnet' | 'testnet' | 'mainnet-beta'>('devnet');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<CpiGuardStatus | null>(null);
  const [userId, setUserId] = useState<string>('');

  // Get current user ID from Supabase auth
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Check CPI Guard status on a token account
  const handleCheckStatus = async () => {
    if (!tokenAccount.trim()) {
      toast.error('Please enter a token account address');
      return;
    }

    try {
      setChecking(true);
      const result = await modernSolanaCpiGuardService.getCpiGuardStatus(
        tokenAccount,
        network
      );

      if (result.success) {
        setStatus({
          enabled: result.cpiGuardEnabled,
          exists: result.cpiGuardExists,
          accountAddress: result.accountAddress
        });
        toast.success('CPI Guard status retrieved');
      } else {
        toast.error(result.errors?.join(', ') || 'Failed to get CPI Guard status');
        setStatus(null);
      }
    } catch (error: any) {
      console.error('Check CPI Guard status error:', error);
      toast.error(error.message || 'Failed to check CPI Guard status');
      setStatus(null);
    } finally {
      setChecking(false);
    }
  };

  // Enable CPI Guard on token account
  const handleEnableCpiGuard = async () => {
    if (!tokenAccount.trim()) {
      toast.error('Please enter a token account address');
      return;
    }

    if (!privateKey.trim()) {
      toast.error('Please enter your private key');
      return;
    }

    try {
      setLoading(true);

      const result = await modernSolanaCpiGuardService.enableCpiGuard(
        tokenAccount,
        {
          network,
          accountOwnerPrivateKey: privateKey,
          projectId,
          userId
        }
      );

      if (result.success && result.signature) {
        toast.success('CPI Guard enabled successfully', {
          description: `Transaction: ${result.signature.slice(0, 8)}...${result.signature.slice(-8)}`
        });

        // Refresh status
        await handleCheckStatus();
      } else {
        toast.error(result.errors?.join(', ') || 'Failed to enable CPI Guard');
      }
    } catch (error: any) {
      console.error('Enable CPI Guard error:', error);
      toast.error(error.message || 'Failed to enable CPI Guard');
    } finally {
      setLoading(false);
    }
  };

  // Disable CPI Guard on token account
  const handleDisableCpiGuard = async () => {
    if (!tokenAccount.trim()) {
      toast.error('Please enter a token account address');
      return;
    }

    if (!privateKey.trim()) {
      toast.error('Please enter your private key');
      return;
    }

    try {
      setLoading(true);

      const result = await modernSolanaCpiGuardService.disableCpiGuard(
        tokenAccount,
        {
          network,
          accountOwnerPrivateKey: privateKey,
          projectId,
          userId
        }
      );

      if (result.success && result.signature) {
        toast.success('CPI Guard disabled successfully', {
          description: `Transaction: ${result.signature.slice(0, 8)}...${result.signature.slice(-8)}`
        });

        // Refresh status
        await handleCheckStatus();
      } else {
        toast.error(result.errors?.join(', ') || 'Failed to disable CPI Guard');
      }
    } catch (error: any) {
      console.error('Disable CPI Guard error:', error);
      toast.error(error.message || 'Failed to disable CPI Guard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>CPI Guard Management</CardTitle>
        </div>
        <CardDescription>
          Enable or disable CPI Guard protection on token accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Information Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What is CPI Guard?</AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>CPI Guard is an <strong>account-level extension</strong> that protects token accounts from unauthorized Cross-Program Invocations:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Prevents CPI transfers/burns (must go through a delegate)</li>
              <li>Close account via CPI can only return lamports to owner</li>
              <li>Blocks CPI approve and SetAuthority operations</li>
            </ul>
            <p className="mt-2 text-amber-600 font-medium">
              ⚠️ This is enabled on INDIVIDUAL token accounts, not on the mint itself
            </p>
          </AlertDescription>
        </Alert>

        {/* Token Account Input */}
        <div className="space-y-2">
          <Label htmlFor="tokenAccount">Token Account Address</Label>
          <Input
            id="tokenAccount"
            placeholder="Token account address (not mint address)"
            value={tokenAccount}
            onChange={(e) => setTokenAccount(e.target.value)}
            disabled={loading || checking}
          />
          <p className="text-xs text-muted-foreground">
            Enter the token account address (ATA) you want to manage, not the mint address
          </p>
        </div>

        {/* Network Selection */}
        <div className="space-y-2">
          <Label htmlFor="network">Network</Label>
          <select
            id="network"
            className="w-full p-2 border rounded-md"
            value={network}
            onChange={(e) => setNetwork(e.target.value as any)}
            disabled={loading || checking}
          >
            <option value="devnet">Devnet</option>
            <option value="testnet">Testnet</option>
            <option value="mainnet-beta">Mainnet Beta</option>
          </select>
        </div>

        {/* Check Status Button */}
        <Button
          onClick={handleCheckStatus}
          disabled={checking || loading || !tokenAccount.trim()}
          variant="outline"
          className="w-full"
        >
          {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Check CPI Guard Status
        </Button>

        {/* Status Display */}
        {status && (
          <Alert variant={status.enabled ? 'default' : 'destructive'}>
            <div className="flex items-center gap-2">
              {status.enabled ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>CPI Guard Status</AlertTitle>
            </div>
            <AlertDescription className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Extension Exists:</span>
                <Badge variant={status.exists ? 'default' : 'secondary'}>
                  {status.exists ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">CPI Guard Enabled:</span>
                <Badge variant={status.enabled ? 'default' : 'destructive'}>
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Account: {status.accountAddress}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Private Key Input (only show when status is checked) */}
        {status && (
          <div className="space-y-2">
            <Label htmlFor="privateKey">Owner Private Key</Label>
            <Input
              id="privateKey"
              type="password"
              placeholder="Enter owner's private key (Base58 or hex)"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Required to enable/disable CPI Guard. Must be the account owner's private key.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {status && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleEnableCpiGuard}
              disabled={loading || checking || !privateKey.trim() || status.enabled}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Shield className="mr-2 h-4 w-4" />
              Enable CPI Guard
            </Button>

            <Button
              onClick={handleDisableCpiGuard}
              disabled={loading || checking || !privateKey.trim() || !status.enabled}
              variant="destructive"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ShieldOff className="mr-2 h-4 w-4" />
              Disable CPI Guard
            </Button>
          </div>
        )}

        {/* Security Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Warning</AlertTitle>
          <AlertDescription className="text-sm">
            Never share your private key. This form uses it locally to sign transactions but does not store or transmit it anywhere.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
