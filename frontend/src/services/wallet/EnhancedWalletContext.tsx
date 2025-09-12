/**
 * Enhanced Wallet Context
 * 
 * Updated to prevent automatic wallet connections and improve error handling.
 * This fixes the EIP-1193 error code 4001 by ensuring user-initiated connections only.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletAddressReceiver, WalletAddressMessage } from '@/services/wallet/WalletAddressReceiver';
import { ETHWalletGenerator, GeneratedWallet } from '@/services/wallet/generators/ETHWalletGenerator';
import { useToast } from '@/components/ui/use-toast';
import { balanceService } from '@/services/wallet/balances/BalanceService';
import { 
  useEnhancedWalletManager,
  WalletType,
  WalletConnectionStatus
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

// Enhanced context interface
interface EnhancedWalletContextProps {
  // Legacy wallet management (for backward compatibility)
  wallets: Wallet[];
  loading: boolean;
  error: string | null;
  selectedWallet: Wallet | null;
  receivedAddresses: WalletAddressMessage[];
  wsConnected: boolean;
  
  // Enhanced Web3 wallet connection
  web3Connection: ReturnType<typeof useEnhancedWalletManager>['connection'];
  isConnectingWeb3: boolean;
  connectWeb3Wallet: (type: WalletType, userInitiated?: boolean) => Promise<boolean>;
  disconnectWeb3Wallet: () => Promise<void>;
  
  // Legacy actions (maintained for compatibility)
  createWallet: (name: string, type: WalletTypeCompat, network: string) => Promise<Wallet>;
  selectWallet: (walletId: string) => void;
  generateNewAddress: () => GeneratedWallet;
  importWallet: (privateKey: string, name: string, network: string) => Promise<Wallet>;
  clearReceivedAddresses: () => void;
  reconnectWebSocket: () => void;
  refreshBalances: () => Promise<void>;
}

// Default context value
const defaultContextValue: EnhancedWalletContextProps = {
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
  connectWeb3Wallet: async () => false,
  disconnectWeb3Wallet: async () => {},
  createWallet: async () => { throw new Error('Not implemented'); },
  selectWallet: () => {},
  generateNewAddress: () => { throw new Error('Not implemented'); },
  importWallet: async () => { throw new Error('Not implemented'); },
  clearReceivedAddresses: () => {},
  reconnectWebSocket: () => {},
  refreshBalances: async () => {},
};

// Create the context
const EnhancedWalletContext = createContext<EnhancedWalletContextProps>(defaultContextValue);

// WebSocket URL for receiving addresses (only enable if explicitly configured)
const WS_URL = import.meta.env.VITE_WALLET_WS_URL;

// Provider component
export const EnhancedWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [receivedAddresses, setReceivedAddresses] = useState<WalletAddressMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [addressReceiver, setAddressReceiver] = useState<WalletAddressReceiver | null>(null);

  // Enhanced Web3 wallet management
  const walletManager = useEnhancedWalletManager();

  // Initialize WebSocket connection only if URL is provided
  useEffect(() => {
    if (!WS_URL) {
      console.log('WebSocket disabled - VITE_WALLET_WS_URL not configured');
      return;
    }

    const receiver = new WalletAddressReceiver(WS_URL);
    
    receiver.onConnected(() => {
      setWsConnected(true);
      setError(null);
    });
    
    receiver.onNewAddress((address) => {
      setReceivedAddresses(prev => [...prev, address]);
    });
    
    receiver.onError(() => {
      setWsConnected(false);
      // Don't set this as an error - WebSocket is optional
      console.log('WebSocket connection failed - this is optional functionality');
    });
    
    receiver.connect();
    setAddressReceiver(receiver);
    
    return () => {
      receiver.disconnect();
    };
  }, []);

  // Load wallets from storage (NON-AUTOMATIC - only on component mount)
  useEffect(() => {
    const loadWallets = async () => {
      try {
        const storedWallets = localStorage.getItem('userWallets');
        let loadedWallets: Wallet[] = [];
        
        if (storedWallets) {
          loadedWallets = JSON.parse(storedWallets).map((w: any) => ({
            ...w,
            createdAt: new Date(w.createdAt)
          }));
        }
        
        setWallets(loadedWallets);
        
        // Select the first wallet by default if none selected
        if (loadedWallets.length > 0 && !selectedWallet) {
          setSelectedWallet(loadedWallets[0]);
        }
      } catch (err) {
        console.error('Failed to load wallets from storage:', err);
        // Don't set this as an error - it's not critical
      }
    };
    
    loadWallets();
  }, []); // Only run once on mount

  // Helper function to save wallets to localStorage
  const saveWalletsToStorage = (wallets: Wallet[]) => {
    try {
      localStorage.setItem('userWallets', JSON.stringify(wallets));
    } catch (error) {
      console.error('Failed to save wallets to storage:', error);
    }
  };

  // Create a new wallet (legacy)
  const createWallet = async (name: string, type: WalletTypeCompat, network: string): Promise<Wallet> => {
    setLoading(true);
    try {
      let newWallet: Wallet;
      
      if (type === 'eoa') {
        const generated = ETHWalletGenerator.generateMultipleWallets(1, { includePrivateKey: false })[0];
        
        newWallet = {
          id: Date.now().toString(),
          name,
          address: generated.address,
          type,
          network,
          balance: '0',
          createdAt: new Date(),
        };
      } else {
        const generated = ETHWalletGenerator.generateMultipleWallets(1, { includePrivateKey: false })[0];
        
        newWallet = {
          id: Date.now().toString(),
          name,
          address: generated.address,
          type,
          network,
          balance: '0',
          owners: [generated.address],
          threshold: 1,
          createdAt: new Date(),
        };
      }
      
      const updatedWallets = [...wallets, newWallet];
      setWallets(updatedWallets);
      saveWalletsToStorage(updatedWallets);
      
      toast({
        title: "Wallet Created",
        description: `${name} has been successfully created`,
      });
      
      return newWallet;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Select a wallet
  const selectWallet = (walletId: string) => {
    const wallet = wallets.find(w => w.id === walletId) || null;
    setSelectedWallet(wallet);
  };

  // Generate a new ETH address
  const generateNewAddress = (): GeneratedWallet => {
    try {
      return ETHWalletGenerator.generateMultipleWallets(1, { includePrivateKey: true })[0];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate address';
      setError(errorMessage);
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
      
      toast({
        title: "Wallet Imported",
        description: `${name} has been successfully imported`,
      });
      
      return newWallet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear received addresses
  const clearReceivedAddresses = () => {
    setReceivedAddresses([]);
  };

  // Reconnect to WebSocket
  const reconnectWebSocket = () => {
    if (addressReceiver) {
      addressReceiver.disconnect();
      addressReceiver.connect();
    }
  };

  // Refresh wallet balances
  const refreshBalances = async () => {
    if (!wallets.length) return;
    
    setLoading(true);
    try {
      const balancePromises = wallets.map(wallet => 
        balanceService.fetchWalletBalance(wallet.address, wallet.network)
      );
      
      const balances = await Promise.all(balancePromises);
      
      const updatedWallets = wallets.map((wallet, index) => ({
        ...wallet,
        balance: balances[index].totalValueUsd.toFixed(2),
      }));
      
      setWallets(updatedWallets);
      saveWalletsToStorage(updatedWallets);
      
      toast({
        title: "Balances Updated",
        description: "All wallet balances have been refreshed",
      });
    } catch (error) {
      console.error('Error refreshing balances:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to refresh wallet balances",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <EnhancedWalletContext.Provider
      value={{
        // Legacy props
        wallets,
        loading,
        error,
        selectedWallet,
        receivedAddresses,
        wsConnected,
        
        // Enhanced Web3 props
        web3Connection: walletManager.connection,
        isConnectingWeb3: walletManager.isConnecting,
        connectWeb3Wallet: walletManager.connectWallet,
        disconnectWeb3Wallet: walletManager.disconnectWallet,
        
        // Legacy actions
        createWallet,
        selectWallet,
        generateNewAddress,
        importWallet,
        clearReceivedAddresses,
        reconnectWebSocket,
        refreshBalances,
      }}
    >
      {children}
    </EnhancedWalletContext.Provider>
  );
};

// Hook to use the enhanced wallet context
export const useEnhancedWallet = () => useContext(EnhancedWalletContext);

// Maintain backward compatibility
export const useWallet = useEnhancedWallet;
export const WalletProvider = EnhancedWalletProvider;

export default EnhancedWalletProvider;
