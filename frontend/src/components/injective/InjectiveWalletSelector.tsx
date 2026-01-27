/**
 * Injective Wallet Selector Component
 * 
 * Allows selecting a project Injective wallet for funding operations
 * Automatically filters by network (mainnet, testnet)
 * Decrypts private key on selection for immediate use
 * 
 * Pattern: Follows Solana wallet selector pattern for consistency
 * 
 * Usage:
 * ```tsx
 * <InjectiveWalletSelector
 *   projectId="proj-123"
 *   network="testnet"
 *   onWalletSelected={(wallet) => {
 *     // wallet.privateKey is decrypted and ready to use
 *   }}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { BalanceFormatter } from '@/services/wallet/balances';
import { useToast } from '@/components/ui/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface InjectiveWallet {
  id: string;
  wallet_address: string;
  private_key: string;
  non_evm_network: string; // 'injective-1' (mainnet), 'injective-888' (testnet)
  net: string; // 'mainnet', 'testnet'
  project_wallet_name: string | null;
  balance?: string; // INJ balance (if available)
}

export interface SelectedInjectiveWallet {
  walletId: string;
  address: string;
  privateKey: string; // Decrypted
  network: string;
  chainId: string; // Chain ID for Injective network
}

interface InjectiveWalletSelectorProps {
  projectId: string;
  network: 'mainnet' | 'testnet';
  onWalletSelected: (wallet: SelectedInjectiveWallet) => void;
  onError?: (error: string) => void;
  label?: string;
  description?: string;
  autoSelectFirst?: boolean;
  showBalance?: boolean;
  required?: boolean;
}

// Network mapping for Injective
const NETWORK_MAP: Record<string, { chainId: string; displayName: string }> = {
  'mainnet': { chainId: 'injective-1', displayName: 'Mainnet' },
  'testnet': { chainId: 'injective-888', displayName: 'Testnet' }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function InjectiveWalletSelector({
  projectId,
  network,
  onWalletSelected,
  onError,
  label = 'Funding Wallet',
  description = 'This wallet will be used to fund the transaction',
  autoSelectFirst = true,
  showBalance = true,
  required = false
}: InjectiveWalletSelectorProps) {
  const { toast } = useToast();

  const [wallets, setWallets] = useState<InjectiveWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, [projectId, network]);

  const loadWallets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`[InjectiveWalletSelector] Loading wallets for ${network}`);

      const { data, error: dbError } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('project_id', projectId)
        .eq('wallet_type', 'Injective')
        .eq('net', network)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setWallets(data || []);

      if (autoSelectFirst && data && data.length > 0) {
        await handleWalletSelect(data[0].id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load wallets';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletSelect = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    setSelectedWalletId(walletId);
    setIsDecrypting(true);
    setError(null);

    try {
      const isEncrypted = WalletEncryptionClient.isEncrypted(wallet.private_key);
      const privateKey = isEncrypted
        ? await WalletEncryptionClient.decrypt(wallet.private_key)
        : wallet.private_key;

      const networkInfo = NETWORK_MAP[network];

      onWalletSelected({
        walletId: wallet.id,
        address: wallet.wallet_address,
        privateKey,
        network: wallet.net || network,
        chainId: networkInfo.chainId
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to decrypt wallet';
      setError(errorMsg);
      onError?.(errorMsg);
      
      toast({
        title: 'Decryption Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}{required && <span className="text-red-500">*</span>}</Label>
        <div className="flex items-center justify-center py-8 border border-dashed rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading wallets...</span>
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}{required && <span className="text-red-500">*</span>}</Label>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Injective Wallets Found</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              No Injective wallets found for <strong>{NETWORK_MAP[network].displayName}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please create a wallet first in the project wallets section.
            </p>
            <Button variant="outline" size="sm" onClick={loadWallets} className="mt-2">
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="injective-wallet-selector">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Select
        value={selectedWalletId}
        onValueChange={handleWalletSelect}
        disabled={isDecrypting || wallets.length === 0}
      >
        <SelectTrigger id="injective-wallet-selector" className="w-full">
          <SelectValue placeholder="Select a wallet..." />
        </SelectTrigger>
        <SelectContent>
          {wallets.map((wallet) => (
            <SelectItem key={wallet.id} value={wallet.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 flex-shrink-0" />
                  <span className="font-mono text-xs">
                    {wallet.project_wallet_name || 
                     BalanceFormatter.formatAddress(wallet.wallet_address, 6)}
                  </span>
                </div>
                {showBalance && wallet.balance && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {wallet.balance} INJ
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isDecrypting && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Decrypting wallet...
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {description && !error && !isDecrypting && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {selectedWalletId && !isDecrypting && !error && (
        <div className="text-xs text-muted-foreground space-y-1 pt-1">
          {(() => {
            const selectedWallet = wallets.find(w => w.id === selectedWalletId);
            if (!selectedWallet) return null;
            
            const networkInfo = NETWORK_MAP[network];
            
            return (
              <>
                <p>
                  <strong>Address:</strong>{' '}
                  <span className="font-mono">
                    {BalanceFormatter.formatAddress(selectedWallet.wallet_address, 8)}
                  </span>
                </p>
                <p>
                  <strong>Network:</strong> {networkInfo.displayName} ({networkInfo.chainId})
                </p>
                <a
                  href={`https://${network === 'testnet' ? 'testnet.' : ''}explorer.injective.network/account/${selectedWallet.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            );
          })()}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={loadWallets}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Wallets
        </Button>
      </div>
    </div>
  );
}

export default InjectiveWalletSelector;
