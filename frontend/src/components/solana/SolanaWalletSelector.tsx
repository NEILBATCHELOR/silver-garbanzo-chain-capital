/**
 * Solana Wallet Selector Component
 * 
 * Allows selecting a project Solana wallet for funding operations
 * Automatically filters by network (mainnet-beta, devnet, testnet)
 * Decrypts private key on selection for immediate use
 * 
 * Usage:
 * ```tsx
 * <SolanaWalletSelector
 *   projectId="proj-123"
 *   network="devnet"
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

interface SolanaWallet {
  id: string;
  wallet_address: string;
  private_key: string;
  non_evm_network: string; // 'mainnet-beta', 'devnet', 'testnet'
  project_wallet_name: string | null;
  balance?: string; // SOL balance (if available)
}

export interface SelectedSolanaWallet {
  walletId: string;
  address: string;
  privateKey: string; // Decrypted
  network: string;
}

interface SolanaWalletSelectorProps {
  projectId: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  onWalletSelected: (wallet: SelectedSolanaWallet) => void;
  onError?: (error: string) => void;
  label?: string;
  description?: string;
  autoSelectFirst?: boolean; // Auto-select first wallet on load
  showBalance?: boolean; // Show SOL balance (if available)
  required?: boolean; // Mark as required field
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SolanaWalletSelector({
  projectId,
  network,
  onWalletSelected,
  onError,
  label = 'Funding Wallet',
  description = 'This wallet will be used to fund the transaction',
  autoSelectFirst = true,
  showBalance = true,
  required = false
}: SolanaWalletSelectorProps) {
  const { toast } = useToast();

  const [wallets, setWallets] = useState<SolanaWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Solana wallets for this project and network
  useEffect(() => {
    loadWallets();
  }, [projectId, network]);

  /**
   * Load Solana wallets from database
   * Filters by project ID, wallet type, and network
   */
  const loadWallets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`[SolanaWalletSelector] Loading Solana wallets for project: ${projectId}, network: ${network}`);

      const { data, error: dbError } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('project_id', projectId)
        .eq('wallet_type', 'solana')
        .eq('non_evm_network', network)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      console.log(`[SolanaWalletSelector] Found ${data?.length || 0} Solana wallets`);

      setWallets(data || []);

      // Auto-select first wallet if available and autoSelectFirst is enabled
      if (autoSelectFirst && data && data.length > 0) {
        await handleWalletSelect(data[0].id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load wallets';
      console.error('[SolanaWalletSelector] Error loading wallets:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle wallet selection
   * Decrypts private key and emits to parent
   */
  const handleWalletSelect = async (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    setSelectedWalletId(walletId);
    setIsDecrypting(true);
    setError(null);

    try {
      console.log(`[SolanaWalletSelector] Decrypting wallet: ${wallet.wallet_address}`);

      // Decrypt private key
      const isEncrypted = WalletEncryptionClient.isEncrypted(wallet.private_key);
      const privateKey = isEncrypted
        ? await WalletEncryptionClient.decrypt(wallet.private_key)
        : wallet.private_key;

      console.log(`[SolanaWalletSelector] Private key decrypted successfully`);

      // Emit selected wallet to parent
      onWalletSelected({
        walletId: wallet.id,
        address: wallet.wallet_address,
        privateKey,
        network: wallet.non_evm_network
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to decrypt wallet';
      console.error('[SolanaWalletSelector] Decryption error:', errorMsg);
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

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

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

  // ============================================================================
  // RENDER: NO WALLETS FOUND
  // ============================================================================

  if (wallets.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}{required && <span className="text-red-500">*</span>}</Label>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Solana Wallets Found</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              No Solana wallets found for <strong>{network}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please create a wallet first in the project wallets section.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWallets}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================================
  // RENDER: WALLET SELECTOR
  // ============================================================================

  return (
    <div className="space-y-2">
      <Label htmlFor="solana-wallet-selector">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Select
        value={selectedWalletId}
        onValueChange={handleWalletSelect}
        disabled={isDecrypting || wallets.length === 0}
      >
        <SelectTrigger id="solana-wallet-selector" className="w-full">
          <SelectValue placeholder="Select a wallet..." />
        </SelectTrigger>
        <SelectContent>
          {wallets.map((wallet) => (
            <SelectItem key={wallet.id} value={wallet.id}>
              <div className="flex items-center justify-between w-full gap-4">
                {/* Wallet Info */}
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 flex-shrink-0" />
                  <span className="font-mono text-xs">
                    {wallet.project_wallet_name || 
                     BalanceFormatter.formatAddress(wallet.wallet_address, 6)}
                  </span>
                </div>
                
                {/* Balance (if available and showBalance is true) */}
                {showBalance && wallet.balance && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {wallet.balance} SOL
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Loading state during decryption */}
      {isDecrypting && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Decrypting wallet...
        </p>
      )}

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Description */}
      {description && !error && !isDecrypting && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}

      {/* Selected wallet details */}
      {selectedWalletId && !isDecrypting && !error && (
        <div className="text-xs text-muted-foreground space-y-1 pt-1">
          {(() => {
            const selectedWallet = wallets.find(w => w.id === selectedWalletId);
            if (!selectedWallet) return null;
            
            return (
              <>
                <p>
                  <strong>Address:</strong>{' '}
                  <span className="font-mono">
                    {BalanceFormatter.formatAddress(selectedWallet.wallet_address, 8)}
                  </span>
                </p>
                <p>
                  <strong>Network:</strong> {selectedWallet.non_evm_network}
                </p>
                <a
                  href={`https://explorer.solana.com/address/${selectedWallet.wallet_address}?cluster=${selectedWallet.non_evm_network === 'mainnet-beta' ? 'mainnet' : selectedWallet.non_evm_network}`}
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

      {/* Refresh button */}
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

export default SolanaWalletSelector;
