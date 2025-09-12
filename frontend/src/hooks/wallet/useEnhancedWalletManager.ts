/**
 * Enhanced Wallet Manager
 * 
 * Centralized wallet connection management that prevents automatic connections
 * and provides better error handling for all wallet types.
 * 
 * This fixes the EIP-1193 error code 4001 "User rejected the request"
 * by ensuring connections are only user-initiated.
 */

import { useState, useCallback } from 'react';
import { getEthereumProvider, type EthereumProvider } from '@/types/domain/blockchain/ethereum';
import { useToast } from '@/components/ui/use-toast';

export enum WalletConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  USER_REJECTED = 'user_rejected'
}

export enum WalletType {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  DFNS = 'dfns'
}

export interface WalletConnection {
  type: WalletType;
  address: string | null;
  chainId: number | null;
  status: WalletConnectionStatus;
  lastError?: string;
}

export interface UseEnhancedWalletManagerReturn {
  connection: WalletConnection;
  connectWallet: (type: WalletType, userInitiated?: boolean) => Promise<boolean>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<boolean>;
  isConnecting: boolean;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Enhanced wallet manager hook that prevents automatic connections
 */
export function useEnhancedWalletManager(): UseEnhancedWalletManagerReturn {
  const { toast } = useToast();
  
  const [connection, setConnection] = useState<WalletConnection>({
    type: WalletType.METAMASK,
    address: null,
    chainId: null,
    status: WalletConnectionStatus.DISCONNECTED
  });
  
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Safe ethereum provider request that handles user rejection gracefully
   */
  const safeEthereumRequest = useCallback(async (
    provider: EthereumProvider, 
    method: string, 
    params?: any[]
  ): Promise<any> => {
    try {
      return await provider.request({ method, params });
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 4001) {
        console.log('User rejected wallet connection request - this is normal behavior');
        throw new WalletConnectionError('User rejected the request', 'USER_REJECTED');
      } else if (error.code === -32002) {
        throw new WalletConnectionError('Request already pending. Please wait.', 'PENDING');
      } else {
        throw new WalletConnectionError(
          error.message || 'Wallet connection failed', 
          'CONNECTION_FAILED'
        );
      }
    }
  }, []);

  /**
   * Connect to a wallet with explicit user initiation check
   */
  const connectWallet = useCallback(async (
    type: WalletType, 
    userInitiated: boolean = true
  ): Promise<boolean> => {
    // CRITICAL: Only allow connection if user explicitly initiated it
    if (!userInitiated) {
      console.warn('Wallet connection blocked: Not user-initiated');
      return false;
    }

    setIsConnecting(true);
    setConnection(prev => ({
      ...prev,
      status: WalletConnectionStatus.CONNECTING,
      lastError: undefined
    }));

    try {
      let address: string | null = null;
      let chainId: number | null = null;

      switch (type) {
        case WalletType.METAMASK: {
          const provider = getEthereumProvider();
          if (!provider) {
            throw new WalletConnectionError(
              'MetaMask is not installed. Please install MetaMask and try again.',
              'NOT_INSTALLED'
            );
          }

          // Check if MetaMask is specifically available
          if (!(provider as any).isMetaMask) {
            throw new WalletConnectionError(
              'MetaMask not detected. Please make sure MetaMask is your default wallet.',
              'WRONG_WALLET'
            );
          }

          // Request account access with safe error handling
          const accounts = await safeEthereumRequest(provider, 'eth_requestAccounts');
          if (!accounts || accounts.length === 0) {
            throw new WalletConnectionError('No accounts found', 'NO_ACCOUNTS');
          }

          address = accounts[0];
          const chainIdHex = await safeEthereumRequest(provider, 'eth_chainId');
          chainId = parseInt(chainIdHex, 16);
          break;
        }

        case WalletType.WALLET_CONNECT:
          // WalletConnect implementation would go here
          throw new WalletConnectionError(
            'WalletConnect not implemented yet', 
            'NOT_IMPLEMENTED'
          );

        case WalletType.COINBASE:
          // Coinbase Wallet implementation would go here
          throw new WalletConnectionError(
            'Coinbase Wallet not implemented yet', 
            'NOT_IMPLEMENTED'
          );

        case WalletType.DFNS:
          // DFNS implementation would go here
          throw new WalletConnectionError(
            'DFNS wallet not implemented yet', 
            'NOT_IMPLEMENTED'
          );

        default:
          throw new WalletConnectionError(`Unsupported wallet type: ${type}`, 'UNSUPPORTED');
      }

      // Update connection state on success
      setConnection({
        type,
        address,
        chainId,
        status: WalletConnectionStatus.CONNECTED
      });

      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${type} wallet`,
      });

      return true;

    } catch (error) {
      let status = WalletConnectionStatus.ERROR;
      let errorMessage = 'Unknown error occurred';

      if (error instanceof WalletConnectionError) {
        errorMessage = error.message;
        if (error.code === 'USER_REJECTED') {
          status = WalletConnectionStatus.USER_REJECTED;
          // Don't show error toast for user rejection - it's normal
          console.log('User rejected wallet connection - this is expected behavior');
        } else {
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: errorMessage,
          });
        }
      } else {
        console.error('Wallet connection error:', error);
        toast({
          variant: "destructive",
          title: "Connection Failed", 
          description: "An unexpected error occurred while connecting your wallet.",
        });
      }

      setConnection(prev => ({
        ...prev,
        status,
        lastError: errorMessage
      }));

      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [safeEthereumRequest, toast]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(async (): Promise<void> => {
    setConnection({
      type: WalletType.METAMASK,
      address: null,
      chainId: null,
      status: WalletConnectionStatus.DISCONNECTED
    });

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  }, [toast]);

  /**
   * Switch to different network
   */
  const switchNetwork = useCallback(async (chainId: number): Promise<boolean> => {
    if (connection.status !== WalletConnectionStatus.CONNECTED) {
      toast({
        variant: "destructive",
        title: "Not Connected",
        description: "Please connect your wallet first",
      });
      return false;
    }

    try {
      const provider = getEthereumProvider();
      if (!provider) return false;

      const chainIdHex = `0x${chainId.toString(16)}`;
      await safeEthereumRequest(provider, 'wallet_switchEthereumChain', [
        { chainId: chainIdHex }
      ]);

      setConnection(prev => ({ ...prev, chainId }));
      return true;
    } catch (error) {
      console.error('Network switch error:', error);
      toast({
        variant: "destructive",
        title: "Network Switch Failed",
        description: "Failed to switch to the requested network",
      });
      return false;
    }
  }, [connection.status, safeEthereumRequest, toast]);

  return {
    connection,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    isConnecting,
    hasError: connection.status === WalletConnectionStatus.ERROR,
    errorMessage: connection.lastError
  };
}

/**
 * Custom error class for wallet connection issues
 */
export class WalletConnectionError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'WalletConnectionError';
  }
}

export default useEnhancedWalletManager;
