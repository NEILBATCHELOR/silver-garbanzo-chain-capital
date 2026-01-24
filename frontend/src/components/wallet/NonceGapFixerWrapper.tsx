/**
 * Nonce Gap Fixer Wrapper
 * 
 * Wrapper component that provides wallet selection and handles
 * provider/wallet setup for the NonceGapFixer component
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { NonceGapFixer } from './NonceGapFixer';
import { internalWalletService } from '@/services/wallet/InternalWalletService';
import { keyVaultClient } from '@/infrastructure/keyVault/keyVaultClient';
import { getRpcUrl } from '@/infrastructure/web3/rpc/rpc-config';
import { getChainInfo, CHAIN_IDS, CHAIN_ID_TO_NAME } from '@/infrastructure/web3/utils/chainIds';
import { supabase } from '@/infrastructure/database/client';

interface WalletOption {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  chainId: number;
  type: 'project' | 'user' | 'multisig';
  hasVaultKey: boolean;
  vaultId: string | null;
}

interface NonceGapFixerWrapperProps {
  projectId?: string;
}

export function NonceGapFixerWrapper({ projectId }: NonceGapFixerWrapperProps) {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(''); // Initialize with empty string instead of null
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  // Load available wallets on mount
  useEffect(() => {
    loadWallets();
  }, [projectId]);

  // Load wallet details when selection changes
  useEffect(() => {
    if (selectedWalletId) {
      loadWalletDetails(selectedWalletId);
    } else {
      setProvider(null);
      setWallet(null);
      setError(null);
    }
  }, [selectedWalletId]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const options: WalletOption[] = [];

      // Use InternalWalletService to get wallets with proper balance configuration
      // This uses the same RPC/balance checking technique as EnhancedWalletList
      
      // Load project wallets if projectId is provided
      if (projectId) {
        console.log('🔍 [NonceGapFixerWrapper] Loading project wallets...');
        const allWallets = await internalWalletService.refreshAllBalances(projectId);
        
        for (const pw of allWallets.projectWallets) {
          // Only include EVM wallets with chain IDs and vault keys
          if (pw.chainId && pw.vaultId) {
            const chainIdNum = parseInt(pw.chainId, 10);
            if (!isNaN(chainIdNum)) {
              const chainInfo = getChainInfo(chainIdNum);
              // Use CHAIN_ID_TO_NAME for RPC identifier, not display name
              const blockchain = CHAIN_ID_TO_NAME[chainIdNum] || 'ethereum';
              
              options.push({
                id: pw.id,
                name: pw.projectWalletName || `Project Wallet ${pw.id.slice(0, 8)}`,
                address: pw.address,
                blockchain: blockchain,
                chainId: chainIdNum,
                hasVaultKey: !!pw.vaultId,
                vaultId: pw.vaultId,
                type: 'project'
              });
            }
          }
        }
        console.log(`✅ [NonceGapFixerWrapper] Loaded ${options.length} project wallets`);
      }

      // Load user EOA wallets - using same method as EnhancedWalletList
      console.log('🔍 [NonceGapFixerWrapper] Loading user EOA wallets...');
      const userWallets = await internalWalletService.refreshAllUserWalletBalances(true);
      
      for (const uw of userWallets) {
        // Map blockchain name to chain ID using getChainInfo
        const blockchainLower = uw.blockchain.toLowerCase();
        let chainIdNum: number | undefined;

        // Try to find matching chain ID from blockchain name
        if (blockchainLower === 'ethereum' || blockchainLower === 'eth') {
          chainIdNum = CHAIN_IDS.ethereum;
        } else if (blockchainLower === 'sepolia') {
          chainIdNum = CHAIN_IDS.sepolia;
        } else if (blockchainLower === 'polygon') {
          chainIdNum = CHAIN_IDS.polygon;
        } else if (blockchainLower === 'arbitrum') {
          chainIdNum = CHAIN_IDS.arbitrumOne;
        } else if (blockchainLower === 'base') {
          chainIdNum = CHAIN_IDS.base;
        } else if (blockchainLower === 'optimism') {
          chainIdNum = CHAIN_IDS.optimism;
        } else if (blockchainLower === 'hoodi') {
          chainIdNum = CHAIN_IDS.hoodi;
        }

        if (chainIdNum && uw.vaultId) {
          options.push({
            id: uw.id,
            name: uw.userName || `User Wallet ${uw.id.slice(0, 8)}`,
            address: uw.address,
            blockchain: uw.blockchain,
            chainId: chainIdNum,
            hasVaultKey: !!uw.vaultId,
            vaultId: uw.vaultId,
            type: 'user'
          });
        }
      }
      console.log(`✅ [NonceGapFixerWrapper] Loaded ${userWallets.length} user wallets, ${options.length} total EVM wallets with vault keys`);

      setWallets(options);

      if (options.length === 0) {
        setError('No EVM wallets with vault keys found. Please create a wallet first.');
      }
    } catch (err) {
      console.error('Failed to load wallets:', err);
      toast({
        title: 'Failed to load wallets',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWalletDetails = async (walletId: string) => {
    try {
      setLoading(true);
      setError(null);

      const selectedWallet = wallets.find(w => w.id === walletId);
      if (!selectedWallet) {
        throw new Error('Wallet not found');
      }

      // Check if wallet has a vault ID
      if (!selectedWallet.vaultId) {
        setError('This wallet does not have a private key in the key vault. Nonce gap fixing requires direct wallet access.');
        return;
      }

      // Get private key from key vault using singleton instance
      const keyResult = await keyVaultClient.getKey(selectedWallet.vaultId);
      
      if (!keyResult) {
        throw new Error('Failed to retrieve private key from key vault');
      }

      // KeyResult can be either a string (private key) or KeyData object
      const privateKey = typeof keyResult === 'string' ? keyResult : keyResult.privateKey;

      // Get chain info for network configuration
      const chainInfo = getChainInfo(selectedWallet.chainId);
      if (!chainInfo) {
        throw new Error(`Unsupported chain ID: ${selectedWallet.chainId}`);
      }

      // Determine if testnet
      const isTestnet = chainInfo.type === 'testnet';

      // CRITICAL: Normalize blockchain name to lowercase for getRpcUrl
      // Database might store "Base", "Ethereum", "Hoodi" but getRpcUrl expects lowercase
      const normalizedBlockchain = selectedWallet.blockchain.toLowerCase();
      
      console.log('🔧 [NonceGapFixerWrapper] RPC Configuration:', {
        originalBlockchain: selectedWallet.blockchain,
        normalizedBlockchain,
        isTestnet,
        chainId: selectedWallet.chainId,
        chainName: chainInfo.name
      });

      // Get RPC URL for the blockchain
      const rpcUrl = getRpcUrl(normalizedBlockchain);
      
      console.log('🔧 [NonceGapFixerWrapper] RPC URL resolved:', rpcUrl);
      
      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for ${selectedWallet.blockchain} (${normalizedBlockchain})`);
      }

      // Create provider WITH network configuration (critical for proper nonce/balance reading)
      // staticNetwork: true prevents ethers from trying to detect network and causing conflicts
      const newProvider = new ethers.JsonRpcProvider(
        rpcUrl,
        {
          chainId: selectedWallet.chainId,
          name: chainInfo.name
        },
        {
          staticNetwork: true, // Prevents network detection attempts and "network changed" errors
          batchMaxCount: 1 // Disable batching to avoid wallet prompts
        }
      );

      // Verify connection before proceeding
      try {
        const blockNumber = await newProvider.getBlockNumber();
        console.log(`✅ RPC verified: Chain ${selectedWallet.chainId} (${chainInfo.name}), Block ${blockNumber}`);
      } catch (error) {
        console.error('❌ RPC verification failed:', error);
        throw new Error(
          `RPC connection failed for ${chainInfo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Create wallet instance with private key
      const newWallet = new ethers.Wallet(privateKey, newProvider);

      // Verify address matches
      if (newWallet.address.toLowerCase() !== selectedWallet.address.toLowerCase()) {
        throw new Error('Wallet address mismatch. The private key does not match the wallet address.');
      }

      setProvider(newProvider);
      setWallet(newWallet);

    } catch (err) {
      console.error('Failed to load wallet details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Failed to load wallet',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFixed = () => {
    toast({
      title: 'Nonce Gap Fixed',
      description: 'The nonce gap has been successfully resolved.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Wallet Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Wallet</CardTitle>
          <CardDescription>
            Choose a wallet to check and fix nonce gaps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedWalletId} 
            onValueChange={setSelectedWalletId}
            disabled={loading || wallets.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a wallet..." />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name} - {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} ({wallet.blockchain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {wallets.length === 0 && !loading && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No EVM wallets found. Please create a wallet first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading wallet details...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Nonce Gap Fixer */}
      {selectedWallet && provider && wallet && !loading && !error && (
        <NonceGapFixer
          address={selectedWallet.address}
          chainId={selectedWallet.chainId}
          provider={provider}
          wallet={wallet}
          onFixed={handleFixed}
        />
      )}
    </div>
  );
}
