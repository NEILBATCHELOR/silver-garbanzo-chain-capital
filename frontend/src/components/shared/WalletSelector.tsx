/**
 * Wallet Selector Component
 * 
 * Reusable wallet selector that filters wallets by project and blockchain
 * Integrates with backend wallet decryption service
 * 
 * Features:
 * - Project-scoped wallet filtering
 * - Blockchain-specific filtering (optional)
 * - Network filtering (mainnet/testnet)
 * - Balance display
 * - Private key decryption in background
 * - Secure handling of decrypted keys
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';
import { projectWalletService, ProjectWalletData } from '@/services/project/project-wallet-service';
import { WalletEncryptionClient } from '@/services/security/walletEncryptionService';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/utils';

interface WalletSelectorProps {
  projectId: string;
  blockchain?: string; // Filter by blockchain (e.g., 'injective', 'xrpl', 'solana')
  network?: 'mainnet' | 'testnet' | 'all';
  value?: string; // Selected wallet ID
  onWalletSelect?: (wallet: ProjectWalletData & { decryptedPrivateKey?: string }) => void;
  placeholder?: string;
  className?: string;
  showBalance?: boolean;
  autoDecrypt?: boolean; // Automatically decrypt private key in background
}

export function WalletSelector({
  projectId,
  blockchain,
  network = 'all',
  value,
  onWalletSelect,
  placeholder = 'Select wallet',
  className,
  showBalance = true,
  autoDecrypt = false
}: WalletSelectorProps) {
  const [wallets, setWallets] = useState<ProjectWalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decryptingWallet, setDecryptingWallet] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadWallets();
  }, [projectId, blockchain, network]);

  // Helper to determine blockchain from wallet data
  const getWalletBlockchain = (wallet: ProjectWalletData): string => {
    // Check non-EVM networks first
    if (wallet.non_evm_network) {
      const network = wallet.non_evm_network.toLowerCase();
      if (network.includes('xrpl') || network.includes('ripple')) return 'xrpl';
      if (network.includes('solana')) return 'solana';
      if (network.includes('injective')) return 'injective';
      return network;
    }
    
    // Check chain ID for EVM chains
    if (wallet.chain_id) {
      const chainId = wallet.chain_id;
      if (chainId === '1776' || chainId === '1439') return 'injective'; // Injective EVM
      if (chainId === '1') return 'ethereum';
      if (chainId === '137') return 'polygon';
      if (chainId === '56') return 'bsc';
      if (chainId === '43114') return 'avalanche';
      if (chainId === '42161') return 'arbitrum';
      if (chainId === '10') return 'optimism';
      if (chainId === '8453') return 'base';
    }
    
    // Fallback to wallet_type if available
    if (wallet.wallet_type) {
      return wallet.wallet_type.toLowerCase();
    }
    
    return 'unknown';
  };

  const loadWallets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch project wallets
      const projectWallets = await projectWalletService.getProjectWallets(projectId);

      // Filter by blockchain if specified
      let filteredWallets = projectWallets;
      if (blockchain) {
        filteredWallets = projectWallets.filter(w => {
          const walletBlockchain = getWalletBlockchain(w);
          return walletBlockchain === blockchain.toLowerCase();
        });
      }

      // Filter by network if specified
      if (network !== 'all') {
        filteredWallets = filteredWallets.filter(w => {
          const walletNetwork = w.net?.toLowerCase() || '';
          if (network === 'mainnet') {
            return walletNetwork === 'mainnet' || (!walletNetwork.includes('test') && !walletNetwork.includes('dev'));
          } else {
            return walletNetwork.includes('test') || walletNetwork.includes('dev');
          }
        });
      }

      setWallets(filteredWallets);
    } catch (err: any) {
      console.error('Error loading wallets:', err);
      setError(err.message || 'Failed to load wallets');
      toast({
        title: 'Error Loading Wallets',
        description: err.message || 'Failed to load project wallets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const decryptPrivateKey = async (encryptedKey: string): Promise<string | null> => {
    try {
      // Use WalletEncryptionClient which handles API base URL and proper formatting
      return await WalletEncryptionClient.decrypt(encryptedKey);
    } catch (err: any) {
      console.error('Error decrypting private key:', err);
      
      // Provide more helpful error message
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        toast({
          title: 'Backend Not Available',
          description: 'Unable to reach decryption service. Please ensure the backend server is running on port 3001.',
          variant: 'destructive'
        });
      }
      
      return null;
    }
  };

  const handleWalletChange = async (walletId: string) => {
    const selectedWallet = wallets.find(w => w.id === walletId);
    
    if (!selectedWallet || !onWalletSelect) return;

    // If auto-decrypt is enabled and wallet has private key
    if (autoDecrypt && selectedWallet.private_key) {
      setDecryptingWallet(walletId);
      
      try {
        const decryptedKey = await decryptPrivateKey(selectedWallet.private_key);
        
        if (decryptedKey) {
          onWalletSelect({
            ...selectedWallet,
            decryptedPrivateKey: decryptedKey
          });
        } else {
          // Decryption failed, still return wallet without key
          toast({
            title: 'Decryption Failed',
            description: 'Unable to decrypt wallet private key',
            variant: 'destructive'
          });
          onWalletSelect(selectedWallet);
        }
      } catch (err: any) {
        console.error('Error in wallet selection:', err);
        onWalletSelect(selectedWallet);
      } finally {
        setDecryptingWallet(null);
      }
    } else {
      // No auto-decrypt, return wallet as-is
      onWalletSelect(selectedWallet);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length < 16) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getNetworkBadge = (wallet: ProjectWalletData) => {
    const networkLower = wallet.net?.toLowerCase() || '';
    if (networkLower.includes('mainnet') || networkLower === 'mainnet') {
      return <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1 py-0">Main</Badge>;
    } else if (networkLower.includes('testnet') || networkLower === 'testnet') {
      return <Badge variant="default" className="bg-blue-500 text-white text-[10px] px-1 py-0">Test</Badge>;
    } else if (networkLower.includes('devnet') || networkLower === 'devnet') {
      return <Badge variant="default" className="bg-purple-500 text-white text-[10px] px-1 py-0">Dev</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 border rounded-md bg-muted", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading wallets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 border rounded-md bg-destructive/10 border-destructive", className)}>
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">Error loading wallets</span>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 border rounded-md bg-muted", className)}>
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No wallets available</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleWalletChange}>
      <SelectTrigger className={cn("w-[250px]", className)}>
        <SelectValue placeholder={placeholder}>
          {decryptingWallet ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Decrypting...</span>
            </div>
          ) : value && wallets.find(w => w.id === value) ? (
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="font-mono text-sm">
                {formatAddress(wallets.find(w => w.id === value)!.wallet_address)}
              </span>
              {getNetworkBadge(wallets.find(w => w.id === value)!)}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {wallets.map((wallet) => {
          const walletBlockchain = getWalletBlockchain(wallet);
          
          return (
            <SelectItem key={wallet.id} value={wallet.id!}>
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-mono text-sm">{formatAddress(wallet.wallet_address)}</span>
                  {getNetworkBadge(wallet)}
                </div>
                <div className="flex items-center gap-2">
                  {walletBlockchain !== 'unknown' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {walletBlockchain.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default WalletSelector;
