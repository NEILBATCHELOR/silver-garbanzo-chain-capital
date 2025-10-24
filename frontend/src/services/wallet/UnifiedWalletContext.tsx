/**
 * Unified Wallet Context
 * 
 * Combines the best features from both WalletContext and EnhancedWalletContext:
 * - EIP-1193 compliance and error handling (from Enhanced)
 * - API integration with database persistence (from Original)
 * - User-initiated connections only (from Enhanced)
 * - Modular architecture with useEnhancedWalletManager (from Enhanced)
 * - Supabase fallback for resilience (from Original concept)
 * 
 * Key Features:
 * - ✅ Prevents automatic wallet connections (fixes error code 4001)
 * - ✅ Database persistence via API
 * - ✅ Supabase direct access as fallback
 * - ✅ localStorage as final fallback
 * - ✅ Better error handling with specific error codes
 * - ✅ Optional WebSocket support
 * - ✅ Web3 connection status management
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletAddressReceiver, WalletAddressMessage } from '@/services/wallet/WalletAddressReceiver';
import { ETHWalletGenerator, GeneratedWallet } from '@/services/wallet/generators/ETHWalletGenerator';
import { useToast } from '@/components/ui/use-toast';
import { balanceService } from '@/services/wallet/balances/BalanceService';
import { walletApiService } from '@/services/wallet/WalletApiService';
import { supabase } from '@/infrastructure/database/client';
import { 
  useEnhancedWalletManager,
  WalletType,
  WalletConnectionStatus,
  type WalletConnection
} from '@/hooks/wallet/useEnhancedWalletManager';

// Wallet types
export type WalletTypeCompat = 'eoa' | 'multisig';

export interface Wallet {
  id: string;
  name: string;
  address: string;
  type: WalletTypeCompat;
  network: string;
  balance?: string;
  owners?: string[];
  threshold?: number;
  createdAt: Date;
}

  // Unified context interface combining both contexts
interface UnifiedWalletContextProps {
  // Core wallet management (from both contexts)
  wallets: Wallet[];
  loading: boolean;
  error: string | null;
  selectedWallet: Wallet | null;
  receivedAddresses: WalletAddressMessage[];
  wsConnected: boolean;
  
  // Enhanced Web3 wallet connection (from EnhancedWalletContext)
  web3Connection: WalletConnection;
  isConnectingWeb3: boolean;
  
  // Actions (combined from both)
  createWallet: (name: string, type: WalletTypeCompat, network: string) => Promise<Wallet>;
  selectWallet: (walletId: string) => void;
  generateNewAddress: () => GeneratedWallet;
  importWallet: (privateKey: string, name: string, network: string) => Promise<Wallet>;
  clearReceivedAddresses: () => void;
  reconnectWebSocket: () => void;
  connectWeb3Wallet: (type: WalletType, userInitiated?: boolean) => Promise<boolean>;
  disconnectWeb3Wallet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  cleanupStaleWallets: () => Promise<void>; // New cleanup function
}

// Default context value
const defaultContextValue: UnifiedWalletContextProps = {
  wallets: [],
  loading: false,
  error: null,
  selectedWallet: null,
  receivedAddresses: [],
  wsConnected: false,
  web3Connection: {
    type: WalletType.METAMASK,
    address: null,
    chainId: null,
    status: WalletConnectionStatus.DISCONNECTED
  },
  isConnectingWeb3: false,
  createWallet: async () => { throw new Error('Not implemented'); },
  selectWallet: () => {},
  generateNewAddress: () => { throw new Error('Not implemented'); },
  importWallet: async () => { throw new Error('Not implemented'); },
  clearReceivedAddresses: () => {},
  reconnectWebSocket: () => {},
  connectWeb3Wallet: async () => false,
  disconnectWeb3Wallet: async () => {},
  refreshBalances: async () => {},
  cleanupStaleWallets: async () => {},
};

// Create the unified context
const UnifiedWalletContext = createContext<UnifiedWalletContextProps>(defaultContextValue);

// WebSocket URL (optional - only if configured)
const WS_URL = import.meta.env.VITE_WALLET_WS_URL;

// Unified Provider Component
export const UnifiedWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [receivedAddresses, setReceivedAddresses] = useState<WalletAddressMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [addressReceiver, setAddressReceiver] = useState<WalletAddressReceiver | null>(null);

  // Enhanced Web3 wallet management (from EnhancedWalletContext)
  const walletManager = useEnhancedWalletManager();

  // Initialize WebSocket connection only if URL is provided
  useEffect(() => {
    if (!WS_URL) {
      console.log('[UnifiedWallet] WebSocket disabled - VITE_WALLET_WS_URL not configured');
      return;
    }

    console.log('[UnifiedWallet] Initializing WebSocket connection');
    const receiver = new WalletAddressReceiver(WS_URL);
    
    receiver.onConnected(() => {
      setWsConnected(true);
      setError(null);
      console.log('[UnifiedWallet] WebSocket connected');
    });
    
    receiver.onNewAddress((address) => {
      setReceivedAddresses(prev => [...prev, address]);
      console.log('[UnifiedWallet] New address received:', address);
    });
    
    receiver.onError(() => {
      setWsConnected(false);
      // WebSocket is optional - don't set error state
      console.log('[UnifiedWallet] WebSocket connection failed - this is optional functionality');
    });
    
    receiver.connect();
    setAddressReceiver(receiver);
    
    return () => {
      receiver.disconnect();
      console.log('[UnifiedWallet] WebSocket disconnected');
    };
  }, []);

  // Load wallets from API → Supabase → localStorage (NON-AUTOMATIC - only on mount)
  useEffect(() => {
    const loadWallets = async () => {
      setLoading(true);
      console.log('[UnifiedWallet] Loading wallets...');
      
      try {
        // Strategy 1: Try API service first
        console.log('[UnifiedWallet] Attempting to load from API...');
        const apiWallets = await walletApiService.getUserWallets();
        
        if (apiWallets && apiWallets.length > 0) {
          console.log('[UnifiedWallet] Loaded', apiWallets.length, 'wallets from API');
          const loadedWallets: Wallet[] = apiWallets.map(apiWallet => ({
            id: apiWallet.id,
            name: apiWallet.name,
            address: apiWallet.primary_address,
            type: apiWallet.wallet_type as WalletTypeCompat,
            network: apiWallet.blockchain,
            balance: '0', // Will be updated by balance service
            createdAt: new Date(apiWallet.created_at),
          }));
          
          setWallets(loadedWallets);
          
          // Select first wallet by default if none selected
          if (loadedWallets.length > 0 && !selectedWallet) {
            setSelectedWallet(loadedWallets[0]);
          }
          
          setError(null);
          setLoading(false);
          return; // Success - exit early
        }
      } catch (apiError) {
        console.warn('[UnifiedWallet] API loading failed, trying Supabase fallback:', apiError);
      }

      // Strategy 2: Try Supabase direct access
      try {
        console.log('[UnifiedWallet] Attempting to load from Supabase...');
        const { data: supabaseWallets, error: supabaseError } = await supabase
          .from('wallets')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!supabaseError && supabaseWallets && supabaseWallets.length > 0) {
          console.log('[UnifiedWallet] Loaded', supabaseWallets.length, 'wallets from Supabase');
          const loadedWallets: Wallet[] = supabaseWallets.map(wallet => ({
            id: wallet.id,
            name: wallet.name || 'Unnamed Wallet',
            address: wallet.primary_address,
            type: (wallet.wallet_type as WalletTypeCompat) || 'eoa',
            network: wallet.blockchain || 'ethereum',
            balance: '0',
            createdAt: new Date(wallet.created_at),
          }));
          
          setWallets(loadedWallets);
          
          if (loadedWallets.length > 0 && !selectedWallet) {
            setSelectedWallet(loadedWallets[0]);
          }
          
          setError(null);
          setLoading(false);
          return; // Success - exit early
        }
        
        if (supabaseError) {
          console.warn('[UnifiedWallet] Supabase error:', supabaseError);
        }
      } catch (supabaseError) {
        console.warn('[UnifiedWallet] Supabase loading failed, trying localStorage:', supabaseError);
      }

      // Strategy 3: Final fallback to localStorage
      try {
        console.log('[UnifiedWallet] Attempting to load from localStorage...');
        const storedWallets = localStorage.getItem('userWallets');
        let loadedWallets: Wallet[] = [];
        
        if (storedWallets) {
          loadedWallets = JSON.parse(storedWallets).map((w: any) => ({
            ...w,
            createdAt: new Date(w.createdAt)
          }));
          
          console.log('[UnifiedWallet] Loaded', loadedWallets.length, 'wallets from localStorage');
        } else {
          console.log('[UnifiedWallet] No wallets found in localStorage');
        }
        
        setWallets(loadedWallets);
        
        if (loadedWallets.length > 0 && !selectedWallet) {
          setSelectedWallet(loadedWallets[0]);
        }
        
        setError(null);
      } catch (localError) {
        console.error('[UnifiedWallet] All wallet loading strategies failed:', localError);
        setError('Failed to load wallets from all sources');
      } finally {
        setLoading(false);
      }
    };
    
    loadWallets();
  }, []); // Only run once on mount

  // Auto-cleanup stale wallets after initial load
  useEffect(() => {
    if (!loading && wallets.length > 0) {
      // Small delay to ensure all initial loading is complete
      const timer = setTimeout(() => {
        cleanupStaleWallets();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading]); // Run when loading completes

  // Helper function to save wallets to localStorage
  const saveWalletsToStorage = (wallets: Wallet[]) => {
    try {
      localStorage.setItem('userWallets', JSON.stringify(wallets));
    } catch (error) {
      console.error('[UnifiedWallet] Failed to save wallets to localStorage:', error);
    }
  };

  // Create a new wallet with API integration and fallbacks
  const createWallet = async (name: string, type: WalletTypeCompat, network: string): Promise<Wallet> => {
    setLoading(true);
    console.log('[UnifiedWallet] Creating wallet:', { name, type, network });
    
    try {
      // Strategy 1: Try API service first
      try {
        console.log('[UnifiedWallet] Creating wallet via API...');
        const apiResponse = await walletApiService.createWallet({
          name,
          wallet_type: type === 'eoa' ? 'eoa' : 'smart_contract',
          blockchains: [network]
        });

        const newWallet: Wallet = {
          id: apiResponse.id,
          name: apiResponse.name,
          address: apiResponse.primary_address,
          type,
          network,
          balance: '0',
          createdAt: new Date(apiResponse.created_at),
        };

        // Update local state
        const updatedWallets = [...wallets, newWallet];
        setWallets(updatedWallets);
        saveWalletsToStorage(updatedWallets);
        
        console.log('[UnifiedWallet] Wallet created successfully via API');
        toast({
          title: "Wallet Created Successfully",
          description: `${name} created with address ${newWallet.address.slice(0, 10)}...`,
        });
        
        return newWallet;
      } catch (apiError) {
        console.warn('[UnifiedWallet] API wallet creation failed, trying Supabase:', apiError);
        
        // Strategy 2: Try Supabase direct insertion
        const generated = ETHWalletGenerator.generateMultipleWallets(1, { includePrivateKey: false })[0];
        
        const { data: supabaseWallet, error: supabaseError } = await supabase
          .from('wallets')
          .insert({
            name,
            wallet_type: type === 'eoa' ? 'eoa' : 'smart_contract',
            primary_address: generated.address,
            blockchain: network,
          })
          .select()
          .single();
        
        if (supabaseError) {
          throw new Error(`Supabase insertion failed: ${supabaseError.message}`);
        }

        const newWallet: Wallet = {
          id: supabaseWallet.id,
          name: supabaseWallet.name,
          address: supabaseWallet.primary_address,
          type,
          network,
          balance: '0',
          createdAt: new Date(supabaseWallet.created_at),
        };
        
        const updatedWallets = [...wallets, newWallet];
        setWallets(updatedWallets);
        saveWalletsToStorage(updatedWallets);
        
        console.log('[UnifiedWallet] Wallet created successfully via Supabase');
        toast({
          title: "Wallet Created Successfully",
          description: `${name} created with address ${newWallet.address.slice(0, 10)}...`,
        });
        
        return newWallet;
      }
    } catch (err) {
      // Strategy 3: Final fallback - localStorage only (no database)
      console.warn('[UnifiedWallet] Database creation failed, falling back to localStorage only:', err);
      
      const generated = ETHWalletGenerator.generateMultipleWallets(1, { includePrivateKey: false })[0];
      
      const newWallet: Wallet = {
        id: Date.now().toString(),
        name,
        address: generated.address,
        type,
        network,
        balance: '0',
        createdAt: new Date(),
      };
      
      const updatedWallets = [...wallets, newWallet];
      setWallets(updatedWallets);
      saveWalletsToStorage(updatedWallets);
      
      toast({
        title: "Wallet Created (Local Only)",
        description: `${name} created locally. Database sync failed.`,
        variant: "default"
      });
      
      return newWallet;
    } finally {
      setLoading(false);
    }
  };

  // Select a wallet
  const selectWallet = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId) || null;
    setSelectedWallet(wallet);
    console.log('[UnifiedWallet] Selected wallet:', wallet?.name);
  };

  // Generate a new ETH address
  const generateNewAddress = (): GeneratedWallet => {
    try {
      return ETHWalletGenerator.generateMultipleWallets(1, { includePrivateKey: true })[0];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate address';
      setError(errorMessage);
      console.error('[UnifiedWallet] Generate address failed:', err);
      throw new Error(errorMessage);
    }
  };

  // Import a wallet using private key
  const importWallet = async (privateKey: string, name: string, network: string): Promise<Wallet> => {
    setLoading(true);
    try {
      const imported = ETHWalletGenerator.fromPrivateKey(privateKey, { includePrivateKey: false });
      
      const newWallet: Wallet = {
        id: Date.now().toString(),
        name,
        address: imported.address,
        type: 'eoa',
        network,
        balance: '0',
        createdAt: new Date(),
      };
      
      const updatedWallets = [...wallets, newWallet];
      setWallets(updatedWallets);
      saveWalletsToStorage(updatedWallets);
      
      console.log('[UnifiedWallet] Wallet imported:', name);
      toast({
        title: "Wallet Imported",
        description: `${name} has been successfully imported`,
      });
      
      return newWallet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
      setError(errorMessage);
      console.error('[UnifiedWallet] Import wallet failed:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear received addresses
  const clearReceivedAddresses = () => {
    setReceivedAddresses([]);
    console.log('[UnifiedWallet] Cleared received addresses');
  };

  // Reconnect to WebSocket
  const reconnectWebSocket = () => {
    if (addressReceiver) {
      addressReceiver.disconnect();
      addressReceiver.connect();
      console.log('[UnifiedWallet] WebSocket reconnecting...');
    } else {
      console.warn('[UnifiedWallet] No WebSocket receiver to reconnect');
    }
  };

  // Enhanced Web3 wallet connection with EIP-1193 compliance
  const connectWeb3Wallet = async (type: WalletType, userInitiated: boolean = true): Promise<boolean> => {
    console.log('[UnifiedWallet] Connecting Web3 wallet:', { type, userInitiated });
    
    // CRITICAL: Use the enhanced wallet manager for EIP-1193 compliance
    const success = await walletManager.connectWallet(type, userInitiated);
    
    if (success) {
      console.log('[UnifiedWallet] Web3 wallet connected successfully');
      
      // Optionally sync with our wallet list
      if (walletManager.connection.address) {
        const existingWallet = wallets.find(
          w => w.address.toLowerCase() === walletManager.connection.address?.toLowerCase()
        );
        
        if (existingWallet) {
          setSelectedWallet(existingWallet);
          console.log('[UnifiedWallet] Selected existing wallet from connection');
        }
      }
      
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected",
      });
    }
    
    return success;
  };

  // Disconnect Web3 wallet
  const disconnectWeb3Wallet = async (): Promise<void> => {
    console.log('[UnifiedWallet] Disconnecting Web3 wallet');
    await walletManager.disconnectWallet();
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  // Refresh wallet balances
  const refreshBalances = async () => {
    if (!wallets.length) {
      console.log('[UnifiedWallet] No wallets to refresh');
      return;
    }
    
    setLoading(true);
    console.log('[UnifiedWallet] Refreshing balances for', wallets.length, 'wallets');
    
    try {
      const balancePromises = wallets.map(async (wallet) => {
        try {
          const walletBalance = await balanceService.fetchWalletBalance(wallet.address, wallet.network);
          return { ...wallet, balance: walletBalance.nativeBalance };
        } catch (err) {
          console.error('[UnifiedWallet] Failed to fetch balance for', wallet.address, err);
          return wallet;
        }
      });
      
      const updatedWallets = await Promise.all(balancePromises);
      setWallets(updatedWallets);
      saveWalletsToStorage(updatedWallets);
      
      console.log('[UnifiedWallet] Balances refreshed successfully');
      toast({
        title: "Balances Updated",
        description: "All wallet balances have been refreshed",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balances';
      setError(errorMessage);
      console.error('[UnifiedWallet] Balance refresh failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clean up stale wallets that don't exist in the database
  const cleanupStaleWallets = async () => {
    console.log('[UnifiedWallet] Cleaning up stale wallets...');
    
    try {
      // Get all wallet IDs from current state
      const walletIds = wallets.map(w => w.id);
      
      if (walletIds.length === 0) {
        console.log('[UnifiedWallet] No wallets to verify');
        return;
      }
      
      // Query database to verify which wallets actually exist
      const { data: existingWallets, error } = await supabase
        .from('wallets')
        .select('id, wallet_address')
        .in('id', walletIds);
      
      if (error) {
        console.error('[UnifiedWallet] Failed to verify wallets:', error);
        return;
      }
      
      // Create set of existing wallet IDs and addresses
      const existingIds = new Set(existingWallets?.map(w => w.id) || []);
      const existingAddresses = new Set(existingWallets?.map(w => w.wallet_address.toLowerCase()) || []);
      
      // Filter out wallets that don't exist in database (by ID or address)
      const validWallets = wallets.filter(wallet => 
        existingIds.has(wallet.id) || existingAddresses.has(wallet.address.toLowerCase())
      );
      
      const removedCount = wallets.length - validWallets.length;
      
      if (removedCount > 0) {
        console.log(`[UnifiedWallet] Removed ${removedCount} stale wallet(s)`);
        setWallets(validWallets);
        saveWalletsToStorage(validWallets);
        
        // Update selected wallet if it was removed
        if (selectedWallet && !validWallets.find(w => w.id === selectedWallet.id)) {
          setSelectedWallet(validWallets.length > 0 ? validWallets[0] : null);
        }
        
        toast({
          title: "Stale Wallets Removed",
          description: `Cleaned up ${removedCount} wallet(s) that no longer exist`,
        });
      } else {
        console.log('[UnifiedWallet] No stale wallets found');
      }
    } catch (err) {
      console.error('[UnifiedWallet] Cleanup failed:', err);
    }
  };

  // Context value
  const contextValue: UnifiedWalletContextProps = {
    wallets,
    loading,
    error,
    selectedWallet,
    receivedAddresses,
    wsConnected,
    web3Connection: walletManager.connection,
    isConnectingWeb3: walletManager.isConnecting,
    createWallet,
    selectWallet,
    generateNewAddress,
    importWallet,
    clearReceivedAddresses,
    reconnectWebSocket,
    connectWeb3Wallet,
    disconnectWeb3Wallet,
    refreshBalances,
    cleanupStaleWallets,
  };

  return (
    <UnifiedWalletContext.Provider value={contextValue}>
      {children}
    </UnifiedWalletContext.Provider>
  );
};

// Hook to use the unified wallet context
export const useWallet = () => {
  const context = useContext(UnifiedWalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a UnifiedWalletProvider');
  }
  return context;
};

// Export types for convenience
export type { 
  UnifiedWalletContextProps,
  WalletConnection,
};

export {
  WalletType,
  WalletConnectionStatus
};
